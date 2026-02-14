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

/**
 * Creates a session document under:
 * inboxes/{inboxId}/sessions/{sha256(sessionToken)}
 */
async function createSession(db, inboxRef, inboxId, { days, purpose }) {
  const sessionToken = randomTokenBase64Url(32);
  const sessionHash = sha256Hex(sessionToken);

  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  );

  await inboxRef.collection("sessions").doc(sessionHash).set({
    inboxId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    purpose, // "open" | "open_setup" | "pin_reset"
  });

  return sessionToken;
}

/**
 * Token purposes:
 * - "open"      : open inbox (if PIN exists => needs PIN; else => create sessionToken)
 * - "pin_reset" : force FirstPinSetup (create sessionToken even if PIN exists)
 * - "open_setup": (optional) same as open but can be used to force setup flow if you want
 */
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

    // ---- Token lookup
    const tokenHash = sha256Hex(token);
    const tokenRef = db.collection("tokens").doc(tokenHash);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid or expired link" });

    const tokenData = tokenSnap.data() || {};
    const purpose = String(tokenData.purpose || "open"); // "open" | "pin_reset" | "open_setup"
    const deliveryMode = String(tokenData.deliveryMode || "email"); // "email" | "share" | "instagram" (if you store it)

    // Expiration check
    const expiresAt = tokenData.expiresAt;
    if (expiresAt && typeof expiresAt.toDate === "function") {
      const exp = expiresAt.toDate();
      if (exp < new Date()) {
        return jsonResponse(401, { ok: false, error: "Link expired" });
      }
    }

    const inboxId = String(tokenData.inboxId || "").trim();
    if (!inboxId.startsWith("inbox_")) {
      return jsonResponse(500, { ok: false, error: "Token missing inboxId" });
    }

    // ---- Inbox fetch
    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const inbox = inboxSnap.data() || {};

    // PIN exists?
    const pinRequired = !!(inbox.pinHash && inbox.pinSalt && inbox.pinIter);

    // When to force FirstPinSetup?
    // - If no PIN exists => must create
    // - If purpose is pin_reset => must create even if PIN exists
    // - If purpose is open_setup => also force setup (optional)
    const isPinReset = purpose === "pin_reset";
    const forceSetup = purpose === "open_setup";
    const pinMustBeCreated = !pinRequired || isPinReset || forceSetup;

    // Email association (for standalone inboxes created via share/instagram)
    const hasPrimaryEmail = isValidEmail(inbox.primaryEmail);
    const needsEmailAssociation = !hasPrimaryEmail;

    // Session token logic:
    // - If pinMustBeCreated => create a session token for setup/reset
    // - Else if pinRequired => user must enter PIN, no sessionToken here
    // - Else (no PIN) already handled by pinMustBeCreated = true above
    let sessionToken = null;
    if (pinMustBeCreated) {
      sessionToken = await createSession(db, inboxRef, inboxId, {
        // pin reset sessions are short-lived; open/setup a bit longer
        days: isPinReset ? 1 : 7,
        purpose: isPinReset ? "pin_reset" : "open_setup",
      });
    }

    // Mark activation + basic token usage telemetry (non-blocking / merge)
    // NOTE: we DO NOT delete the token (so the same link can be reopened until expiry).
    await inboxRef.set(
      { activatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    await tokenRef.set(
      {
        lastOpenedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastOpenedInboxId: inboxId,
      },
      { merge: true }
    );

    return jsonResponse(200, {
      ok: true,
      inboxId,

      // IMPORTANT flags for client routing
      pinRequired,
      pinMustBeCreated,
      sessionToken,

      // additional info (helps your UI decide if it should show hub or open directly)
      purpose,
      isPinReset,
      deliveryMode,
      needsEmailAssociation,

      // optional: if you store it
      standalone: !!inbox.standalone,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};