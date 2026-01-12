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

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return event.headers["client-ip"] || "unknown";
}

function pbkdf2Hash(pin, saltHex, iterations = 120000) {
  const salt = Buffer.from(saltHex, "hex");
  const dk = crypto.pbkdf2Sync(String(pin), salt, iterations, 32, "sha256");
  return dk.toString("hex");
}

function timingSafeEqualHex(a, b) {
  const ba = Buffer.from(String(a || ""), "hex");
  const bb = Buffer.from(String(b || ""), "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    }, body: "" };

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, {
      action: "verifyPin",
      key: ip,
      limit: 15,
      windowSec: 60,
    });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body" }); }

    const inboxId = String(payload.inboxId || "").trim();
    const pin = String(payload.pin || "").trim();
    const mode = String(payload.mode || "verify").trim(); // "set" or "verify"

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!/^\d{4,8}$/.test(pin)) return jsonResponse(400, { ok: false, error: "PIN must be 4–8 digits" });
    if (!["set", "verify"].includes(mode)) return jsonResponse(400, { ok: false, error: "Invalid mode" });

    const inboxRef = db.collection("inboxes").doc(inboxId);

    if (mode === "set") {
      // Set only if not already set
      const saltHex = crypto.randomBytes(16).toString("hex");
      const iterations = 120000;
      const pinHash = pbkdf2Hash(pin, saltHex, iterations);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(inboxRef);
        if (!snap.exists) throw new Error("Inbox not found");
        const d = snap.data() || {};
        if (d.pinHash) throw new Error("PIN already set");

        tx.set(inboxRef, {
          pinHash,
          pinSalt: saltHex,
          pinIter: iterations,
          pinSetAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      return jsonResponse(200, { ok: true, pinRequired: true });
    }

    // mode === "verify"
    const snap = await inboxRef.get();
    if (!snap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = snap.data() || {};
    if (!d.pinHash || !d.pinSalt || !d.pinIter) {
      // No PIN set -> treat as not required
      return jsonResponse(200, { ok: true, pinRequired: false, verified: true });
    }

    const computed = pbkdf2Hash(pin, d.pinSalt, d.pinIter);
    const ok = timingSafeEqualHex(computed, d.pinHash);

    if (!ok) return jsonResponse(401, { ok: false, error: "Incorrect PIN", pinRequired: true });

    // MVP: return verified true. Later: return short-lived unlock token.
    return jsonResponse(200, { ok: true, pinRequired: true, verified: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};
