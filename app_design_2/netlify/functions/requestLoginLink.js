// netlify/functions/requestLoginLink.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { rateLimit } = require("./rateLimit");
const { getClientIp } = require("./utils/auth");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function buildBaseUrl(event) {
  const env = process.env.URL_DE_BASE;
  if (env) return String(env).replace(/\/+$/, "");
  const proto = event.headers["x-forwarded-proto"] || "https";
  let host = event.headers["x-forwarded-host"] || event.headers.host || "";
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host = host + ".app";
  return `${proto}://${host}`.replace(/\/+$/, "");
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
  return snap.data()?.inboxId || null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = getDb();
    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, {
      action: "requestLoginLink", key: ip, limit: 5, windowSec: 300,
    });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    const email = normalizeEmail(payload.email);
    if (!email || !email.includes("@") || !email.includes(".")) {
      return jsonResponse(400, { ok: false, error: "Invalid email" });
    }

    const inboxId = await getInboxIdByEmail(db, email);
    if (!inboxId) return jsonResponse(200, { ok: true, action: "LINK_SENT" });

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) {
      // This is exactly the "inbox id not found" symptom: index is stale.
      return jsonResponse(200, { ok: true, action: "LINK_SENT" });
    }

    const inbox = inboxSnap.data() || {};
    const hasPin = !!(inbox.passHash && inbox.passSalt && inbox.passIter);

    // ✅ If Password exists => do NOT send a link; UI should ask for Password
    if (hasPin) {
      return jsonResponse(200, { ok: true, action: "PIN_REQUIRED", inboxId });
    }

    // ✅ Otherwise send link (no password yet)
    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);
    const expiresDays = 7;
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
    );

    await db.collection("tokens").doc(tokenHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      purpose: "open",
    });

    const baseUrl = buildBaseUrl(event);
    const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

    await sendWithResend({
      to: email,
      subject: "💌 Your private inbox link",
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
          <h2>Your inbox link 💌</h2>
          <p>This link is valid for 7 days.</p>
          <p><a href="${link}">Open my inbox</a></p>
        </div>
      `,
    });

    return jsonResponse(200, { ok: true, action: "LINK_SENT" });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};