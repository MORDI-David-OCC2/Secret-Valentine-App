// netlify/functions/cryptageInbox.js
const crypto = require("crypto");
const { seal, open } = require("./wrap");
const { sessionKey, recoveryKey } = require("./keys");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");


/**
 * Ensure the inbox has an encryption key wrapped by the recovery key.
 * Creates it if missing. Safe to call multiple times.
 */
async function ensureInboxCrypto(db, inboxId) {
  const inboxRef = db.collection("inboxes").doc(inboxId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(inboxRef);
    if (!snap.exists) throw new Error("Inbox not found");

    const d = snap.data() || {};
    if (d.inboxKeyWrappedByRecovery) return;

    const inboxKey = crypto.randomBytes(32);
    const wrapped = seal(recoveryKey(), inboxKey);

    tx.set(
      inboxRef,
      {
        inboxKeyWrappedByRecovery: wrapped,
        cryptoVersion: 1,
      },
      { merge: true }
    );
  });
}

/**
 * Store the (already decrypted) inboxKey inside the session document,
 * encrypted with a key derived from the sessionToken.
 */
async function storeInboxKeyInSession(db, inboxId, sessionToken, inboxKeyBuf) {
  if (!sessionToken) throw new Error("Missing sessionToken");
  if (!inboxKeyBuf || !Buffer.isBuffer(inboxKeyBuf)) throw new Error("Missing inboxKey");

  const sessionHash = sha256Hex(sessionToken);
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);

  const sk = sessionKey(sessionToken);
  const inboxKeyEnc = seal(sk, inboxKeyBuf);

  await sessionRef.set({ inboxKeyEnc }, { merge: true });
}

/**
 * Convenience: read inboxKey via recovery key.
 */
async function getInboxKeyViaRecovery(db, inboxId) {
  const inboxRef = db.collection("inboxes").doc(inboxId);
  const snap = await inboxRef.get();
  if (!snap.exists) throw new Error("Inbox not found");

  const d = snap.data() || {};
  if (!d.inboxKeyWrappedByRecovery) throw new Error("Inbox crypto not initialized");
  return open(recoveryKey(), d.inboxKeyWrappedByRecovery);
}

async function getInboxKeyFromSession(db, inboxId, sessionToken) {
  if (!sessionToken) return null;
  const sessionHash = sha256Hex(sessionToken);
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await sessionRef.get();
  if (!snap.exists) return null;
  const s = snap.data() || {};
  if (!s.inboxKeyEnc) return null;
  return open(sessionKey(sessionToken), s.inboxKeyEnc);
}

module.exports = { ensureInboxCrypto, storeInboxKeyInSession, getInboxKeyViaRecovery, getInboxKeyFromSession }