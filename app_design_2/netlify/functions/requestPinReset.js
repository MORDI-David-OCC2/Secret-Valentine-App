const admin = require("firebase-admin");
const crypto = require("crypto");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
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
function isValidEmail(email) {
  return email.includes("@") && email.includes(".");
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

function resetEmailHtml(link) {
  const safe = String(link).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html><html><body style="font-family:Arial;background:#fff5f8;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:22px;border:1px solid #f0c3d4">
    <h2 style="margin:0 0 10px;color:#7a1a45;">Reset your inbox PIN 🔐</h2>
    <p style="margin:0 0 16px;color:#5a2d42;">Click below to set a new PIN for your inbox.</p>
    <p><a href="${safe}" style="display:inline-block;background:#7a1a45;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;">Reset my PIN</a></p>
    <p style="margin-top:16px;color:#9e6b80;font-size:12px;">Link valid for 30 minutes.</p>
  </div></body></html>`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
        body: "",
      };
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const email = normalizeEmail(payload.email);
    if (!email || !isValidEmail(email)) return jsonResponse(400, { ok: false, error: "Invalid email" });

    const emailHash = sha256Hex(email);
    const emailIndexSnap = await db.collection("emailIndex").doc(emailHash).get();
    if (!emailIndexSnap.exists) return jsonResponse(404, { ok: false, error: "No inbox for this email" });

    const inboxId = (emailIndexSnap.data() || {}).inboxId;
    if (!inboxId) return jsonResponse(404, { ok: false, error: "No inbox for this email" });

    // Token court (30 min) pour reset PIN
    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);

    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000));

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
      subject: "🔐 Reset your Secret Valentine PIN",
      html: resetEmailHtml(link),
    });

    return jsonResponse(200, { ok: true, action: "RESET_SENT" });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};