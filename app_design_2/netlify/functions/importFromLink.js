// netlify/functions/importFromLink.js
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
      return { statusCode: 204, headers: jsonResponse(204, {}).headers, body: "" };
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const token = String(payload.token || "").trim();
    const targetInboxId = String(payload.targetInboxId || "").trim();
    const targetSessionToken = String(payload.targetSessionToken || "").trim();

    if (!token) return jsonResponse(400, { ok: false, error: "Missing token" });
    if (!targetInboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid targetInboxId" });
    if (!targetSessionToken) return jsonResponse(400, { ok: false, error: "Missing targetSessionToken" });

    // 1) Validate target session (user must be logged in)
    const okSession = await requireValidSession(db, targetInboxId, targetSessionToken);
    if (!okSession) return jsonResponse(401, { ok: false, error: "Not logged in" });

    // 2) Validate token -> source inbox
    const tokenHash = sha256Hex(token);
    const tokenRef = db.collection("tokens").doc(tokenHash);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid or expired link" });

    const tokenData = tokenSnap.data() || {};
    const expiresAt = tokenData.expiresAt;
    if (expiresAt && expiresAt.toDate && expiresAt.toDate() < new Date()) {
      return jsonResponse(401, { ok: false, error: "Link expired" });
    }

    const sourceInboxId = tokenData.inboxId;
    if (!sourceInboxId || !String(sourceInboxId).startsWith("inbox_")) {
      return jsonResponse(500, { ok: false, error: "Token missing inboxId" });
    }

    // Optional: only allow "open" purpose links to import (block pin_reset etc)
    const purpose = tokenData.purpose || "open";
    if (purpose !== "open") {
      return jsonResponse(403, { ok: false, error: "This link cannot be imported" });
    }

    // 3) Idempotency guard: prevent importing same token into same target multiple times
    const importedRef = db
      .collection("inboxes")
      .doc(targetInboxId)
      .collection("importedTokens")
      .doc(tokenHash);

    const importedSnap = await importedRef.get();
    if (importedSnap.exists) {
      return jsonResponse(200, { ok: true, imported: 0, alreadyImported: true });
    }

    // 4) Copy messages from source inbox -> target inbox
    const srcMessagesRef = db.collection("inboxes").doc(sourceInboxId).collection("messages");
    const srcSnap = await srcMessagesRef.get();

    const batch = db.batch();
    let imported = 0;

    srcSnap.docs.forEach((doc) => {
      const msg = doc.data() || {};
      const newId = db.collection("x").doc().id; // generate id
      const dstRef = db.collection("inboxes").doc(targetInboxId).collection("messages").doc(newId);

      batch.set(dstRef, {
        ...msg,
        importedFromInboxId: sourceInboxId,
        importedFromMessageId: doc.id,
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      imported += 1;
    });

    // mark imported token
    batch.set(importedRef, {
      tokenHash,
      sourceInboxId,
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      importedCount: imported,
    });

    await batch.commit();

    return jsonResponse(200, { ok: true, imported });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};