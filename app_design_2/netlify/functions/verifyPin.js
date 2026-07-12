// netlify/functions/verifyPin.js
const { getDb, admin } = require("./utils/admin");
const { rateLimit } = require("./rateLimit");
const { ensureInboxCrypto, storeInboxKeyInSession, getInboxKeyViaRecovery } = require("./cryptageInbox");
const { PIN_REGEX, PIN_LABEL } = require('./utils/pinPolicy');
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");
const { pbkdf2Hash, timingSafeEqualHex } = require("./utils/pinCrypto");

async function resolveInboxIdFromToken(db, token) {
  const tokenHash = sha256Hex(token);
  const tokenRef = db.collection("tokens").doc(tokenHash);
  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) return null;

  const tokenData = tokenSnap.data() || {};
  const inboxId = String(tokenData.inboxId || "").trim();
  if (!inboxId.startsWith("inbox_")) return null;

  // Optionnel: vérifier expiration si présente
  const expiresAt = tokenData.expiresAt;
  if (expiresAt && typeof expiresAt.toDate === "function") {
    if (expiresAt.toDate().getTime() < Date.now()) return null;
  }

  return inboxId;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    const db = getDb();

    const ip = getClientIp(event);
    const rl = await rateLimit(db, { action: "verifyPin", key: ip, limit: 15, windowSec: 60 });
    if (!rl.allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    // ✅ accepte plusieurs clés côté client (au cas où)
    let inboxId =
      String(payload.inboxId || payload.inbox_id || payload?.session?.inboxId || "").trim();

    const token = String(payload.token || "").trim(); // ✅ NEW: allow passing link token
    const pin = String(payload.pin || "").trim();
    const mode = String(payload.mode || "verify").trim();

    if (mode !== "verify") return jsonResponse(400, { ok: false, error: "Invalid mode" });
    if (!PIN_REGEX.test(pin)) return jsonResponse(400, { ok: false, error: PIN_LABEL });

    // ✅ if inboxId missing, try resolving from token
    if (!inboxId && token) {
      const resolved = await resolveInboxIdFromToken(db, token);
      if (resolved) inboxId = resolved;
    }

    // ✅ clearer error when missing
    if (!inboxId) {
      return jsonResponse(400, { ok: false, error: "Missing inboxId (or token)" });
    }

    if (!inboxId.startsWith("inbox_")) {
      return jsonResponse(400, { ok: false, error: "Invalid inboxId format" });
    }

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const snap = await inboxRef.get();
    if (!snap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = snap.data() || {};

    // If no Password configured => treat as already unlocked (rare, but safe)
    if (!d.passHash || !d.passSalt || !d.passIter) {
      // Create a session anyway so the client can proceed normally
      const sessionToken = randomTokenBase64Url(32);
      const sessionHash = sha256Hex(sessionToken);
      const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      await inboxRef.collection("sessions").doc(sessionHash).set({
        inboxId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        purpose: "unlocked_no_pin",
      });

      await ensureInboxCrypto(db, inboxId);
      const inboxKey = await getInboxKeyViaRecovery(db, inboxId);
      await storeInboxKeyInSession(db, inboxId, sessionToken, inboxKey);

      return jsonResponse(200, { ok: true, verified: true, pinRequired: false, inboxId, sessionToken });
    }

    const computed = pbkdf2Hash(pin, d.passSalt, d.passIter);
    const ok = timingSafeEqualHex(computed, d.passHash);
    if (!ok) return jsonResponse(401, { ok: false, error: "Incorrect Password", pinRequired: true });

    // Create unlock session token
    const sessionToken = randomTokenBase64Url(32);
    const sessionHash = sha256Hex(sessionToken);

    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    await inboxRef.collection("sessions").doc(sessionHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      purpose: "unlock",
    });

    // --- Encryption bootstrap + attach inboxKeyEnc to session ---
    await ensureInboxCrypto(db, inboxId);
    const inboxKey = await getInboxKeyViaRecovery(db, inboxId);
    await storeInboxKeyInSession(db, inboxId, sessionToken, inboxKey);

    return jsonResponse(200, { ok: true, verified: true, pinRequired: true, inboxId, sessionToken });
  } catch (err) {
    console.error(err);
    const status = err?.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(status, { ok: false, error: err.message || "Server error" });
  }
};