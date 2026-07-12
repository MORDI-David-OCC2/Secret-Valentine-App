// netlify/functions/utils/auth.js
const crypto = require("crypto");

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function getClientIp(event) {
  const xf = event.headers?.["x-forwarded-for"] || event.headers?.["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers?.["client-ip"] || event.headers?.["x-real-ip"] || "unknown";
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * Returns true if the session is valid and not expired.
 * Single canonical implementation — used everywhere.
 */
async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken || !inboxId) return false;
  const ref = db
    .collection("inboxes")
    .doc(inboxId)
    .collection("sessions")
    .doc(sha256Hex(sessionToken));
  const snap = await ref.get();
  if (!snap.exists) return false;
  const d = snap.data() || {};
  if (!d.expiresAt?.toDate) return false;
  return d.expiresAt.toDate() > new Date();
}

/**
 * Deletes all session documents for an inbox (call after PIN change).
 */
async function revokeAllSessions(db, inboxId) {
  const snap = await db
    .collection("inboxes").doc(inboxId).collection("sessions").get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

module.exports = { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions };