// netlify/functions/unlockInboxWithPin.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { PIN_REGEX, PIN_LABEL } = require('./utils/pinPolicy');
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");
const { pbkdf2Hash, timingSafeEqualHex } = require("./utils/pinCrypto");
const { getClientIp } = require("./utils/auth");

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: jsonResponse(204, {}).headers, body: "" };
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = getDb();

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

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
