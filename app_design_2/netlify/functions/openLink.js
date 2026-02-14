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

async function createSessionTokenForInbox(db, inboxRef, inboxId, { expiresDays = 7, purpose = "open_setup" } = {}) {
  const sessionToken = randomTokenBase64Url(32);
  const sessionHash = sha256Hex(sessionToken);

  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
  );

  await inboxRef.collection("sessions").doc(sessionHash).set({
    inboxId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    purpose, // "open_setup" | "pin_reset"
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

    // token purpose
    const purpose = tokenData.purpose || "open"; // "open" | "pin_reset" (etc)
    const isPinReset = purpose === "pin_reset";
    if (tokenData.purpose && !["open", "pin_reset"].includes(tokenData.purpose)) {
      return jsonResponse(403, { ok: false, error: "Invalid token purpose" });
    }

    // expiry
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

    // ✅ si pin_reset => on force le flow FirstPinSetup
    const pinMustBeCreated = !pinRequired || isPinReset;

    // email association (pour share/instagram)
    const hasPrimaryEmail = isValidEmail(inbox.primaryEmail);
    const needsEmailAssociation = !hasPrimaryEmail;

    // (si tu avais un ancien champ "email", garde-le si besoin)
    const emailLinked = hasPrimaryEmail || isValidEmail(inbox.email);

    // session token uniquement si on doit créer/réinitialiser le PIN
    let sessionToken = null;
    if (pinMustBeCreated) {
      sessionToken = await createSessionTokenForInbox(db, inboxRef, inboxId, {
        expiresDays: isPinReset ? 1 : 7,
        purpose: isPinReset ? "pin_reset" : "open_setup",
      });
    }

    await inboxRef.set(
      { activatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    return jsonResponse(200, {
      ok: true,
      inboxId,
      pinRequired,
      pinMustBeCreated,
      sessionToken,
      isPinReset,
      needsEmailAssociation,
      emailLinked,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};