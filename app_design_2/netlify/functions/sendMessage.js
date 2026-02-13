const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { moderateText } = require("./moderation");
const { seal } = require("./wrap");
const { ensureInboxCrypto, getInboxKeyViaRecovery } = require("./cryptageInbox");

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
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function buildBaseUrl(event) {
  const env = process.env.URL_DE_BASE;
  if (env) return String(env).replace(/\/+$/, "");

  const proto = event.headers["x-forwarded-proto"] || "https";
  let host = event.headers["x-forwarded-host"] || event.headers.host || "";
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host = host + ".app";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
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

function subjectForType(type) {
  // Nom caché -> sujet neutre
  if (type === "love") return "💘 You received a Secret Valentine letter";
  if (type === "friendship") return "🫶 You received a Secret Valentine letter";
  if (type === "family") return "👨‍👩‍👧‍👦 You received a Secret Valentine letter";
  if (type === "crush") return "😳 You received a Secret Valentine letter";
  return "💌 You received a Secret Valentine letter";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailTypeMeta(type) {
  switch (type) {
    case "love":
      return { text: "Love", emoji: "💘" };
    case "friendship":
      return { text: "Friend", emoji: "🫶" };
    case "family":
      return { text: "Family", emoji: "👨‍👩‍👧‍👦" };
    case "crush":
      return { text: "Crush", emoji: "😳" };
    default:
      return { text: "Message", emoji: "💌" };
  }
}

function inferOriginFromLink(link) {
  try {
    const u = new URL(String(link));
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function emailHtml({ type, link, baseUrl }) {
  const safeLink = escapeHtml(link);
  const meta = emailTypeMeta(type);

  const badgeText = `1 new secret ${meta.text.toLowerCase()} letter`;

  // ✅ Image URL publique stable:
  // - idéal: /public/email/envelope.png (sera servi à la racine)
  // - sinon: variable EMAIL_ENVELOPE_URL (CDN)
  const origin =
    String(baseUrl || "").trim().replace(/\/+$/, "") ||
    inferOriginFromLink(link) ||
    "";

  const envelopeImg =
    process.env.EMAIL_ENVELOPE_URL ||
    (origin ? `${origin}/email/envelope.png` : "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You have a secret message 💌</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;1,400&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { margin:0; padding:0; background:#fff5f8; font-family:'Cormorant Garamond', Georgia, 'Times New Roman', serif; }
  a { text-decoration:none; }
  .preheader { display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#fff5f8; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#fff5f8;">

<div class="preheader">A secret letter is waiting for you… 💌 Tap to reveal it.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff5f8; padding:32px 16px;">
<tr><td align="center">

  <table role="presentation" width="100%" style="max-width:560px; border-radius:28px; overflow:hidden; box-shadow:0 20px 60px rgba(180,90,130,.18), 0 0 0 1px rgba(232,160,180,.25);">

    <!-- HEADER -->
    <tr>
      <td style="
        background: linear-gradient(150deg, #f2c4d4 0%, #e8a0b4 35%, #d4789c 70%, #c9667a 100%);
        padding: 44px 32px 36px;
        text-align: center;
        position: relative;
      ">
        <div style="position:relative; z-index:1;">
          <p style="font-size:1.3rem; letter-spacing:10px; margin-bottom:10px; opacity:.9;">🤍 🌸 🤍</p>
          <h1 style="
            font-family: 'Playfair Display', Georgia, serif;
            font-style: italic;
            font-size: 2.4rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: .5px;
            line-height: 1.1;
            text-shadow: 0 3px 16px rgba(150,40,80,.3);
            margin-bottom: 8px;
          ">Secret Valentine</h1>
          <p style="
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-style: italic;
            font-size: 1rem;
            color: rgba(255,255,255,.85);
            letter-spacing: .3px;
          ">Reveal your heart, keep your mystery.</p>
        </div>

        <div style="position:absolute; bottom:-1px; left:0; right:0; line-height:0;">
          <svg viewBox="0 0 560 28" fill="none" preserveAspectRatio="none" style="display:block;width:100%;height:28px;">
            <path d="M0 28 Q70 0 140 14 Q210 28 280 14 Q350 0 420 14 Q490 28 560 14 L560 28 Z" fill="#fce8ef"/>
          </svg>
        </div>
      </td>
    </tr>

    <!-- MAIN -->
    <tr>
      <td style="background-color:#fce8ef; padding:36px 36px 28px;">

        <!-- ENVELOPE IMAGE (PNG) with purple background -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:22px;">
              <div style="
                display:inline-block;
                background: linear-gradient(135deg,#9b2d5a,#7a1a45);
                border-radius:20px;
                padding:16px 20px;
                box-shadow:0 10px 36px rgba(155,45,90,.35);
                border:1px solid rgba(255,255,255,0.25);
              ">
                ${
                  envelopeImg
                    ? `<img src="${escapeHtml(envelopeImg)}" width="220" alt="Envelope"
                        style="display:block; width:220px; max-width:80%; height:auto; border:0; outline:none; text-decoration:none;" />`
                    : `<div style="width:220px; max-width:80%; padding:22px 14px; text-align:center; color:rgba(255,255,255,.85); font-family:Georgia,serif; font-style:italic;">
                         💌
                       </div>`
                }
              </div>
              <div style="font-size:12px; color:#b88a9a; font-style:italic; margin-top:8px;">
                (If images are disabled, enable them to see the envelope.)
              </div>
            </td>
          </tr>
        </table>

        <!-- Badge -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td align="center">
              <span style="
                display:inline-block;
                background:linear-gradient(135deg,#e8a0b4,#c9667a);
                color:#fff;
                font-family:'Playfair Display',Georgia,serif;
                font-style:italic;
                font-size:.78rem;
                padding:5px 18px;
                border-radius:20px;
                letter-spacing:.4px;
                box-shadow:0 3px 12px rgba(201,102,122,.3);
              ">${escapeHtml(badgeText)} ${escapeHtml(meta.emoji)}</span>
            </td>
          </tr>
        </table>

        <!-- Headline -->
        <h2 style="
          font-family:'Playfair Display',Georgia,serif;
          font-style:italic;
          font-size:1.7rem;
          font-weight:700;
          color:#5a2d42;
          text-align:center;
          margin-bottom:12px;
          line-height:1.25;
        ">A secret letter<br>is waiting for you… 🌷</h2>

        <!-- Body (NO sender name) -->
        <p style="
          font-family:'Cormorant Garamond',Georgia,serif;
          font-style:italic;
          font-size:1.05rem;
          color:#9e6b80;
          text-align:center;
          line-height:1.7;
          margin-bottom:22px;
          padding:0 8px;
        ">
          Someone wrote you a Secret Valentine letter.<br>
          Their name is hidden until you open it.<br>
          <span style="color:#c9667a;">Tap to reveal who it is.</span>
        </p>

        <!-- CTA -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
          <tr>
            <td align="center">
              <a href="${safeLink}" style="
                display:inline-block;
                background:linear-gradient(135deg,#9b2d5a,#7a1a45);
                color:#fff;
                font-family:'Playfair Display',Georgia,serif;
                font-style:italic;
                font-weight:700;
                font-size:1.05rem;
                text-decoration:none;
                padding:15px 42px;
                border-radius:18px;
                letter-spacing:.3px;
                box-shadow:0 8px 28px rgba(155,45,90,.4);
              ">Open my letter ♥️</a>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
          <tr>
            <td style="padding:0 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:1px; background:linear-gradient(90deg,transparent,#e8a0b4,transparent);"></td></tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Hint -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td style="
              background:rgba(255,255,255,.55);
              border:1px solid rgba(232,160,180,.3);
              border-radius:16px;
              padding:18px 20px;
            ">
              <p style="
                font-family:'Cormorant Garamond',Georgia,serif;
                font-style:italic;
                font-size:.88rem;
                color:#9e6b80;
                text-align:center;
                line-height:1.65;
                margin:0;
              ">
                🔒 <strong style="color:#c9667a;font-weight:400;">Name hidden</strong> until you open the message.<br>
                You can reply privately if replies are enabled.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- PETALS -->
    <tr>
      <td style="background-color:#fce8ef; padding:0 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:4px 0 20px; font-size:.9rem; letter-spacing:12px; color:#e8a0b4;">
              🌸 ♥️ 🌸
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="
        background:linear-gradient(170deg,#f0d0de 0%,#e8c8d8 100%);
        padding:24px 32px 28px;
        text-align:center;
        border-top:1px solid rgba(232,160,180,.2);
      ">
        <p style="
          font-family:'Playfair Display',Georgia,serif;
          font-style:italic;
          font-size:.95rem;
          color:#c9667a;
          margin-bottom:10px;
        ">Secret Valentine</p>

        <p style="
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:.78rem;
          color:#b88a9a;
          font-style:italic;
          line-height:1.6;
          margin-bottom:14px;
        ">
          You received this email because a Secret Valentine letter was sent to you.<br>
          If you didn’t expect this email, you can ignore it.
        </p>

        <p style="
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:.72rem;
          color:#c0929f;
          font-style:italic;
          opacity:.8;
        ">made by D&amp;F with ♥️</p>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>`;
}

async function getOrCreateInboxIdForEmail(db, email) {
  const emailHash = sha256Hex(email);
  const emailIndexRef = db.collection("emailIndex").doc(emailHash);
  const emailIndexSnap = await emailIndexRef.get();

  if (emailIndexSnap.exists) return emailIndexSnap.data().inboxId;

  const inboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
  const inboxRef = db.collection("inboxes").doc(inboxId);

  const batch = db.batch();
  batch.set(inboxRef, {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    pinHash: null,
    pinSalt: null,
    pinIter: null,
    pinSetAt: null,
  });
  batch.set(emailIndexRef, {
    inboxId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return inboxId;
}

function encryptTextForInbox(inboxKeyBuf, text) {
  const dek = crypto.randomBytes(32);
  const bodyEnc = seal(dek, Buffer.from(String(text), "utf8"));
  const dekWrapped = seal(inboxKeyBuf, dek);
  return { bodyEnc, dekWrapped, cryptoVersion: 1 };
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

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    initAdmin();
    const db = admin.firestore();

    const ip = getClientIp(event);
    const rl = await rateLimit(db, { action: "sendMessage", key: ip, limit: 10, windowSec: 60 });
    if (!rl.allowed) {
      return jsonResponse(429, {
        ok: false,
        error: "Too many messages. Please wait a moment and try again.",
        resetAt: rl.resetAt,
      });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const toEmail = normalizeEmail(payload.toEmail);
    const fromName = String(payload.fromName || "Someone").trim().slice(0, 40);
    const replyAllowed = !!payload.replyAllowed;
    const fromEmail = normalizeEmail(payload.fromEmail);

    const type = String(payload.type || "love").trim();
    const stickerId = String(payload.stickerId || "heart_01").trim();
    const body = String(payload.body || "").trim();

    if (!toEmail || !toEmail.includes("@")) return jsonResponse(400, { ok: false, error: "Invalid toEmail" });
    if (!body || body.length < 1 || body.length > 2000) return jsonResponse(400, { ok: false, error: "Message body must be 1..2000 chars" });

    const allowedTypes = ["love", "friendship", "family", "crush"];
    if (!mustBeOneOf(type, allowedTypes)) return jsonResponse(400, { ok: false, error: "Invalid type" });

    if (replyAllowed && (!fromEmail || !fromEmail.includes("@"))) {
      return jsonResponse(400, { ok: false, error: "fromEmail required when replyAllowed is true" });
    }

    // Moderation
    let mod = null;
    let quarantined = false;
    if (typeof moderateText === "function") {
      mod = await moderateText(body);
      if (mod?.status === "block") return jsonResponse(400, { ok: false, error: "Message blocked by moderation" });
      quarantined = (mod?.status === "quarantine");
    }

    // Recipient inbox
    const inboxId = await getOrCreateInboxIdForEmail(db, toEmail);

    // Sender inbox (only if replyAllowed)
    let senderInboxId = null;
    if (replyAllowed) senderInboxId = await getOrCreateInboxIdForEmail(db, fromEmail);

    // Crypto keys
    await ensureInboxCrypto(db, inboxId);
    const recipientInboxKey = await getInboxKeyViaRecovery(db, inboxId);

    let senderInboxKey = null;
    if (replyAllowed && senderInboxId) {
      await ensureInboxCrypto(db, senderInboxId);
      senderInboxKey = await getInboxKeyViaRecovery(db, senderInboxId);
    }

    // Encrypt message + preview
    const encForRecipient = encryptTextForInbox(recipientInboxKey, body);
    const preview = body.slice(0, 80);
    const previewForRecipient = encryptTextForInbox(recipientInboxKey, preview);

    // Create message doc
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc();

    await msgRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      fromName, // stored in DB, but NOT shown in email
      type,
      stickerId,
      ...encForRecipient,

      unread: true,
      hasReplies: false,
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),

      lastPreviewEnc: previewForRecipient.bodyEnc,
      lastPreviewDekWrapped: previewForRecipient.dekWrapped,
      lastPreviewCryptoVersion: previewForRecipient.cryptoVersion,

      replyEnabled: replyAllowed,
      replyToInboxId: replyAllowed ? senderInboxId : null,
      replyToEmail: replyAllowed ? fromEmail : null,
    });

    // Sender thread copy
    if (replyAllowed && senderInboxId && senderInboxKey) {
      const senderThreadRef = db.collection("inboxes").doc(senderInboxId).collection("messages").doc(msgRef.id);
      const encForSender = encryptTextForInbox(senderInboxKey, body);
      const previewForSender = encryptTextForInbox(senderInboxKey, preview);

      await senderThreadRef.set(
        {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          fromName: "You",
          type,
          stickerId,
          ...encForSender,

          unread: false,
          hasReplies: false,
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),

          lastPreviewEnc: previewForSender.bodyEnc,
          lastPreviewDekWrapped: previewForSender.dekWrapped,
          lastPreviewCryptoVersion: previewForSender.cryptoVersion,

          replyEnabled: true,
          replyToInboxId: inboxId,
          replyToEmail: toEmail,
          sentCopy: true,
        },
        { merge: true }
      );
    }

    // Open token for recipient
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

    let emailed = false;
    if (!quarantined) {
      await sendWithResend({
        to: toEmail,
        subject: subjectForType(type),
        html: emailHtml({ type, link, baseUrl }),
      });
      emailed = true;
    }

    return jsonResponse(200, {
      ok: true,
      inboxId,
      messageId: msgRef.id,
      emailed,
      quarantined,
      moderationStatus: mod?.status ?? "allow",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};
