// netlify/functions/utils/pinCrypto.js
const crypto = require("crypto");

/**
 * Hash a password/PIN with PBKDF2-SHA256.
 * saltHex: hex-encoded random salt (use crypto.randomBytes(16).toString('hex') to generate)
 */
function pbkdf2Hash(password, saltHex, iterations = 150_000) {
  if (!saltHex) throw new Error("pbkdf2Hash: saltHex is required");
  const salt = Buffer.from(String(saltHex), "hex");
  return crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256").toString("hex");
}

/**
 * Timing-safe comparison of two hex strings.
 * Returns false (not throws) if lengths differ.
 */
function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(String(a || ""), "hex");
    const bb = Buffer.from(String(b || ""), "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

module.exports = { pbkdf2Hash, timingSafeEqualHex };