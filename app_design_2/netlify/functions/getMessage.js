// netlify/functions/getMessage.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { open } = require("./wrap");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      const { CORS_ORIGIN } = require('./utils/pinPolicy');
"access-control-allow-origin": CORS_ORIGIN,
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

async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) return false;
  const sessionSnap = await db
    .collection("inboxes").doc(inboxId)
    .collection("sessions").doc(sha256Hex(sessionToken))
    .get();

  if (!sessionSnap.exists) return false;
  const s = sessionSnap.data() || {};
  if (s.expiresAt?.toMillis && s.expiresAt.toMillis() < Date.now()) return false;
  return true;
}

function toMillisMaybe(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return null;
}

function decryptBodyMaybe(inboxKeyBuf, doc) {
  if (!doc.bodyEnc || !doc.dekWrapped) return String(doc.body || "");
  const dek = open(inboxKeyBuf, doc.dekWrapped);
  return open(dek, doc.bodyEnc).toString("utf8");
}

// --------- IMPORT ID HELPERS (robustes) ----------
function isImportedMessageId(id) {
  return typeof id === "string" && id.startsWith("imp_inbox_");
}
/**
 * Format attendu: imp_inbox_<someInboxOrMeta>_<originalMessageId>
 * -> on enlève "imp_inbox_" + "<meta>_" et on garde le reste
 * (marche même si originalMessageId contient des underscores)
 */
function extractOriginalMessageId(importId) {
  if (!isImportedMessageId(importId)) return null;

  // imp_inbox_XXXX_<rest>
  const original = importId.slice(29,); // "XXXX_<rest>"
  return original || null;
}
// fetch replies for a threadId in this inbox
async function fetchRepliesForThread({ db, inboxId, threadId, inboxKey }) {
  const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(threadId);

  const repliesSnap = await msgRef.collection("replies").orderBy("createdAt", "asc").limit(200).get();

  return repliesSnap.docs.map((d) => {
    const r = d.data() || {};
    const fromInboxId = String(r.fromInboxId || "").trim();
    const fromSide = fromInboxId && fromInboxId === inboxId ? "me" : "them";

    return {
      id: d.id,
      body: decryptBodyMaybe(inboxKey, r),
      from: fromSide,
      createdAt: toMillisMaybe(r.createdAt),
      _threadId: threadId, // debug (optionnel)
    };
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          const { CORS_ORIGIN } = require('./utils/pinPolicy');
"access-control-allow-origin": CORS_ORIGIN,
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
    const { allowed } = await rateLimit(db, {
      action: "getMessage",
      key: ip,
      limit: 60,
      windowSec: 60,
    });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many requests" });

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const inboxId = String(payload.inboxId || "").trim();
    const messageId = String(payload.messageId || "").trim();
    const sessionToken = payload.sessionToken ? String(payload.sessionToken).trim() : null;

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!messageId) return jsonResponse(400, { ok: false, error: "Missing messageId" });

    const inboxSnap = await db.collection("inboxes").doc(inboxId).get();
    const inboxData = inboxSnap.data() || {};
    const pinRequired = !!(inboxData.passHash && inboxData.passSalt && inboxData.passIter);

    const okSession = await requireValidSession(db, inboxId, sessionToken);
    if (!okSession) return jsonResponse(401, { ok: false, error: "Locked. Verify PIN to unlock.", pinRequired });

    let inboxKey = await getInboxKeyFromSession(db, inboxId, sessionToken);
    if (!inboxKey) inboxKey = await getInboxKeyViaRecovery(db, inboxId);

    // ---- Determine which thread IDs to load ----
    const idsToTry = [messageId];
    const originalMessageId = extractOriginalMessageId(messageId);
    if (originalMessageId && originalMessageId !== messageId) {
      idsToTry.push(originalMessageId);
    }
    // ---- Load main message doc (must exist for requested id) ----
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(messageId);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) return jsonResponse(404, { ok: false, error: "Message not found" });

    const m = msgSnap.data() || {};

    // Mark requested thread as read
    if (m.unread === true) {
      await msgRef.set(
        { unread: false, readAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    // Best-effort: if imported, also mark the original as read (if it exists)
    if (originalMessageId) {
      try {
        const altRef = db.collection("inboxes").doc(inboxId).collection("messages").doc(originalMessageId);
        const altSnap = await altRef.get();
        if (altSnap.exists && altSnap.data()?.unread === true) {
          await altRef.set(
            { unread: false, readAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
        }
      } catch {
        // ignore
      }
    }

    const body = decryptBodyMaybe(inboxKey, m);

    // ---- Fetch replies from all relevant thread docs that exist ----
    const existingThreadIds = [];
    for (const id of idsToTry) {
      const s = await db.collection("inboxes").doc(inboxId).collection("messages").doc(id).get();
      if (s.exists) existingThreadIds.push(id);
    }
    const repliesArrays = await Promise.all(
      existingThreadIds.map((threadId) => fetchRepliesForThread({ db, inboxId, threadId, inboxKey }))
    );

    // Merge + dedupe (same replyId can exist under both docs)
    const merged = [];
    const seen = new Set();
    for (const arr of repliesArrays) {
      for (const r of arr) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        merged.push(r);
      }
    }

    // Sort by createdAt asc (nulls last)
    merged.sort((a, b) => {
      const ta = typeof a.createdAt === "number" ? a.createdAt : Number.POSITIVE_INFINITY;
      const tb = typeof b.createdAt === "number" ? b.createdAt : Number.POSITIVE_INFINITY;
      return ta - tb;
    });

    // Cap at 200 total
    const replies = merged.slice(-200).map(({ _threadId, ...rest }) => rest);

    return jsonResponse(200, {
      ok: true,
      message: {
        id: msgSnap.id, // keep requested id (important for UI)
        fromName: m.fromName || "Someone",
        type: m.type || "love",
        stickerId: m.stickerId || "heart_01",
        body,
        unread: !!m.unread,
        replyEnabled: !!m.replyEnabled,
        createdAt: toMillisMaybe(m.createdAt),
      },
      replies,
      // optional debug info:
      // threadIdsLoaded: existingThreadIds,
      // originalMessageId: originalMessageId || null,
    });
  } catch (err) {
    console.error(err);
    const code = err.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(code, { ok: false, error: err.message || "Server error" });
  }
};