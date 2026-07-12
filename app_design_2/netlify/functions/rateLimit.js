const { admin } = require("./utils/admin");
const { sha256Hex } = require("./utils/auth");


/**
 * Rate limit helper.
 * @param {import("firebase-admin").firestore.Firestore} db
 * @param {object} opts
 * @param {string} opts.action - e.g. "openLink", "sendMessage", "verifyPin"
 * @param {string} opts.key - e.g. ip, or ip+inboxId
 * @param {number} opts.limit - max allowed hits within windowSec
 * @param {number} opts.windowSec - time window in seconds
 * @returns {Promise<{allowed:boolean, remaining:number, resetAt:Date}>}
 */
async function rateLimit(db, { action, key, limit, windowSec }) {
  const now = Date.now();
  const resetAtMs = now - (now % (windowSec * 1000)) + (windowSec * 1000); // end of window
  const windowId = Math.floor(now / (windowSec * 1000)); // current window bucket

  const docId = sha256Hex(`${action}:${key}:${windowId}`);
  const ref = db.collection("rateLimits").doc(docId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    let count = 0;
    if (snap.exists) {
      count = snap.data().count || 0;
    }

    count += 1;

    // Use TTL (optional): add expiresAt if you enable TTL in Firestore later
    tx.set(ref, {
      action,
      keyHash: sha256Hex(key),
      windowId,
      count,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(resetAtMs + 60_000)), // a bit after window
    }, { merge: true });

    const allowed = count <= limit;
    return { allowed, remaining: Math.max(0, limit - count), resetAt: new Date(resetAtMs) };
  });

  return result;
}

module.exports = { rateLimit };
