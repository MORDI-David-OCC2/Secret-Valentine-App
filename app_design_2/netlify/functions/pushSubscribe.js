const admin = require("firebase-admin");
const { CORS_ORIGIN } = require('./utils/pinPolicy');

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
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
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    const payload = JSON.parse(event.body || "{}");
    const inboxId = String(payload.inboxId || "").trim();
    const subscription = payload.subscription;

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!subscription || !subscription.endpoint) return jsonResponse(400, { ok: false, error: "Invalid subscription" });

    // Stockage : 1 subscription par inbox (simple)
    await db.collection("pushSubscriptions").doc(inboxId).set(
      {
        inboxId,
        subscription,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};