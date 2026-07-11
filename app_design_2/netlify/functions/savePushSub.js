// netlify/functions/savePushSub.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { CORS_ORIGIN } = require('./utils/pinPolicy');

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

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = getDb();
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