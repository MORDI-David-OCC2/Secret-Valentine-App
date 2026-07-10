// netlify/functions/unlockInboxWithPin.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { PIN_REGEX, PIN_LABEL } = require('./utils/pinPolicy');

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
       "access-control-allow-origin": CORS_ORIGIN,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(body),
  };
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
}

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}
function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
function pbkdf2Hash(password, saltHex, iterations) {
  const salt = Buffer.from(saltHex, "hex");
  const dk = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256");
  return dk.toString("hex");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: jsonResponse(204, {}).headers, body: "" };
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const { allowed } = await rateLimit(db, { action: "unlockInboxWithPin", key: getClientIp(event), limit: 10, windowSec: 60 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many attempts" });
    const { inboxId, pin } = payload;
    const id = String(inboxId || "").trim();
    const pinStr = String(pin || "").trim();

    if (!id.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!PIN_REGEX.test(pinStr)) return jsonResponse(400, { ok: false, error: PIN_LABEL });
    const inboxRef = db.collection("inboxes").doc(id);
    const snap = await inboxRef.get();
    if (!snap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const inbox = snap.data() || {};
    if (!inbox.passHash || !inbox.passSalt || !inbox.passIter) {
      return jsonResponse(400, { ok: false, error: "Password not set" });
    }

    const computed = pbkdf2Hash(pinStr, inbox.passSalt, inbox.passIter);
    const a = Buffer.from(computed,      'hex');
    const b = Buffer.from(inbox.passHash,'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return jsonResponse(401, { ok: false, error: "Wrong Password" });
    }

    // create session
    const sessionToken = randomTokenBase64Url(32);
    const sessionHash = sha256Hex(sessionToken);

    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    await inboxRef.collection("sessions").doc(sessionHash).set({
      inboxId: id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    return jsonResponse(200, { ok: true, sessionToken });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};
