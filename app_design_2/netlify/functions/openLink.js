// netlify/functions/openLink.js
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
function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
function isValidEmail(e) {
  return typeof e === "string" && e.includes("@") && e.includes(".");
}

async function createSession(inboxRef, inboxId, { days, purpose }) {
  const sessionToken = randomTokenBase64Url(32);
  const sessionHash = sha256Hex(sessionToken);

  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  );

  await inboxRef.collection("sessions").doc(sessionHash).set({
    inboxId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    purpose, // "open" | "pin_reset"
  });

  return sessionToken;
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

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    initAdmin();
    const db = admin.firestore();

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const token = String(payload.token || "").trim();
    if (!token) return jsonResponse(400, { ok: false, error: "Missing token" });

    const tokenHash = sha256Hex(token);
    const tokenRef = db.collection("tokens").doc(tokenHash);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
      return jsonResponse(401, { ok: false, error: "Invalid or expired link" });
    }

    const tokenData = tokenSnap.data() || {};

    const deliveryMode = String(tokenData.deliveryMode || "email"); // "email" | "share" | "instagram"
    const purpose = String(tokenData.purpose || "open"); // "open" | "pin_reset"
    const isPinReset = purpose === "pin_reset";

    const expiresAt = tokenData.expiresAt;
    if (expiresAt && expiresAt.toDate && expiresAt.toDate() < new Date()) {
      return jsonResponse(401, { ok: false, error: "Link expired" });
    }

    const inboxId = tokenData.inboxId;
    if (!inboxId) {
      return jsonResponse(500, { ok: false, error: "Token missing inboxId" });
    }

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) {
      return jsonResponse(404, { ok: false, error: "Inbox not found" });
    }

    const inbox = inboxSnap.data() || {};

    const pinRequired = !!(inbox.pinHash && inbox.pinSalt && inbox.pinIter);

    // ✅ IMPORTANT: Only force pin creation for pin_reset
    const pinMustBeCreated = !!isPinReset;

    const hasPrimaryEmail = isValidEmail(inbox.primaryEmail);
    const needsEmailAssociation = !hasPrimaryEmail;

    let sessionToken = null;

    if (pinMustBeCreated) {
      sessionToken = await createSession(inboxRef, inboxId, {
        days: 1,
        purpose: "pin_reset",
      });
    } else if (!pinRequired) {
      // ✅ If no PIN, create a normal open session so it auto-opens
      sessionToken = await createSession(inboxRef, inboxId, {
        days: 7,
        purpose: "open",
      });
    }
    // If pinRequired: no sessionToken (must verify pin)

    await inboxRef.set(
      { activatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    return jsonResponse(200, {
      ok: true,
      inboxId,
      deliveryMode,
      pinRequired,
      pinMustBeCreated,
      sessionToken,
      isPinReset,
      needsEmailAssociation,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};