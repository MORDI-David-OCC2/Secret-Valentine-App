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

async function createSessionTokenForInbox(db, inboxRef, inboxId) {
  const sessionToken = randomTokenBase64Url(32);
  const sessionHash = sha256Hex(sessionToken);

  const expiresDays = 7;
  const expiresAtSession = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
  );

  await inboxRef.collection("sessions").doc(sessionHash).set({
    inboxId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: expiresAtSession,
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
    if (!token) return jsonResponse(400, { ok: false, error: "Missing token" });

    const tokenHash = sha256Hex(token);
    const tokenRef = db.collection("tokens").doc(tokenHash);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid or expired link" });

    const tokenData = tokenSnap.data() || {};
    const purpose = String(tokenData.purpose || "open");
    const isPinReset = purpose === "pin_reset";

    // accept only expected purposes
    if (purpose !== "open" && purpose !== "pin_reset") {
      return jsonResponse(403, { ok: false, error: "Invalid token purpose" });
    }

    const expiresAt = tokenData.expiresAt;
    if (expiresAt && expiresAt.toDate && expiresAt.toDate() < new Date()) {
      return jsonResponse(401, { ok: false, error: "Link expired" });
    }

    const inboxId = tokenData.inboxId;
    if (!inboxId) return jsonResponse(500, { ok: false, error: "Token missing inboxId" });

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const inbox = inboxSnap.data() || {};
    const pinRequired = !!(inbox.pinHash && inbox.pinSalt && inbox.pinIter);

    // If pin_reset => we want to force user to set a new PIN (even if one exists)
    const pinMustBeCreated = isPinReset ? true : !pinRequired;

    // email association: use primaryEmail (your “remember me” email binding)
    const primaryEmail = inbox.primaryEmail || null;
    const needsEmailAssociation = !isValidEmail(primaryEmail);

    // session token:
    // - for first-time PIN setup: YES
    // - for pin reset: YES
    // - otherwise (PIN exists and normal open): NO
    let sessionToken = null;
    if (pinMustBeCreated) {
      sessionToken = await createSessionTokenForInbox(db, inboxRef, inboxId);
    }

    // mark activated (optional)
    await inboxRef.set(
      { activatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    return jsonResponse(200, {
      ok: true,
      inboxId,
      purpose,               // "open" | "pin_reset"
      pinRequired,
      pinMustBeCreated,      // frontend -> redirect to FirstPinSetup (or ResetPin)
      sessionToken,          // present only when pinMustBeCreated
      primaryEmail: isValidEmail(primaryEmail) ? String(primaryEmail) : null,
      needsEmailAssociation, // frontend -> show email field when true
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};