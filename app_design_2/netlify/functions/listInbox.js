// netlify/functions/listInbox.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { open } = require("./wrap");
const { sessionKey, recoveryKey } = require("./keys"); // ✅ IMPORTANT: use same derivation as cryptageInbox.js
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");


async function isValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) return false;
  const sessionHash = sha256Hex(sessionToken);
  const ref = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const d = snap.data() || {};
  if (!d.expiresAt || !d.expiresAt.toDate) return false;
  return d.expiresAt.toDate() > new Date();
}

async function getInboxKeyFromSession(db, inboxId, sessionToken) {
  if (!sessionToken) return null;

  const sessionHash = sha256Hex(sessionToken);
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await sessionRef.get();
  if (!snap.exists) return null;

  const s = snap.data() || {};
  if (!s.inboxKeyEnc) return null;

  // ✅ same derivation as cryptageInbox.storeInboxKeyInSession()
  const sk = sessionKey(sessionToken);

  // open() may throw if key mismatch -> catch at caller if needed
  return open(sk, s.inboxKeyEnc);
}

async function getInboxKeyViaRecovery(db, inboxId) {
  const inboxRef = db.collection("inboxes").doc(inboxId);
  const snap = await inboxRef.get();
  if (!snap.exists) throw new Error("Inbox not found");

  const d = snap.data() || {};
  if (!d.inboxKeyWrappedByRecovery) throw new Error("Inbox crypto not initialized");

  // ✅ same recoveryKey() as cryptageInbox
  return open(recoveryKey(), d.inboxKeyWrappedByRecovery);
}

function decryptBodyMaybe(inboxKeyBuf, doc) {
  try {
    // If encrypted:
    if (doc?.bodyEnc && doc?.dekWrapped) {
      const dek = open(inboxKeyBuf, doc.dekWrapped);
      return open(dek, doc.bodyEnc).toString("utf8");
    }
  } catch (e) {
    // If decrypt fails, we fall back to plaintext (prevents 500)
  }

  // Legacy plaintext:
  return String(doc?.body || "");
}

function decryptPreviewMaybe(inboxKeyBuf, msgDoc) {
  try {
    if (msgDoc?.lastPreviewEnc && msgDoc?.lastPreviewDekWrapped) {
      const dek = open(inboxKeyBuf, msgDoc.lastPreviewDekWrapped);
      return open(dek, msgDoc.lastPreviewEnc).toString("utf8");
    }
  } catch (e) {
    // fallback below
  }
  return decryptBodyMaybe(inboxKeyBuf, msgDoc);
}

function previewText(s, n = 120) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function toMillisMaybe(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = getDb();

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    const inboxId = String(payload.inboxId || "").trim();
    const sessionToken = String(payload.sessionToken || "").trim() || null;

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const inbox = inboxSnap.data() || {};
    const pinRequired = !!(inbox.passHash && inbox.passSalt && inbox.passIter);

    const okSession = await isValidSession(db, inboxId, sessionToken);
    if (!okSession) {
      return jsonResponse(401, { ok: false, error: "Locked. Verify Password to unlock.", pinRequired: true });
    }

    // Load inbox key (session first, then recovery)
    let inboxKey = null;
    try {
      inboxKey = await getInboxKeyFromSession(db, inboxId, sessionToken);
    } catch (e) {
      // If session decryption fails -> try recovery
      inboxKey = null;
    }
    if (!inboxKey) {
      inboxKey = await getInboxKeyViaRecovery(db, inboxId);
    }

    const messagesCol = inboxRef.collection("messages");

    const unreadSnap = await messagesCol
      .where("unread", "==", true)
      .orderBy("lastActiveAt", "desc")
      .limit(50)
      .get();

    const readSnap = await messagesCol
      .where("unread", "==", false)
      .orderBy("lastActiveAt", "desc")
      .limit(50)
      .get();

    const unreadCount = unreadSnap.size;
    const docs = [...unreadSnap.docs, ...readSnap.docs];

    const messages = docs.map((doc) => {
      const d = doc.data() || {};
      const previewSource = decryptPreviewMaybe(inboxKey, d);

      return {
        id: doc.id,
        createdAt: toMillisMaybe(d.createdAt),
        fromName: d.fromName || "Someone",
        type: d.type || "love",
        stickerId: d.stickerId || "heart_01",
        body: previewText(previewSource, 120),
        unread: d.unread === true,
        lastActiveAt: toMillisMaybe(d.lastActiveAt) || toMillisMaybe(d.createdAt),
        replyEnabled: !!d.replyEnabled,
      };
    });

    return jsonResponse(200, { ok: true, pinRequired, unreadCount, messages });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};