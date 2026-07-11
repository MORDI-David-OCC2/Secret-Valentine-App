// netlify/functions/updatePin.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { PIN_REGEX, PIN_LABEL } = require('./utils/pinPolicy');
const { revokeAllSessions } = require("./utils/auth");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");
const { pbkdf2Hash, timingSafeEqualHex } = require("./utils/pinCrypto");


// ✅ You must have 6 digits


function hashPin(password, saltBuf, iter) {
  // pbkdf2 -> sha256
  return crypto.pbkdf2Sync(password, saltBuf, iter, 32, "sha256"); // 32 bytes
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = getDb();

    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, { action: "updatePin", key: ip, limit: 30, windowSec: 60 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many requests" });

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

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

    // For change/remove, verify current password against stored hash
    if ((action === "change" || action === "remove") && hasPin) {
      if (!PIN_REGEX.test(currentPin)) return jsonResponse(400, { ok: false, error: PIN_LABEL });

      const saltHex = String(d.passSalt || "");
const hashHex = String(d.passHash || "");
const iter = Number(d.passIter) || 0;

if (!/^[0-9a-f]{20,32}$/i.test(saltHex) || !/^[0-9a-f]{64}$/i.test(hashHex) || iter <= 0) {
  return jsonResponse(500, { ok: false, error: "Password data corrupted" });
}

const saltBuf = Buffer.from(saltHex, "hex");      // 16 bytes
const storedHash = Buffer.from(hashHex, "hex");   // 32 bytes

      if (!saltBuf.length || iter <= 0 || storedHash.length !== 32) {
        return jsonResponse(500, { ok: false, error: "Password data corrupted" });
      }

      const testHash = hashPin(currentPin, saltBuf, iter);
      const ok = crypto.timingSafeEqual(storedHash, testHash);
      if (!ok) return jsonResponse(403, { ok: false, error: "Wrong password" });
    } else if (action === "change" || action === "remove") {
      // change/remove requested but no Password in DB
      return jsonResponse(400, { ok: false, error: "No password set" });
    }

    if (action === "remove") {
      await inboxRef.set(
        {
          passHash: admin.firestore.FieldValue.delete(),
          passSalt: admin.firestore.FieldValue.delete(),
          passIter: admin.firestore.FieldValue.delete(),
          passUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await revokeAllSessions(db, inboxId);
      return jsonResponse(200, { ok: true, pinRequired: false });
    }

    // create/change: validate new password
    if (!PIN_REGEX.test(newPin)) return jsonResponse(400, { ok: false, error: PIN_LABEL });

    const salt = crypto.randomBytes(16);
    const iter = 150000;
    const h = hashPin(newPin, salt, iter);

    await inboxRef.set(
      {
        passHash: h.toString("hex"),
        passSalt: salt.toString("hex"),
        passIter: iter,
        passUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await revokeAllSessions(db, inboxId);
    return jsonResponse(200, { ok: true, pinRequired: true });
  } catch (err) {
    console.error(err);
    const status = err.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(status, { ok: false, error: err.message || "Server error" });
  }
};
