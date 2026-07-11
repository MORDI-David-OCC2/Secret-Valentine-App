// netlify/functions/claimEmail.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { rateLimit } = require("./rateLimit");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    const db = getDb();

    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, { action: "claimEmail", key: ip, limit: 5, windowSec: 300 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    const inboxId = String(payload.inboxId || "").trim();
    const sessionToken = String(payload.sessionToken || "").trim();
    const email = normalizeEmail(payload.email);

    if (!inboxId) return jsonResponse(400, { ok: false, error: "Missing inboxId" });
    if (!sessionToken) return jsonResponse(401, { ok: false, error: "Missing sessionToken" });
    if (!email || !email.includes("@")) return jsonResponse(400, { ok: false, error: "Invalid email" });

    // validate session (unchanged — proves caller owns THIS inbox)
    const sessionHash = sha256Hex(sessionToken);
    const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid session" });

    const session = sessionSnap.data() || {};
    const exp = session.expiresAt;
    if (exp && exp.toDate && exp.toDate() < new Date()) {
      return jsonResponse(401, { ok: false, error: "Session expired" });
    }

    // NOTE: no emailIndex write here anymore. Binding only happens once
    // the recipient clicks the confirmation link (see openLink.js, purpose "claim_email").
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = sha256Hex(token);
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

    await db.collection("tokens").doc(tokenHash).set({
      inboxId, email, purpose: "claim_email",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    const baseUrl = buildBaseUrl(event);
    const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

    await sendWithResend({
      to: email,
      subject: "Confirm this email for your Secret Valentine inbox",
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
          <h2>Confirm your email</h2>
          <p>Someone requested to link this email address to a Secret Valentine inbox.</p>
          <p>If this was you, click below to confirm. This link is valid for 24 hours.</p>
          <p><a href="${link}">Confirm this email</a></p>
          <p style="color:#888;font-size:12px">If you didn't request this, you can ignore this email — nothing will be linked.</p>
        </div>
      `,
    });

    return jsonResponse(200, { ok: true, message: "Confirmation email sent" });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};