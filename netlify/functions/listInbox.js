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

    const qs = await inboxRef.collection("messages")
      .orderBy("lastActiveAt", "desc")
      .limit(50)
      .get();

    const messages = [];
    qs.forEach((doc) => {
      const d = doc.data() || {};
      messages.push({
        id: doc.id,
        createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : null,
        fromName: d.fromName || "Someone",
        type: d.type || "love",
        stickerId: d.stickerId || "heart_01",
        body: d.body || "", // preview is handled client-side; still okay since unlocked
        unread: d.unread !== false,
        lastActiveAt: d.lastActiveAt && d.lastActiveAt.toMillis ? d.lastActiveAt.toMillis(): null,
        lastMessage: d.lastMessage || "",
        replyEnabled: !!d.replyEnabled,
      });
    });

    return jsonResponse(200, { ok: true, pinRequired, messages });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};