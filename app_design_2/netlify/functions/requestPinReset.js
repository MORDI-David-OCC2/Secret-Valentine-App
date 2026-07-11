// netlify/functions/requestPinReset.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { rateLimit } = require("./rateLimit");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function buildBaseUrl(event) {
  const env = process.env.URL_DE_BASE;
  if (env) return String(env).replace(/\/+$/, "");
  const baseUrl = process.env.URL_DE_BASE;
  if (!baseUrl) throw new Error('URL_DE_BASE env var is not set');
}

async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.API_EMAIL_KEY;
  const from = process.env.EMAIL_VALENTINE;

  if (!apiKey) throw new Error("Missing API_EMAIL_KEY env var");
  if (!from) throw new Error("Missing EMAIL_VALENTINE env var");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${JSON.stringify(data)}`);
  return data;
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

    initAdmin();
    const db = getDb();
    const ip = (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
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

    const baseUrl = buildBaseUrl(event);
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