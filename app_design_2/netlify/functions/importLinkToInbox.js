// netlify/functions/importLinkToInbox.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { rateLimit } = require('./rateLimit');
const { seal, open } = require("./wrap");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");

// --- crypto helpers (same as listInbox) ---
function recoveryKey() {
  const b64 = process.env.RECOVERY_KEY_B64;
  if (!b64) throw new Error("Missing RECOVERY_KEY_B64 env var");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("RECOVERY_KEY_B64 must be 32 bytes (base64)");
  return k;
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
  if (doc?.bodyEnc && doc?.dekWrapped) {
    const dek = open(inboxKeyBuf, doc.dekWrapped);
    return open(dek, doc.bodyEnc).toString("utf8");
  }
  return String(doc?.body || "");
}

function decryptPreviewMaybe(inboxKeyBuf, doc) {
  if (doc?.lastPreviewEnc && doc?.lastPreviewDekWrapped) {
    const dek = open(inboxKeyBuf, doc.lastPreviewDekWrapped);
    return open(dek, doc.lastPreviewEnc).toString("utf8");
  }
  return decryptBodyMaybe(inboxKeyBuf, doc);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    const db = getDb();
    const ip = (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const { allowed } = await rateLimit(db, { action: "importLinkToInbox", key: getClientIp(event), limit: 20, windowSec: 60 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many requests" });
    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    const token = String(payload.token || "").trim();
    const destInboxId = String(payload.destInboxId || "").trim();
    const destSessionToken = String(payload.destSessionToken || "").trim();

    if (!token) return jsonResponse(400, { ok: false, error: "Missing token" });
    if (!destInboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid destInboxId" });

    const ok = await requireValidSession(db, destInboxId, destSessionToken);
    if (!ok) return jsonResponse(401, { ok: false, error: "Unauthorized (session required)" });

    // Resolve source inbox from token
    const tokenHash = sha256Hex(token);
    const tokenRef = db.collection("tokens").doc(tokenHash);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid or expired link" });
    
    const tokenData = tokenSnap.data() || {};
    const tokenExpiresAt = tokenData.expiresAt;
    if (!tokenExpiresAt || tokenExpiresAt.toDate() < new Date()) {
      return jsonResponse(401, { ok: false, error: "Invalid or expired link" });
    }
    if (tokenData.purpose !== 'import_link') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid token purpose' }) };
    }
    const sourceInboxId = String(tokenData.inboxId || "").trim();
    if (!sourceInboxId.startsWith("inbox_")) return jsonResponse(500, { ok: false, error: "Token missing inboxId" });

    if (sourceInboxId === destInboxId) {
      return jsonResponse(200, { ok: true, imported: 0, importedMessageId: null });
    }

    const sourceMessagesRef = db.collection("inboxes").doc(sourceInboxId).collection("messages");
    const destMessagesRef = db.collection("inboxes").doc(destInboxId).collection("messages");

    // Import ONLY the latest message
    let latestSnap = await sourceMessagesRef.orderBy("createdAt", "desc").limit(1).get().catch(async () => {
      const all = await sourceMessagesRef.limit(1).get();
      return all;
    });

    if (latestSnap.empty) return jsonResponse(200, { ok: true, imported: 0, importedMessageId: null });

    const doc = latestSnap.docs[0];
    const data = doc.data() || {};

    // ✅ decrypt using SOURCE inbox key, then store PLAINTEXT in DEST
    const sourceInboxKey = await getInboxKeyViaRecovery(db, sourceInboxId);
    const plainBody = decryptBodyMaybe(sourceInboxKey, data);
    const plainPreview = decryptPreviewMaybe(sourceInboxKey, data);

    const importedMessageId = `imp_${sourceInboxId}_${doc.id}`.slice(0, 150);

    const clean = { ...data };
    const destInboxKey = await getInboxKeyViaRecovery(db, destInboxId);
    // remove encrypted fields so DEST will use plaintext fallback safely
    delete clean.bodyEnc;
    delete clean.dekWrapped;
    delete clean.lastPreviewEnc;
    delete clean.lastPreviewDekWrapped;
    delete clean.body; // we will set fresh plaintext

    await destMessagesRef.doc(importedMessageId).set({
      ...clean,
      body: seal(destInboxKey, Buffer.from(plainBody, "utf8")),
      lastPreview: seal(destInboxKey, Buffer.from(plainPreview, "utf8")),
      importedFromInboxId: sourceInboxId,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      unread: true,
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await tokenRef.delete();

    return jsonResponse(200, { ok: true, imported: 1, importedMessageId });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};