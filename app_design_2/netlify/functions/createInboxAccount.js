// netlify/functions/createInboxAccount.js
//
// Creates a brand new inbox attached to an email (i.e. an “account”)
// and returns { inboxId, sessionToken, pinMustBeCreated:true } so the UI
// can redirect to FirstPinSetup (email + “password” (PIN) flow).
//
// Expected POST body: { email: "user@example.com" }
//
// Notes:
// - If the email already has an inbox, we return 409 so the UI can redirect to Login.
// - We create a sessionToken immediately (like openLink does when pinMustBeCreated).
// - We ensure inbox crypto exists and we store inboxKey encrypted for the session.
//

const admin = require("firebase-admin");
const crypto = require("crypto");

const { rateLimit } = require("./rateLimit");
const { ensureInboxCrypto, getInboxKeyViaRecovery } = require("./cryptageInbox");
const { seal } = require("./wrap");
const { sessionKey } = require("./keys");

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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  // simple + safe enough for UI flow
  return typeof email === "string" && email.includes("@") && email.includes(".");
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
}

/**
 * Creates a new inbox + emailIndex mapping in a transaction.
 * Throws with code=409 if email already exists.
 */
async function createInboxForEmail(db, email) {
  const emailHash = sha256Hex(email);
  const emailIndexRef = db.collection("emailIndex").doc(emailHash);

  const inboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
  const inboxRef = db.collection("inboxes").doc(inboxId);

  await db.runTransaction(async (tx) => {
    const idxSnap = await tx.get(emailIndexRef);
    if (idxSnap.exists) {
      const err = new Error("Account already exists");
      err.code = 409;
      throw err;
    }

    tx.set(inboxRef, {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // PIN not set yet:
      pinHash: null,
      pinSalt: null,
      pinIter: null,
      pinSetAt: null,
      // optional convenience fields
      email: email, // (non-sensitive) if you already store it; remove if you prefer
      activatedAt: null,
      standalone: false,
    });

    tx.set(emailIndexRef, {
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return inboxId;
}

/**
 * Creates a session doc with inboxKey encrypted for that session.
 * Returns { sessionToken }
 */
async function createSessionForInbox(db, inboxId, inboxKeyBuf) {
  const sessionToken = randomTokenBase64Url(32);
  const sessionHash = sha256Hex(sessionToken);

  const sk = sessionKey(sessionToken);
  const inboxKeyEnc = seal(sk, inboxKeyBuf);

  const expiresDays = 30; // adjust if you want shorter
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
  );

  const sessionRef = db
    .collection("inboxes")
    .doc(inboxId)
    .collection("sessions")
    .doc(sessionHash);

  await sessionRef.set({
    inboxId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    inboxKeyEnc,
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

    // basic rate limit
    const ip = getClientIp(event);
    const rl = await rateLimit(db, {
      action: "createInboxAccount",
      key: ip,
      limit: 10,
      windowSec: 60,
    });
    if (!rl.allowed) {
      return jsonResponse(429, {
        ok: false,
        error: "Too many attempts. Please wait and try again.",
        resetAt: rl.resetAt,
      });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
      return jsonResponse(400, { ok: false, error: "Invalid email" });
    }

    // 1) Create inbox for this email (or 409 if it exists)
    const inboxId = await createInboxForEmail(db, email);

    // 2) Ensure crypto and get inbox key
    await ensureInboxCrypto(db, inboxId);
    const inboxKeyBuf = await getInboxKeyViaRecovery(db, inboxId);

    // 3) Create session so the user can proceed immediately to FirstPinSetup
    const sessionToken = await createSessionForInbox(db, inboxId, inboxKeyBuf);

    // 4) Return shape compatible with your FirstPinSetup redirect logic
    return jsonResponse(200, {
      ok: true,
      inboxId,
      sessionToken,
      pinMustBeCreated: true,
      pinRequired: false,
      needsEmailAssociation: false, // email already attached by this endpoint
      email,
    });
  } catch (err) {
    const code = err?.code && Number.isInteger(err.code) ? err.code : 500;

    if (code === 409) {
      // account already exists -> your UI should go to login flow
      return jsonResponse(409, { ok: false, error: "Account already exists" });
    }

    console.error("createInboxAccount error:", err);
    return jsonResponse(code, { ok: false, error: err?.message || "Server error" });
  }
};