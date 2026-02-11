// netlify/functions/listInbox.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { open } = require("./wrap");

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

/** --------- encryption helpers --------- **/

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

function decryptBodyMaybe(inboxKeyBuf, doc) {
  if (!doc.bodyEnc || !doc.dekWrapped) return String(doc.body || "");
  const dek = open(inboxKeyBuf, doc.dekWrapped);
  return open(dek, doc.bodyEnc).toString("utf8");
}

function previewText(s, n = 120) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
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

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body" }); }

    const inboxId = String(payload.inboxId || "").trim();
    const sessionToken = String(payload.sessionToken || "").trim() || null;

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const inbox = inboxSnap.data() || {};
    const pinRequired = !!(inbox.pinHash && inbox.pinSalt && inbox.pinIter);

    const okSession = await isValidSession(db, inboxId, sessionToken);
    if (!okSession) {
      return jsonResponse(401, { ok: false, error: "Locked. Verify PIN to unlock.", pinRequired: true });
    }

    // Load inbox key (session first; fallback to recovery)
    let inboxKey = await getInboxKeyFromSession(db, inboxId, sessionToken);
    if (!inboxKey) inboxKey = await getInboxKeyViaRecovery(db, inboxId);

    const qs = await inboxRef.collection("messages")
      .orderBy("lastActiveAt", "desc")
      .limit(50)
      .get();

    const messages = [];
    for (const doc of qs.docs) {
      const d = doc.data() || {};

      // Prefer preview from latest reply if available (more “chat-like”)
      let previewSource = "";
      if (d.hasReplies) {
        const lastReplySnap = await inboxRef
          .collection("messages").doc(doc.id)
          .collection("replies")
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (!lastReplySnap.empty) {
          const r = lastReplySnap.docs[0].data() || {};
          previewSource = decryptBodyMaybe(inboxKey, r);
        }
      }

      if (!previewSource) {
        previewSource = decryptBodyMaybe(inboxKey, d);
      }

      messages.push({
        id: doc.id,
        createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : null,
        fromName: d.fromName || "Someone",
        type: d.type || "love",
        stickerId: d.stickerId || "heart_01",
        // IMPORTANT: return preview only (not full body)
        body: previewText(previewSource, 120),
        unread: d.unread !== false,
        lastActiveAt: d.lastActiveAt && d.lastActiveAt.toMillis ? d.lastActiveAt.toMillis() : null,
        replyEnabled: !!d.replyEnabled,
      });
    }

    return jsonResponse(200, { ok: true, pinRequired, messages });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};