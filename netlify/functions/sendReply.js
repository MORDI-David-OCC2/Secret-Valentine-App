const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");

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

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return event.headers["client-ip"] || "unknown";
}

/**
 * ✅ Session verification
 * Assumes you store sessions in:
 *   sessions/{sessionHash} => { inboxId, expiresAt }
 *
 * If your current project already returns sessionToken from verifyPin
 * and listInbox checks it, you very likely already have this.
 */
async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) throw new Error("Missing sessionToken");

  const sessionHash = sha256Hex(sessionToken);
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await sessionRef.get();

  if (!snap.exists) {
    const err = new Error("Invalid session");
    err.code = 401;
    throw err;
  }

  const s = snap.data() || {};
  console.log("SESSION RAW DATA:", JSON.stringify(s, null, 2));
  if (s.inboxId !== inboxId) {
    console.log(s.inboxId, inboxId);
    const err = new Error(`Session does not match inbox: ${s.inboxId} =/= ${inboxId}`);
    err.code = 401;
    throw err;
  }

  // expiresAt should be a Firestore Timestamp
  if (s.expiresAt && typeof s.expiresAt.toMillis === "function") {
    if (s.expiresAt.toMillis() < Date.now()) {
      const err = new Error("Session expired");
      err.code = 401;
      throw err;
    }
  }

  return true;
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

    // Rate limit (protect from reply spam)
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

    // ✅ Require unlocked session (recipient must have unlocked inbox)
    await requireValidSession(db, inboxId, sessionToken);

    // 1) Load original message from recipient inbox
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return jsonResponse(404, { ok: false, error: "Message not found" });
    }

    const msg = msgSnap.data() || {};
    const replyEnabled = !!msg.replyEnabled;
    const replyToInboxId = String(msg.replyToInboxId || "").trim();

    // ✅ Replies only if sender opted in
    if (!replyEnabled || !replyToInboxId.startsWith("inbox_")) {
      return jsonResponse(403, { ok: false, error: "Replies are disabled for this message" });
    }

    // 2) Write reply into sender inbox thread (under same messageId)
    const destMessageRef = db.collection("inboxes").doc(replyToInboxId).collection("messages").doc(messageId);
    const replyRef = destMessageRef.collection("replies").doc();

    // Make sure parent doc exists (nice for console browsing)
    await destMessageRef.set(
      {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        hasReplies: true,
      },
      { merge: true }
    );

    await replyRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      body,
      // keep it role-based (no identity leakage)
      from: "recipient",
      // optional for anti-abuse / analytics (can store hash instead):
      sourceInboxId: inboxId,
    });

    // Optional: mark sender inbox as having unread activity (if you want badges later)
    await db.collection("inboxes").doc(replyToInboxId).set(
      { lastActivityAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    return jsonResponse(200, {
      ok: true,
      replyId: replyRef.id,
    });
  } catch (err) {
    console.error(err);
    const status = err.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(status, { ok: false, error: err.message || "Server error" });
  }
};