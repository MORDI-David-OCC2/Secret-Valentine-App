// netlify/functions/cryptoWrap.js
const crypto = require("crypto");

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}
function unb64(s) {
  return Buffer.from(String(s || ""), "base64");
}

function seal(key32, plaintextBuf) {
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv("aes-256-gcm", key32, iv);
  const ct = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { alg: "aes-256-gcm", iv: b64(iv), ct: b64(ct), tag: b64(tag) };
}

function open(key32, wrapped) {
  if (!wrapped || wrapped.alg !== "aes-256-gcm") throw new Error("Bad wrapped object");
  const iv = unb64(wrapped.iv);
  const ct = unb64(wrapped.ct);
  const tag = unb64(wrapped.tag);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key32, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

module.exports = { seal, open };
