// netlify/functions/createInboxAccount.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { ensureInboxCrypto } = require("./cryptageInbox");

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

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function isValidEmail(e) {
  return typeof e === "string" && e.includes("@") && e.includes(".");
}

function pbkdf2Hash(password, saltHex, iterations = 150000) {
  const salt = Buffer.from(saltHex, "hex");
  const dk = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256");
  return dk.toString("hex");
}

async function createSession(db, inboxId, days = 7, purpose = "open_setup") {
  const inboxRef = db.collection("inboxes").doc(inboxId);
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

    if (event.httpMethod !== "POST")
      return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    const ip = getClientIp(event);
    const rl = await rateLimit(db, { action: "createInboxAccount", key: ip, limit: 10, windowSec: 60 });
    if (!rl.allowed) {
      return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "").trim();

    if (!isValidEmail(email)) return jsonResponse(400, { ok: false, error: "Invalid email" });
    if (password.length < 4) return jsonResponse(400, { ok: false, error: "Password must be at least 6 chars" });

    const emailHash = sha256Hex(email);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);
    const emailIndexSnap = await emailIndexRef.get();

    // prevent duplicate accounts on same email
    if (emailIndexSnap.exists) {
      return jsonResponse(409, { ok: false, error: "Email already has an inbox" });
    }

    const inboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
    const inboxRef = db.collection("inboxes").doc(inboxId);

    // password storage (pbkdf2)
    const passSalt = crypto.randomBytes(16).toString("hex");
    const passIter = 150000;
    const passHash = pbkdf2Hash(password, passSalt, passIter);

    const batch = db.batch();

    batch.set(inboxRef, {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),

      // attach email
      primaryEmail: email,

      // login password
      passHash,
      passSalt,
      passIter,
      passSetAt: admin.firestore.FieldValue.serverTimestamp(),

      // pin not set yet
      pinHash: null,
      pinSalt: null,
      pinIter: null,
      pinSetAt: null,

      standalone: false,
    });

    batch.set(emailIndexRef, {
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // crypto init
    await ensureInboxCrypto(db, inboxId);

    // session for setup -> first pin setup page
    const sessionToken = await createSession(db, inboxId, 7, "open_setup");

    return jsonResponse(200, {
      ok: true,
      inboxId,
      sessionToken,
      pinMustBeCreated: true,
      needsEmailAssociation: false,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};