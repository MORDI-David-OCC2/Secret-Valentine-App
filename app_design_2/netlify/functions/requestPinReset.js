// netlify/functions/requestPinReset.js
const { getDb, admin } = require("./utils/admin");
const { rateLimit } = require("./rateLimit");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url } = require("./utils/auth");
const { sendWithResend } = require("./utils/email");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function buildBaseUrl() {
  const base = process.env.URL_DE_BASE;
  if (!base) throw new Error("URL_DE_BASE env var is required for password reset emails");
  return String(base).replace(/\/+$/, "");
}

async function getInboxIdByEmail(db, email) {
  const emailHash = sha256Hex(email);
  const snap = await db.collection("emailIndex").doc(emailHash).get();
  if (!snap.exists) return null;
  return snap.data().inboxId;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    const db = getDb();
    const { allowed } = await rateLimit(db, { action: "requestPinReset", key: getClientIp(event), limit: 3, windowSec: 300 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many requests" });
    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    const email = normalizeEmail(payload.email);
    if (!email || !email.includes("@")) {
      return jsonResponse(400, { ok: false, error: "Invalid email" });
    }

    const inboxId = await getInboxIdByEmail(db, email);
    if (!inboxId) {
      return { statusCode: 200, body: JSON.stringify({ message: 'If this email is registered, a reset link was sent.' }) };
    }

    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);

    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    );

    await db.collection("tokens").doc(tokenHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      purpose: "pin_reset",
    });

    const baseUrl = buildBaseUrl();
    const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

    await sendWithResend({
      to: email,
      subject: "🔐 Reset your inbox Password",
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
          <h2>Reset your inbox Password 🔐</h2>
          <p>This link is valid for 24 hours.</p>
          <p><a href="${link}">Reset my password</a></p>
        </div>
      `,
    });

    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};