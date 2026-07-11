// netlify/functions/createInboxAccount.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { ensureInboxCrypto, storeInboxKeyInSession, getInboxKeyViaRecovery } = require("./cryptageInbox");4
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { optionsResponse } = require("./utils/response");


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



async function createSession(db, inboxId, days = 7, purpose = "open") {
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

async function attachInboxKeyToSession(db, inboxId, sessionToken) {
  await ensureInboxCrypto(db, inboxId);
  const inboxKey = await getInboxKeyViaRecovery(db, inboxId);
  await storeInboxKeyInSession(db, inboxId, sessionToken, inboxKey);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = getDb();

    const ip = getClientIp(event);
    const rl = await rateLimit(db, { action: "createInboxAccount", key: ip, limit: 10, windowSec: 60 });
    if (!rl.allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "").trim();
    const sharedToken = String(payload.sharedToken || "").trim(); // <--- NEW: optional token from shared link

    if (!isValidEmail(email)) return jsonResponse(400, { ok: false, error: "Invalid email" });
    if (password.length < 6) return jsonResponse(400, { ok: false, error: "Password must be at least 6 characters" });

    const emailHash = sha256Hex(email);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);
    const emailIndexSnap = await emailIndexRef.get();
    if (emailIndexSnap.exists) return jsonResponse(409, { ok: false, error: "Email already has an inbox" });

    const inboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
    const inboxRef = db.collection("inboxes").doc(inboxId);

    const passSalt = crypto.randomBytes(16).toString("hex");
    const passIter = 150000;
    const passHash = pbkdf2Hash(password, passSalt, passIter);

    const batch = db.batch();
    batch.set(inboxRef, {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      primaryEmail: email,
      passHash,
      passSalt,
      passIter,
      passSetAt: admin.firestore.FieldValue.serverTimestamp(),
      standalone: false,
    });
    batch.set(emailIndexRef, { inboxId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    await batch.commit();

    // ✅ crypto init + create session + attach key
    const sessionToken = await createSession(db, inboxId, 7, "open");
    await attachInboxKeyToSession(db, inboxId, sessionToken);

    let importResult = null;
    if (sharedToken) {
      // Automatically import the shared message into the new inbox
      const importReq = {
        token: sharedToken,
        destInboxId: inboxId,
        destSessionToken: sessionToken
      };
      const importRes = await importLinkToInbox(db, importReq);
      importResult = importRes;
    }

    return jsonResponse(200, {
      ok: true,
      inboxId,
      sessionToken,
      pinMustBeCreated: false,
      needsEmailAssociation: false,
      importResult,
    });

  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};

// Helper function to call importLinkToInbox logic directly
async function importLinkToInbox(db, { token, destInboxId, destSessionToken }) {
  const importFn = require("./importLinkToInbox"); // reuse existing function
  // simulate a POST payload as if it came from event.body
  const fakeEvent = { httpMethod: "POST", body: JSON.stringify({ token, destInboxId, destSessionToken }) };
  return importFn.handler(fakeEvent);
}