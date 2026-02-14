// netlify/functions/importLinkToInbox.js
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

    // ✅ import only the latest message
    // If you have a Timestamp field, orderBy works; otherwise this still returns something but you may need to adapt field name.
    let latestSnap = await sourceMessagesRef.orderBy("createdAt", "desc").limit(1).get().catch(async () => {
      // fallback if createdAt isn't orderable: just get first doc
      const all = await sourceMessagesRef.limit(1).get();
      return all;
    });

    if (latestSnap.empty) return jsonResponse(200, { ok: true, imported: 0, importedMessageId: null });

    const doc = latestSnap.docs[0];
    const data = doc.data() || {};

    const importedMessageId = `imp_${sourceInboxId}_${doc.id}`.slice(0, 150);

    await destMessagesRef.doc(importedMessageId).set({
      ...data,
      importedFromInboxId: sourceInboxId,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      unread: true,
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