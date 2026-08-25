// netlify/functions/openLink.js
const { getDb, admin } = require("./utils/admin");
const { ensureInboxCrypto, storeInboxKeyInSession, getInboxKeyViaRecovery } = require("./cryptageInbox");
const { sha256Hex, randomTokenBase64Url } = require("./utils/auth");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");

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
      return optionsResponse();
    }

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    const db = getDb();

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
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

    if (purpose === "claim_email") {
      const emailToClaim = String(tokenData.email || "").trim().toLowerCase();
      if (emailToClaim && emailToClaim.includes("@")) {
        const emailHash = sha256Hex(emailToClaim);
        const emailIndexRef = db.collection("emailIndex").doc(emailHash);
        await db.runTransaction(async (tx) => {
          const existing = await tx.get(emailIndexRef);
          if (!existing.exists) {
            tx.set(emailIndexRef, {
              inboxId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          tx.set(
            inboxRef,
            { linkedEmailHash: emailHash, linkedEmailAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
        });
      }
      await tokenRef.delete();
      return jsonResponse(200, {
        ok: true, inboxId, emailClaimed: true,
        pinRequired, pinMustBeCreated: false, sessionToken: null, isPinReset: false,
      });
    }
    
    const pinMustBeCreated = !pinRequired || isPinReset;
    let sessionToken = null;

    if (pinMustBeCreated) {
      sessionToken = await createSession(inboxRef, inboxId, {
        days: isPinReset ? 1 : 7,
        purpose: isPinReset ? "pin_reset" : "open_setup",
      });

      await attachInboxKeyToSession(db, inboxId, sessionToken);
    }

    const isShareLink = tokenData.deliveryMode === "share" || tokenData.deliveryMode === "instagram";
    if (!isShareLink) {
      await tokenRef.delete(); // one-time use for personal/email/login links
    }
    
    return jsonResponse(200, {
      ok: true,
      inboxId,
      pinRequired,
      pinMustBeCreated,
      sessionToken,
      isPinReset,
      deliveryMode: tokenData.deliveryMode || "email",
    });

  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};