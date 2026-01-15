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
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return event.headers["client-ip"] || "unknown";
}

// If your project uses sessions/{sha256(sessionToken)} => { inboxId, expiresAt }
// this enforces PIN gating when pinHash exists.
async function requireValidSessionIfPinned(db, inboxId, sessionToken) {
  const inboxSnap = await db.collection("inboxes").doc(inboxId).get();
  if (!inboxSnap.exists) {
    const err = new Error("Inbox not found");
    err.code = 404;
    throw err;
  }

  const inbox = inboxSnap.data() || {};
  const pinIsSet = !!inbox.pinHash;

  // If no PIN set, no session required
  if (!pinIsSet) return;

  if (!sessionToken) {
    const err = new Error("PIN required");
    err.code = 401;
    throw err;
  }

  const sessionHash = sha256Hex(sessionToken);
  const sessionSnap = await db.collection("sessions").doc(sessionHash).get();
  if (!sessionSnap.exists) {
    const err = new Error("Invalid session");
    err.code = 401;
    throw err;
  }

  const s = sessionSnap.data() || {};
  if (s.inboxId !== inboxId) {
    const err = new Error("Session mismatch");
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
}

function toMillisMaybe(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      }, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    initAdmin();
    const db = admin.firestore();

    // Rate limit (anti scraping / brute)
    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, {
      action: "getMessage",
      key: ip,
      limit: 60,
      windowSec: 60,
    });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many requests" });

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body" }); }

    const inboxId = String(payload.inboxId || "").trim();
    const messageId = String(payload.messageId || "").trim();
    const sessionToken = payload.sessionToken ? String(payload.sessionToken).trim() : null;

    if (!inboxId.startsWith("inbox_")) {
      return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    }
    if (!messageId) {
      return jsonResponse(400, { ok: false, error: "Missing messageId" });
    }

    // Enforce unlock only if PIN exists
    await requireValidSessionIfPinned(db, inboxId, sessionToken);

    // Fetch message
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return jsonResponse(404, { ok: false, error: "Message not found" });
    }

    const m = msgSnap.data() || {};

    // Fetch replies (optional)
    const repliesSnap = await msgRef
      .collection("replies")
      .orderBy("createdAt", "asc")
      .limit(200)
      .get();

    const replies = repliesSnap.docs.map((d) => {
      const r = d.data() || {};
      return {
        id: d.id,
        body: r.body || "",
        from: r.from || "recipient",
        createdAt: toMillisMaybe(r.createdAt),
      };
    });

    // Return message (DO NOT return replyToInboxId)
    return jsonResponse(200, {
      ok: true,
      message: {
        id: msgSnap.id,
        fromName: m.fromName || "Someone",
        type: m.type || "love",
        stickerId: m.stickerId || "heart_01",
        body: m.body || "",
        unread: !!m.unread,
        replyEnabled: !!m.replyEnabled,
        createdAt: toMillisMaybe(m.createdAt),
      },
      replies,
    });
  } catch (err) {
    console.error(err);
    const code = err.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(code, { ok: false, error: err.message || "Server error" });
  }
};