// netlify/functions/openLink.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { ensureInboxCrypto, storeInboxKeyInSession, getInboxKeyViaRecovery } = require("./cryptageInbox");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      const { CORS_ORIGIN } = require('./utils/pinPolicy');
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
    purpose,
  });

  return sessionToken;
}

async function attachInboxKeyToSession(db, inboxId, sessionToken) {
  await ensureInboxCrypto(db, inboxId);
  const inboxKey = await getInboxKeyViaRecovery(db, inboxId);
  await storeInboxKeyInSession(db, inboxId, sessionToken, inboxKey);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          const { CORS_ORIGIN } = require('./utils/pinPolicy');
"access-control-allow-origin": CORS_ORIGIN,
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

    const payload = JSON.parse(event.body || "{}");
    const token = String(payload.token || "").trim();
    if (!token) return jsonResponse(400, { ok: false, error: "Missing token" });

    const tokenHash = sha256Hex(token);
    const tokenRef = db.collection("tokens").doc(tokenHash);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      return jsonResponse(401, { ok: false, error: "Invalid or expired link" });
    }

    const tokenData = tokenSnap.data() || {};
    const purpose = String(tokenData.purpose || "open");
    const isPinReset = purpose === "pin_reset";

    const expiresAt = tokenData.expiresAt;
    if (!expiresAt || expiresAt.toDate() < new Date()){
      return jsonResponse(401, { ok: false, error: "Link expired" });
    }

    const inboxId = String(tokenData.inboxId || "").trim();
    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();

    if (!inboxSnap.exists) {
      return jsonResponse(404, { ok: false, error: "Inbox not found" });
    }

    const inbox = inboxSnap.data() || {};
    const pinRequired = !!(inbox.passHash && inbox.passSalt && inbox.passIter);
    console.log(pinRequired);
    console.log(isPinReset);
    const pinMustBeCreated = !pinRequired || isPinReset;
    console.log(pinMustBeCreated);
    let sessionToken = null;

    if (pinMustBeCreated) {
      sessionToken = await createSession(inboxRef, inboxId, {
        days: isPinReset ? 1 : 7,
        purpose: isPinReset ? "pin_reset" : "open_setup",
      });

      await attachInboxKeyToSession(db, inboxId, sessionToken);
    }

    await tokenRef.delete(); // ✅ ONE-TIME USE TOKEN

    return jsonResponse(200, {
      ok: true,
      inboxId,
      pinRequired,
      pinMustBeCreated,
      sessionToken,
      isPinReset,
    });

  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};