// netlify/functions/importLinkToInbox.js
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

async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) return false;
  const sessionHash = sha256Hex(sessionToken);
  const ref = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const d = snap.data() || {};
  if (!d.expiresAt || !d.expiresAt.toDate) return false;
  return d.expiresAt.toDate() > new Date();
}

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

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

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
    const importedMessageId2= importedMessageId.slice(29,)

    const clean = { ...data };

    // remove encrypted fields so DEST will use plaintext fallback safely
    delete clean.bodyEnc;
    delete clean.dekWrapped;
    delete clean.lastPreviewEnc;
    delete clean.lastPreviewDekWrapped;
    delete clean.body; // we will set fresh plaintext

    await destMessagesRef.doc(importedMessageId).set({
      ...clean,
      body: plainBody,
      lastPreview: plainPreview,
      importedFromInboxId: sourceInboxId,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      unread: true,
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await tokenRef.set(
      {
        importedTo: destInboxId,
        importedMessageId,
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return jsonResponse(200, { ok: true, imported: 1, importedMessageId });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};