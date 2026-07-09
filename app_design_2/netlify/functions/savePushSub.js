// netlify/functions/savePushSub.js
const admin = require("firebase-admin");
const crypto = require("crypto");

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}
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
    const { inboxId, sessionToken, subscription } = JSON.parse(event.body || "{}");

    if (!inboxId || !sessionToken || !subscription?.endpoint) {
      return jsonResponse(400, { ok: false, error: "Missing inboxId/sessionToken/subscription" });
    }

    // Validate session belongs to inbox
    const sessionHash = sha256Hex(sessionToken);
    const sessSnap = await db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash).get();
    if (!sessSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid session" });

    // Store by endpoint hash (so it's unique)
    const subId = sha256Hex(subscription.endpoint);
    await db.collection("inboxes").doc(inboxId).collection("pushSubs").doc(subId).set(subscription, { merge: true });

    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};