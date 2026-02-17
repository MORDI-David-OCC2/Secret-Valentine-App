// netlify/functions/unlockInboxWithPin.js
const admin = require("firebase-admin");
const crypto = require("crypto");

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
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}
function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
function pbkdf2Hash(pin, saltHex, iterations) {
  const salt = Buffer.from(saltHex, "hex");
  const dk = crypto.pbkdf2Sync(String(pin), salt, iterations, 32, "sha256");
  return dk.toString("hex");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: jsonResponse(204, {}).headers, body: "" };
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    const { inboxId, pin } = JSON.parse(event.body || "{}");
    const id = String(inboxId || "").trim();
    const pinStr = String(pin || "").trim();

    if (!id.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!/^\d{6}$/.test(pinStr)) return jsonResponse(400, { ok: false, error: "Invalid PIN" });

    const inboxRef = db.collection("inboxes").doc(id);
    const snap = await inboxRef.get();
    if (!snap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const inbox = snap.data() || {};
    if (!inbox.passHash || !inbox.passSalt || !inbox.passIter) {
      return jsonResponse(400, { ok: false, error: "PIN not set" });
    }

    const computed = pbkdf2Hash(pinStr, inbox.passSalt, inbox.passIter);
    if (computed !== inbox.passHash) {
      return jsonResponse(401, { ok: false, error: "Wrong PIN" });
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
