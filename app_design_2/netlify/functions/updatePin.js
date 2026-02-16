// netlify/functions/updatePin.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(body),
  };
}

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
}

// ✅ You can keep "6 characters" but allow alphanumeric
function validatePin6(v) {
  return typeof v === "string" && /^[A-Za-z0-9]{6}$/.test(v);
}

function hashPin(pin, saltBuf, iter) {
  // pbkdf2 -> sha256
  return crypto.pbkdf2Sync(pin, saltBuf, iter, 32, "sha256"); // 32 bytes
}

async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) {
    const err = new Error("Missing sessionToken");
    err.code = 401;
    throw err;
  }
  const sessionSnap = await db
    .collection("inboxes")
    .doc(inboxId)
    .collection("sessions")
    .doc(sha256Hex(sessionToken))
    .get();

  if (!sessionSnap.exists) {
    const err = new Error("Invalid session");
    err.code = 401;
    throw err;
  }

  const s = sessionSnap.data() || {};
  if (s.expiresAt?.toMillis && s.expiresAt.toMillis() < Date.now()) {
    const err = new Error("Session expired");
    err.code = 401;
    throw err;
  }

  return true;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
        body: "",
      };
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, { action: "updatePin", key: ip, limit: 30, windowSec: 60 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many requests" });

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const inboxId = String(payload.inboxId || "").trim();
    const sessionToken = String(payload.sessionToken || "").trim();
    const action = String(payload.action || "").trim(); // "create" | "change" | "remove"
    const currentPin = payload.currentPin != null ? String(payload.currentPin) : "";
    const newPin = payload.newPin != null ? String(payload.newPin) : "";

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!["create", "change", "remove"].includes(action))
      return jsonResponse(400, { ok: false, error: "Invalid action" });

    await requireValidSession(db, inboxId, sessionToken);

    const inboxRef = db.collection("inboxes").doc(inboxId);

    // Load current state
    const snap = await inboxRef.get();
    if (!snap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = snap.data() || {};
    const hasPin = !!(d.passHash && d.passSalt && d.passIter);

    // For change/remove, verify current pin against stored hash
    if ((action === "change" || action === "remove") && hasPin) {
      if (!validatePin6(currentPin)) return jsonResponse(400, { ok: false, error: "Invalid current password format" });

      const saltBuf = Buffer.from(String(d.passSalt), "base64");
      const iter = Number(d.passIter) || 0;
      const storedHash = Buffer.from(String(d.passHash), "base64");
      if (!saltBuf.length || iter <= 0 || storedHash.length !== 32) {
        return jsonResponse(500, { ok: false, error: "PIN data corrupted" });
      }

      const testHash = hashPin(currentPin, saltBuf, iter);
      const ok = crypto.timingSafeEqual(storedHash, testHash);
      if (!ok) return jsonResponse(403, { ok: false, error: "Wrong password" });
    } else if (action === "change" || action === "remove") {
      // change/remove requested but no PIN in DB
      return jsonResponse(400, { ok: false, error: "No password set" });
    }

    if (action === "remove") {
      await inboxRef.set(
        {
          passHashHash: admin.firestore.FieldValue.delete(),
          passSalt: admin.firestore.FieldValue.delete(),
          passIter: admin.firestore.FieldValue.delete(),
          passUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return jsonResponse(200, { ok: true, pinRequired: false });
    }

    // create/change: validate new pin
    if (!validatePin6(newPin)) return jsonResponse(400, { ok: false, error: "Password must be 6 alphanumeric chars" });

    const salt = crypto.randomBytes(16);
    const iter = 120000;
    const h = hashPin(newPin, salt, iter);

    await inboxRef.set(
      {
        passHash: h.toString("base64"),
        passSalt: salt.toString("base64"),
        passIter: iter,
        passUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return jsonResponse(200, { ok: true, pinRequired: true });
  } catch (err) {
    console.error(err);
    const status = err.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(status, { ok: false, error: err.message || "Server error" });
  }
};
