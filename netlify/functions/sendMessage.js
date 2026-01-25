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

function buildBaseUrl(event) {
  if (process.env.URL_DE_BASE) return process.env.URL_DE_BASE;

  const proto = event.headers["x-forwarded-proto"] || "https";
  let host = event.headers["x-forwarded-host"] || event.headers.host || "";
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host = host + ".app";
  return `${proto}://${host}`;
}

async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.API_EMAIL_KEY;     // Resend API key
  const from = process.env.EMAIL_VALENTINE;     // e.g. "Secret Valentine <hello@secretvalentines.fr>"

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
  if (type === "love") return "💘 Someone sent you a Secret Valentine message";
  if (type === "friendship") return "🫶 You got a Secret Valentine friendship message";
  if (type === "family") return "👨‍👩‍👧‍👦 You got a Secret Valentine family message";
  if (type === "crush") return "😳 Someone sent you a Secret Valentine message";
  return "💌 You received a Secret Valentine message";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailHtml({ fromName, type, link }) {
  const label =
    type === "love" ? "💘 Love" :
    type === "friendship" ? "🫶 Friendship" :
    type === "family" ? "👨‍👩‍👧‍👦 Family" :
    "😳 Crush";

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
    <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
      <div style="background:#ff4d6d;color:#fff;padding:18px;text-align:center">
        <div style="font-size:34px">💌</div>
        <div style="font-size:18px;font-weight:800;margin-top:4px">${label} message</div>
      </div>

      <div style="padding:18px">
        <p style="margin:0 0 10px 0"><strong>${escapeHtml(fromName)}</strong> sent you a message.</p>
        <p style="margin:0 0 16px 0">Open your inbox using this secure link:</p>

        <p style="margin:0 0 18px 0">
          <a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;background:#ff4d6d;color:#fff;font-weight:700">
            Open my inbox
          </a>
        </p>

        <p style="margin:0 0 6px 0;color:#666;font-size:12px">Or copy/paste:</p>
        <p style="margin:0;color:#666;font-size:12px;word-break:break-all">${link}</p>

        <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />
        <p style="margin:0;color:#888;font-size:12px">
          If you didn’t expect this email, you can ignore it.
        </p>
      </div>
    </div>
  </div>`;
}

/**
 * Reusable helper: email -> inboxId (create if missing)
 */
async function getOrCreateInboxIdForEmail(db, email) {
  const emailHash = sha256Hex(email);
  const emailIndexRef = db.collection("emailIndex").doc(emailHash);
  const emailIndexSnap = await emailIndexRef.get();

  if (emailIndexSnap.exists) {
    return emailIndexSnap.data().inboxId;
  }

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

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const toEmail = normalizeEmail(payload.toEmail);
    const fromName = String(payload.fromName || "Someone").trim().slice(0, 40);

    // ✅ Use consistent naming:
    const replyAllowed = !!payload.replyAllowed; // client should send replyAllowed
    const fromEmail = normalizeEmail(payload.fromEmail);

    const type = String(payload.type || "love").trim();
    const stickerId = String(payload.stickerId || "heart_01").trim();
    const body = String(payload.body || "").trim();

    if (!toEmail || !toEmail.includes("@")) {
      return jsonResponse(400, { ok: false, error: "Invalid toEmail" });
    }
    if (!body || body.length < 1 || body.length > 2000) {
      return jsonResponse(400, { ok: false, error: "Message body must be 1..2000 chars" });
    }

    const allowedTypes = ["love", "friendship", "family", "crush"];
    if (!mustBeOneOf(type, allowedTypes)) {
      return jsonResponse(400, { ok: false, error: "Invalid type" });
    }

    // If replies are allowed, sender must provide email (to receive replies)
    if (replyAllowed && (!fromEmail || !fromEmail.includes("@"))) {
      return jsonResponse(400, { ok: false, error: "fromEmail required when replyAllowed is true" });
    }

    // 1) recipient email -> recipient inboxId
    const inboxId = await getOrCreateInboxIdForEmail(db, toEmail);

    // 1b) optional: sender email -> sender inboxId (only if replyAllowed)
    let senderInboxId = null;
    if (replyAllowed) {
      senderInboxId = await getOrCreateInboxIdForEmail(db, fromEmail);
    }

    // 2) Store message under recipient inbox
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc();
    await msgRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      fromName,
      type,
      stickerId,
      body,
      unread: true,
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: body.slice(0, 25),
      // ✅ reply metadata
      replyEnabled: replyAllowed,
      replyToInboxId: replyAllowed ? senderInboxId : null,
      // ✅ used for "first reply" email notification
      replyToEmail: replyAllowed ? fromEmail : null,
    });

    // If replies are enabled, create a "thread copy" in the sender inbox so
    // the conversation exists on both sides.
    if (replyAllowed && senderInboxId) {
      const senderThreadRef = db
        .collection("inboxes")
        .doc(senderInboxId)
        .collection("messages")
        .doc(msgRef.id);

      await senderThreadRef.set(
        {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          fromName: "You",
          type,
          stickerId,
          body,
          unread: false,
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessage: body.slice(0, 25),

          // allow continuing the conversation from the sender side too
          replyEnabled: true,
          replyToInboxId: inboxId,
          replyToEmail: toEmail,

          sentCopy: true,
        },
        { merge: true }
      );
    }

    // 3) Create open token (store only hash)
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

    // 4) Build link
    const baseUrl = buildBaseUrl(event);
    const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

    // 5) Send email
    const subject = subjectForType(type);
    const html = emailHtml({ fromName, type, link });
    await sendWithResend({ to: toEmail, subject, html });

    // 6) Return minimal info (don’t return link in prod)
    return jsonResponse(200, {
      ok: true,
      inboxId,
      messageId: msgRef.id,
      emailed: true,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};