// netlify/functions/sendReply.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { seal, open } = require("./wrap");
const { sessionKey, recoveryKey } = require("./keys");
const { moderateText } = require("./moderation");

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

function normalizeThreadId(messageId, msg) {
  if (msg && typeof msg.originalMessageId === "string" && msg.originalMessageId.trim()) {
    return msg.originalMessageId.trim();
  }
  const m = /^imp_inbox_[^_]+_(.+)$/.exec(String(messageId || ""));
  return m ? m[1] : messageId;
}

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}
function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
}

async function getInboxKeyFromSession(db, inboxId, sessionToken) {
  if (!sessionToken) return null;
  const sessionHash = sha256Hex(sessionToken);
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await sessionRef.get();
  if (!snap.exists) return null;
  const s = snap.data() || {};
  if (!s.inboxKeyEnc) return null;
  const sk = sessionKey(sessionToken);
  return open(sk, s.inboxKeyEnc);
}

async function getInboxKeyViaRecovery(db, inboxId) {
  const inboxRef = db.collection("inboxes").doc(inboxId);
  const snap = await inboxRef.get();
  if (!snap.exists) throw new Error("Inbox not found");
  const d = snap.data() || {};
  if (!d.inboxKeyWrappedByRecovery) throw new Error("Inbox crypto not initialized");
  return open(recoveryKey(), d.inboxKeyWrappedByRecovery);
}

function encryptTextForInbox(inboxKeyBuf, text) {
  const dek = crypto.randomBytes(32);
  const bodyEnc = seal(dek, Buffer.from(String(text), "utf8"));
  const dekWrapped = seal(inboxKeyBuf, dek);
  return { bodyEnc, dekWrapped, cryptoVersion: 1 };
}

async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) {
    const err = new Error("Missing sessionToken");
    err.code = 401;
    throw err;
  }

  const sessionHash = sha256Hex(sessionToken);
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await sessionRef.get();

  if (!snap.exists) {
    const err = new Error("Invalid session");
    err.code = 401;
    throw err;
  }

  const s = snap.data() || {};
  const sessionInboxId =
    (typeof s.inboxId === "string" && s.inboxId) ||
    (typeof s.inboxId1 === "string" && s.inboxId1) ||
    null;

  if (sessionInboxId && sessionInboxId !== inboxId) {
    const err = new Error(`Session does not match inbox: ${sessionInboxId} =/= ${inboxId}`);
    err.code = 401;
    throw err;
  }

  if (s.expiresAt && typeof s.expiresAt.toMillis === "function" && s.expiresAt.toMillis() < Date.now()) {
    const err = new Error("Session expired");
    err.code = 401;
    throw err;
  }

  return true;
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
  const apiKey = process.env.API_EMAIL_KEY_2;
  const from = process.env.EMAIL_VALENTINE_2;

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

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * ✅ Reply email template: same vibe as sendMessage template
 * - no preview of the reply
 * - button opens the conversation
 */
