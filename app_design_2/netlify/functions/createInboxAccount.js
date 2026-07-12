// netlify/functions/createInboxAccount.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { ensureInboxCrypto, storeInboxKeyInSession, getInboxKeyViaRecovery } = require("./cryptageInbox");
const { pbkdf2Hash } = require("./utils/pinCrypto");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url } = require("./utils/auth");
const { PIN_REGEX, PIN_LABEL } = require('./utils/pinPolicy');

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
    if (!PIN_REGEX.test(password)) return jsonResponse(400, { ok: false, error: PIN_LABEL });

    const emailHash = sha256Hex(email);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);
    const emailIndexSnap = await emailIndexRef.get();
    if (emailIndexSnap.exists) return jsonResponse(409, { ok: false, error: "Email already has an inbox" });

    const passSalt = crypto.randomBytes(16).toString("hex");
    const passIter = 150000;
    const passHash = pbkdf2Hash(password, passSalt, passIter);

    const inboxId = await db.runTransaction(async (tx) => {
      const emailIndexSnap = await tx.get(emailIndexRef);
      if (emailIndexSnap.exists) return null;
      const newId = "inbox_" + crypto.randomBytes(9).toString("hex");
      tx.set(db.collection("inboxes").doc(newId), {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        primaryEmail: email, passHash, passSalt, passIter,
        passSetAt: admin.firestore.FieldValue.serverTimestamp(),
        standalone: false,
      });
      tx.set(emailIndexRef, { inboxId: newId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return newId;
    });
    const inboxRef = db.collection("inboxes").doc(inboxId);
    if (!inboxId) return jsonResponse(409, { ok: false, error: "Email already has an inbox" });

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
  const fakeEvent = {
    httpMethod: "POST",
    body: JSON.stringify({ token, destInboxId, destSessionToken }),
    headers: {}, 
  };
  return importFn.handler(fakeEvent);
}