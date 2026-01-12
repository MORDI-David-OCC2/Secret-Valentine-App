const admin = require("firebase-admin");
const crypto = require("crypto");

// If you want to use Resend SDK, uncomment the next 2 lines and run: npm i resend
// const { Resend } = require("resend");
// const resend = new Resend(process.env.RESEND_API_KEY);

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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function mustBeOneOf(val, allowed) {
  return allowed.includes(val);
}

function initAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return event.headers["client-ip"] || "unknown";
}

function buildBaseUrl(event) {
  // Prefer explicit config; fallback to request host
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;

  const proto = event.headers["x-forwarded-proto"] || "https";
  let host = event.headers["x-forwarded-host"] || event.headers.host || "";

  // Fix the weird case you saw: "xxx.netlify" -> "xxx.netlify.app"
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host = host + ".app";

  return `${proto}://${host}`;
}

// --- Resend sender (secure server-side) ---
// Version A (no dependency): use fetch directly (works on Netlify Node 18)
async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.API_EMAIL_KEY;
  const from = process.env.EMAIL_VALENTINE;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var");
  if (!from) throw new Error("Missing EMAIL_FROM env var");

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

// Version B (SDK): if you installed `resend`, you can use this instead:
// async function sendWithResend({ to, subject, html }) {
//   const from = process.env.EMAIL_FROM;
//   if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY env var");
//   if (!from) throw new Error("Missing EMAIL_FROM env var");
//   const result = await resend.emails.send({ from, to, subject, html });
//   return result;
// }

function subjectForType(type) {
  if (type === "love") return "💘 Someone sent you a Secret Valentine message";
  if (type === "friendship") return "🫶 You got a Secret Valentine friendship message";
  if (type === "family") return "👨‍👩‍👧‍👦 You got a Secret Valentine family message";
  if (type === "crush") return "😳 Someone sent you a Secret Valentine message";
  return "💌 You received a Secret Valentine message";
}

function emailHtml({ fromName, type, link }) {
  const label =
    type === "love" ? "💘 Love" :
    type === "friendship" ? "🫶 Friendship" :
    type === "family" ? "👨‍👩‍👧‍👦 Family" :
    "😳 Crush";

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px 0;">${label} message</h2>
    <p style="margin:0 0 10px 0;"><strong>${escapeHtml(fromName)}</strong> sent you a Secret Valentine message.</p>
    <p style="margin:0 0 14px 0;">Open your inbox with this link:</p>
    <p style="margin:0 0 18px 0;">
      <a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;background:#ff4d6d;color:#fff;">
        Open my inbox
      </a>
    </p>
    <p style="margin:0 0 6px 0;color:#666;font-size:12px;">Or copy/paste:</p>
    <p style="margin:0;color:#666;font-size:12px;word-break:break-all;">${link}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:18px 0;" />
    <p style="margin:0;color:#888;font-size:12px;">
      If you didn’t expect this email, you can ignore it.
    </p>
  </div>`;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    }, body: "" };

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    initAdmin();
    const db = admin.firestore();

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body" }); }

    const toEmail = normalizeEmail(payload.toEmail);
    const fromName = String(payload.fromName || "Someone").trim().slice(0, 40);
    const type = String(payload.type || "love").trim();
    const stickerId = String(payload.stickerId || "heart_01").trim();
    const body = String(payload.body || "").trim();

    if (!toEmail || !toEmail.includes("@")) {
      return jsonResponse(400, { ok: false, error: "Invalid toEmail" });
    }
    if (!body || body.length < 1 || body.length > 500) {
      return jsonResponse(400, { ok: false, error: "Message body must be 1..500 chars" });
    }

    const allowedTypes = ["love", "friendship", "family", "crush"];
    if (!mustBeOneOf(type, allowedTypes)) {
      return jsonResponse(400, { ok: false, error: "Invalid type" });
    }

    // 1) emailHash -> inboxId (create if missing)
    const emailHash = sha256Hex(toEmail);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);
    const emailIndexSnap = await emailIndexRef.get();

    let inboxId;
    if (emailIndexSnap.exists) {
      inboxId = emailIndexSnap.data().inboxId;
    } else {
      inboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
      const inboxRef = db.collection("inboxes").doc(inboxId);

      const batch = db.batch();
      batch.set(inboxRef, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        pinHash: null,
        pinSetAt: null,
      });
      batch.set(emailIndexRef, {
        inboxId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();
    }

    // 2) Store message under inbox
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc();
    await msgRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      fromName,
      type,
      stickerId,
      body, // Later: ciphertext + iv
      unread: true,
    });

    // 3) Create token (store only hash)
    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);

    // For security, consider shorter expiry than 30 days (e.g. 1–7 days).
    const expiresDays = 7;
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
    );

    await db.collection("tokens").doc(tokenHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      purpose: "open",
      ipHash: sha256Hex(getClientIp(event)),
      messageId: msgRef.id,
    });

    // 4) Build link
    const baseUrl = buildBaseUrl(event);
    const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

    // 5) Send email (server-side)
    const subject = subjectForType(type);
    const html = emailHtml({ fromName, type, link });

    await sendWithResend({ to: toEmail, subject, html });

    // 6) Return minimal info (don’t leak link in production)
    const devReturnLink = process.env.RETURN_LINK === "1";
    return jsonResponse(200, {
      ok: true,
      inboxId,
      messageId: msgRef.id,
      emailed: true,
      ...(devReturnLink ? { link } : {}),
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};
