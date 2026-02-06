// netlify/functions/sendReply.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { seal, open } = require("./wrap");
const { sessionKey, recoveryKey } = require("./keys");

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

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return event.headers["client-ip"] || "unknown";
}

/** ---------- ENCRYPTION HELPERS ---------- **/

function sessionKey(sessionToken) {
  return crypto.createHash("sha256").update(String(sessionToken || "")).digest(); // 32 bytes
}

function recoveryKey() {
  const b64 = process.env.RECOVERY_KEY_B64;
  if (!b64) throw new Error("Missing RECOVERY_KEY_B64 env var");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("RECOVERY_KEY_B64 must be 32 bytes (base64)");
  return k;
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
  return open(sk, s.inboxKeyEnc); // Buffer(32)
}

async function getInboxKeyViaRecovery(db, inboxId) {
  const inboxRef = db.collection("inboxes").doc(inboxId);
  const snap = await inboxRef.get();
  if (!snap.exists) throw new Error("Inbox not found");
  const d = snap.data() || {};
  if (!d.inboxKeyWrappedByRecovery) throw new Error("Inbox crypto not initialized");
  return open(recoveryKey(), d.inboxKeyWrappedByRecovery); // Buffer(32)
}

function encryptTextForInbox(inboxKeyBuf, text) {
  const dek = crypto.randomBytes(32);
  const bodyEnc = seal(dek, Buffer.from(String(text), "utf8"));
  const dekWrapped = seal(inboxKeyBuf, dek);
  return { bodyEnc, dekWrapped, cryptoVersion: 1 };
}

/**
 * ✅ Session verification (your existing logic)
 * Keeps legacy sessions working.
 */
async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) throw new Error("Missing sessionToken");

  const sessionHash = sha256Hex(sessionToken);
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await sessionRef.get();
  if (sessionSnap.exists && sessionSnap.data().inboxKeyEnc) {
    inboxKey = open(sessionKey(sessionToken), sessionSnap.data().inboxKeyEnc);
  }
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

  if (s.expiresAt && typeof s.expiresAt.toMillis === "function") {
    if (s.expiresAt.toMillis() < Date.now()) {
      const err = new Error("Session expired");
      err.code = 401;
      throw err;
    }
  }

  return true;
}

function buildBaseUrl(event) {
  if (process.env.URL_DE_BASE) return process.env.URL_DE_BASE;

  const proto = event.headers["x-forwarded-proto"] || "https";
  let host = event.headers["x-forwarded-host"] || event.headers.host || "";
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host = host + ".app";
  return `${proto}://${host}`;
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

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function replyEmailHtml({ link, preview }) {
  const safePrev = escapeHtml(String(preview || "").slice(0, 180));
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111">
    <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
      <div style="background:#ff4d6d;color:#fff;padding:18px;text-align:center">
        <div style="font-size:34px">💬</div>
        <div style="font-size:18px;font-weight:800;margin-top:4px">New reply</div>
      </div>
      <div style="padding:18px">
        <p style="margin:0 0 10px 0">Someone replied:</p>
        <div style="padding:12px;border:1px solid #eee;border-radius:10px;background:#fafafa;white-space:pre-wrap">${safePrev}</div>
        <p style="margin:16px 0 18px 0">
          <a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;background:#ff4d6d;color:#fff;font-weight:700">Open conversation</a>
        </p>
        <p style="margin:0;color:#666;font-size:12px;word-break:break-all">${link}</p>
      </div>
    </div>
  </div>`;
}

exports.handler = async (event) => {
  try {
    // Preflight
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

    // Rate limit
    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, {
      action: "sendReply",
      key: ip,
      limit: 20,
      windowSec: 60,
    });
    if (!allowed) {
      return jsonResponse(429, { ok: false, error: "Too many replies. Try again later." });
    }

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

    if (!inboxId.startsWith("inbox_")) {
      return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    }
    if (!messageId) {
      return jsonResponse(400, { ok: false, error: "Missing messageId" });
    }
    if (!body || body.length < 1 || body.length > 2000) {
      return jsonResponse(400, { ok: false, error: "Reply body must be 1..2000 chars" });
    }

    // Require unlocked session
    await requireValidSession(db, inboxId, sessionToken);

    // Load original message from recipient inbox
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return jsonResponse(404, { ok: false, error: "Message not found" });
    }

    const msg = msgSnap.data() || {};
    const replyEnabled = !!msg.replyEnabled;
    const replyToInboxId = String(msg.replyToInboxId || "").trim();
    const replyToEmail = String(msg.replyToEmail || "").trim().toLowerCase();

    if (!replyEnabled || !replyToInboxId.startsWith("inbox_")) {
      return jsonResponse(403, { ok: false, error: "Replies are disabled for this message" });
    }

    // ---------- Get inbox keys ----------
    // For "me": try session inboxKeyEnc, else recovery.
    let myInboxKey = await getInboxKeyFromSession(db, inboxId, sessionToken);
    if (!myInboxKey) myInboxKey = await getInboxKeyViaRecovery(db, inboxId);

    // For "them": recovery is fine (server-side)
    const theirInboxKey = await getInboxKeyViaRecovery(db, replyToInboxId);

    // ---------- Encrypt reply content for both sides ----------
    const encForMe = encryptTextForInbox(myInboxKey, body);
    const encForThem = encryptTextForInbox(theirInboxKey, body);

    // Append to thread in BOTH inboxes (chat-style)
    const now = admin.firestore.FieldValue.serverTimestamp();
    const replyId = crypto.randomBytes(9).toString("hex");

    const meThreadRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(messageId);
    const themThreadRef = db.collection("inboxes").doc(replyToInboxId).collection("messages").doc(messageId);

    const meReplyRef = meThreadRef.collection("replies").doc(replyId);
    const themReplyRef = themThreadRef.collection("replies").doc(replyId);

    const batch = db.batch();

    // Thread updates (NOTE: lastMessage is plaintext leakage. Keep for compatibility, but you can remove later once listInbox decrypts latest reply.)
    batch.set(
      meThreadRef,
      { updatedAt: now, hasReplies: true, lastActiveAt: now, lastMessage: body.slice(0, 80) },
      { merge: true }
    );
    batch.set(
      themThreadRef,
      { updatedAt: now, hasReplies: true, lastActiveAt: now, lastMessage: body.slice(0, 80), unread: true },
      { merge: true }
    );

    // Replies (encrypted)
    batch.set(meReplyRef, { createdAt: now, from: "you", ...encForMe });
    batch.set(themReplyRef, { createdAt: now, from: "them", ...encForThem });

    await batch.commit();

    // Email notification on first reply if OTHER inbox isn't activated
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

        if (shouldSend) {
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
            html: replyEmailHtml({ link, preview: body }),
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