function replyEmailHtml({ link, baseUrl }) {
  const safeLink = escapeHtml(link);
  const envelopeImg = `${String(baseUrl).replace(/\/+$/, "")}/email/envelope.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You got a reply 💬</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;1,400&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { margin:0; padding:0; background:#fff5f8; font-family:'Cormorant Garamond', Georgia, 'Times New Roman', serif; }
  a { text-decoration:none; }
  .preheader { display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#fff5f8; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#fff5f8;">
<div class="preheader">Someone replied to your Secret Valentine… 💬 Tap to open the conversation.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff5f8; padding:32px 16px;">
<tr><td align="center">

  <table role="presentation" width="100%" style="max-width:560px; border-radius:28px; overflow:hidden; box-shadow:0 20px 60px rgba(180,90,130,.18), 0 0 0 1px rgba(232,160,180,.25);">

    <tr>
      <td style="
        background: linear-gradient(150deg, #f2c4d4 0%, #e8a0b4 35%, #d4789c 70%, #c9667a 100%);
        padding: 44px 32px 36px;
        text-align: center;
        position: relative;
      ">
        <div style="position:relative; z-index:1;">
          <p style="font-size:1.3rem; letter-spacing:10px; margin-bottom:10px; opacity:.9;">💬 🌸 💬</p>
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
          ">A reply is waiting in your conversation.</p>
        </div>

        <div style="position:absolute; bottom:-1px; left:0; right:0; line-height:0;">
          <svg viewBox="0 0 560 28" fill="none" preserveAspectRatio="none" style="display:block;width:100%;height:28px;">
            <path d="M0 28 Q70 0 140 14 Q210 28 280 14 Q350 0 420 14 Q490 28 560 14 L560 28 Z" fill="#fce8ef"/>
          </svg>
        </div>
      </td>
    </tr>

    <tr>
      <td style="background-color:#fce8ef; padding:36px 36px 28px;">

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
                <img
                  src="${escapeHtml(envelopeImg)}"
                  width="220"
                  alt="Envelope"
                  style="display:block; width:220px; max-width:80%; height:auto; border:0; outline:none; text-decoration:none;"
                />
              </div>
            </td>
          </tr>
        </table>

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
              ">1 new reply 💬</span>
            </td>
          </tr>
        </table>

        <h2 style="
          font-family:'Playfair Display',Georgia,serif;
          font-style:italic;
          font-size:1.7rem;
          font-weight:700;
          color:#5a2d42;
          text-align:center;
          margin-bottom:12px;
          line-height:1.25;
        ">Someone replied<br>to your letter… 🌷</h2>

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
          Tap below to open the conversation securely.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
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
              ">Open conversation ♥️</a>
            </td>
          </tr>
        </table>

        <p style="
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:.8rem;
          color:#b08395;
          text-align:center;
          line-height:1.6;
          word-break:break-all;
        ">${safeLink}</p>

      </td>
    </tr>

    <tr>
      <td style="
        background:linear-gradient(170deg,#f0d0de 0%,#e8c8d8 100%);
        padding:24px 32px 28px;
        text-align:center;
        border-top:1px solid rgba(232,160,180,.2);
      ">
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

    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, { action: "sendReply", key: ip, limit: 20, windowSec: 60 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many replies. Try again later." });

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const inboxId = String(payload.inboxId || "").trim();
    const messageId = String(payload.messageId || "").trim();
    const body = String(payload.body || "").trim();
    const sessionToken = String(payload.sessionToken || "").trim();

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!messageId) return jsonResponse(400, { ok: false, error: "Missing messageId" });
    if (!body || body.length < 1 || body.length > 2000)
      return jsonResponse(400, { ok: false, error: "Reply body must be 1..2000 chars" });

    const mod = await moderateText(body);
    if (mod?.status === "block") {
      return jsonResponse(400, { ok: false, error: "Reply blocked by moderation." });
    }
    const quarantined = mod?.status === "quarantine";

    await requireValidSession(db, inboxId, sessionToken);

    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) return jsonResponse(404, { ok: false, error: "Message not found" });

    const msg = msgSnap.data() || {};
    const replyEnabled = !!msg.replyEnabled;
    const replyToInboxId = String(msg.replyToInboxId || "").trim();
    const replyToEmail = String(msg.replyToEmail || "").trim().toLowerCase();

    if (!replyEnabled || !replyToInboxId.startsWith("inbox_")) {
      return jsonResponse(403, { ok: false, error: "Replies are disabled for this message" });
    }

    // Keys
    let myInboxKey = await getInboxKeyFromSession(db, inboxId, sessionToken);
    if (!myInboxKey) myInboxKey = await getInboxKeyViaRecovery(db, inboxId);

    const theirInboxKey = await getInboxKeyViaRecovery(db, replyToInboxId);

    // Encrypt reply for both inboxes
    const encForMe = encryptTextForInbox(myInboxKey, body);
    const encForThem = encryptTextForInbox(theirInboxKey, body);
  
    // Preview fields (used for list view); still ok to keep encrypted preview in DB
    const preview = body.slice(0, 80);
    const previewForMe = encryptTextForInbox(myInboxKey, preview);
    const previewForThem = encryptTextForInbox(theirInboxKey, preview);
    const threadId = normalizeThreadId(messageId, msg);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const replyId = crypto.randomBytes(9).toString("hex");
    const meThreadRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(threadId);
    const themThreadRef = db.collection("inboxes").doc(replyToInboxId).collection("messages").doc(threadId);
    const meReplyRef = meThreadRef.collection("replies").doc(replyId);
    const themReplyRef = themThreadRef.collection("replies").doc(replyId);

    const batch = db.batch();

    // Update thread metadata
    batch.set(
      meThreadRef,
      {
        updatedAt: now,
        hasReplies: true,
        lastActiveAt: now,
        lastPreviewEnc: previewForMe.bodyEnc,
        lastPreviewDekWrapped: previewForMe.dekWrapped,
        lastPreviewCryptoVersion: previewForMe.cryptoVersion,
        moderationStatus: mod?.status ?? "allow",
        moderationReason: mod?.reason ?? null,
      },
      { merge: true }
    );

    batch.set(
      themThreadRef,
      {
        updatedAt: now,
        hasReplies: true,
        lastActiveAt: now,
        unread: true, // 👈 receiver gets unread on the thread
        lastPreviewEnc: previewForThem.bodyEnc,
        lastPreviewDekWrapped: previewForThem.dekWrapped,
        lastPreviewCryptoVersion: previewForThem.cryptoVersion,
        moderationStatus: mod?.status ?? "allow",
        moderationReason: mod?.reason ?? null,
      },
      { merge: true }
    );

    // Write reply docs (so UI can render the conversation immediately)
    batch.set(meReplyRef, {
      createdAt: now,
      from: "me",
      fromInboxId: inboxId,
      bodyEnc: encForMe.bodyEnc,
      dekWrapped: encForMe.dekWrapped,
      cryptoVersion: encForMe.cryptoVersion,
    });

    batch.set(themReplyRef, {
      createdAt: now,
      from: "them",
      fromInboxId: inboxId,
      bodyEnc: encForThem.bodyEnc,
      dekWrapped: encForThem.dekWrapped,
      cryptoVersion: encForThem.cryptoVersion,
    });

    await batch.commit();

    // ✅ Email notification ONLY if recipient has not activated (same logic you had)
    try {
      const otherInboxRef = db.collection("inboxes").doc(replyToInboxId);
      const otherSnap = await otherInboxRef.get();
      const otherData = otherSnap.data() || {};
      const otherActivated = !!otherData.activatedAt;

      if (!otherActivated && replyToEmail.includes("@")) {
        const markerRef = otherInboxRef.collection("replyNotifs").doc(messageId);
        let shouldSend = false;

        await db.runTransaction(async (tx) => {
          const m = await tx.get(markerRef);
          if (m.exists) return;
          tx.set(markerRef, { createdAt: now });
          shouldSend = true;
        });

        if (shouldSend && !quarantined) {
          const token = randomTokenBase64Url(32);
          const tokenHash = sha256Hex(token);
          const expiresDays = 7;
          const expiresAt = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
          );

          await db.collection("tokens").doc(tokenHash).set({
            inboxId: replyToInboxId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt,
            purpose: "open",
          });

          const baseUrl = buildBaseUrl(event);
          const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

          await sendWithResend({
            to: replyToEmail,
            subject: "💬 You got a reply",
            html: replyEmailHtml({ link, baseUrl }),
          });
        }
      }
    } catch (notifyErr) {
      console.error("Reply notification error:", notifyErr);
    }

    return jsonResponse(200, { ok: true, replyId });
  } catch (err) {
    console.error(err);
    const status = err.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(status, { ok: false, error: err.message || "Server error" });
  }
};