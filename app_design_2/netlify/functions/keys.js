// netlify/functions/cryptoKeys.js
const crypto = require("crypto");

function sha256(bufOrStr) {
  return crypto.createHash("sha256").update(bufOrStr).digest();
}

function pbkdf2Key(password, saltB64) {
  const pepper = process.env.PIN_PEPPER || "";
  if (!pepper) throw new Error("Missing PIN_PEPPER env var");

  const salt = Buffer.from(saltB64, "base64");
  // Choose sane iterations (fast enough for server, still strong)
  const iterations = 150_000;
  return crypto.pbkdf2Sync(String(password) + pepper, salt, iterations, 32, "sha256");
}

function recoveryKey() {
  const b64 = process.env.RECOVERY_KEY_B64;
  if (!b64) throw new Error("Missing RECOVERY_KEY_B64 env var");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("RECOVERY_KEY_B64 must be 32 bytes base64");
  return k;
}

function sessionKey(sessionToken) {
  return sha256(String(sessionToken || ""));
}

function randomKey32() {
  return crypto.randomBytes(32);
}

function randomSaltB64() {
  return crypto.randomBytes(16).toString("base64");
}

module.exports = { pbkdf2Key, recoveryKey, sessionKey, randomKey32, randomSaltB64 };
