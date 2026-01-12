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

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function initAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");

  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
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

    const payload = JSON.parse(event.body || "{}");
    const token = String(payload.token || "").trim();
    if (!token || token.length < 20) {
      return jsonResponse(400, { ok: false, error: "Invalid token" });
    }

    const tokenHash = sha256Hex(token);
    const tokenRef = db.collection("tokens").doc(tokenHash);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      return jsonResponse(401, { ok: false, error: "Link invalid or expired" });
    }

    const tokenData = tokenSnap.data();
    const inboxId = tokenData.inboxId;

    // Expiry check
    if (tokenData.expiresAt?.toDate) {
      const expiresAt = tokenData.expiresAt.toDate();
      if (Date.now() > expiresAt.getTime()) {
        await tokenRef.delete().catch(() => {});
        return jsonResponse(401, { ok: false, error: "Link expired" });
      }
    }

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    const inbox = inboxSnap.exists ? inboxSnap.data() : {};
    const pinRequired = !!inbox.pinHash;

    const messagesSnap = await inboxRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages = [];
    messagesSnap.forEach((doc) => {
      const d = doc.data();
      messages.push({
        id: doc.id,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
        fromName: d.fromName || "Someone",
        type: d.type || "love",
        stickerId: d.stickerId || "heart_01",
        body: d.body || "",
        unread: d.unread !== false,
      });
    });

    return jsonResponse(200, { ok: true, inboxId, pinRequired, messages });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};
