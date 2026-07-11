const { getDb, admin } = require("./utils/admin");
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

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = getDb();

    const payload = JSON.parse(event.body || "{}");
    const inboxId = String(payload.inboxId || "").trim();
    const subscription = payload.subscription;

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });
    if (!subscription || !subscription.endpoint) return jsonResponse(400, { ok: false, error: "Invalid subscription" });

    const sha256Hex = (s) => require("crypto").createHash("sha256").update(String(s)).digest("hex");
    const sessionToken = String(payload.sessionToken || "").trim();
    const sessSnap = await db.collection("inboxes").doc(inboxId).collection("sessions").doc(sha256Hex(sessionToken)).get();
    if (!sessSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid session" });
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