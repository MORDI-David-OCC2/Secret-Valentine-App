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

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      }, body: "" };
    }

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    const ip = getClientIp(event);
    const rl = await rateLimit(db, {
      action: "verifyPin",
      key: ip,
      limit: 15,
      windowSec: 60,
    });
    if (!rl.allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body" }); }

    const inboxId = String(payload.inboxId || "").trim();
    const pin = String(payload.pin || "").trim();
    const mode = String(payload.mode || "verify").trim();

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!/^\d{4,8}$/.test(pin)) return jsonResponse(400, { ok: false, error: "PIN must be 4–8 digits" });
    if (mode !== "verify") return jsonResponse(400, { ok: false, error: "Invalid mode" });

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const snap = await inboxRef.get();
    if (!snap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = snap.data() || {};
    if (!d.pinHash || !d.pinSalt || !d.pinIter) {
      return jsonResponse(200, { ok: true, verified: true, pinRequired: false, sessionToken: null });
    }

    const computed = pbkdf2Hash(pin, d.pinSalt, d.pinIter);
    const ok = timingSafeEqualHex(computed, d.pinHash);
    if (!ok) return jsonResponse(401, { ok: false, error: "Incorrect PIN", pinRequired: true });

    // Create unlock session token
    const sessionToken = randomTokenBase64Url(32);
    const sessionHash = sha256Hex(sessionToken);

    const expiresDays = 7;
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
    );

    await db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    return jsonResponse(200, { ok: true, verified: true, pinRequired: true, sessionToken });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};