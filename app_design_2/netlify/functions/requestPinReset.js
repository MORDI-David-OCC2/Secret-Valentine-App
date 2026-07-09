// netlify/functions/requestPinReset.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { CORS_ORIGIN } = require('./utils/pinPolicy');

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
       "access-control-allow-origin": CORS_ORIGIN,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(body),
  };
}

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
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
  const allowed = await rateLimit(event, { max: 3, windowMs: 300_000 }); // 3 per 5min
  if (!allowed) return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) };
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
           "access-control-allow-origin": CORS_ORIGIN,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    initAdmin();
    const db = admin.firestore();

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

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
      subject: "🔐 Reset your inbox PIN",
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
          <h2>Reset your inbox PIN 🔐</h2>
          <p>This link is valid for 24 hours.</p>
          <p><a href="${link}">Reset my PIN</a></p>
        </div>
      `,
    });

    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};