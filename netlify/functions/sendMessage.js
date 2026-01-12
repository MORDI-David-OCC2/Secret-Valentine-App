const admin = require("firebase-admin");
const crypto = require("crypto");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // tighten later if you want:
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Node 18 supports base64url via digest/encoding tricks
function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function mustBeOneOf(val, allowed) {
  return allowed.includes(val);
}

function initAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

exports.handler = async (event) => {
  try {
    // Preflight (optional, helps if you call from browser)
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

    const toEmail = normalizeEmail(payload.toEmail);
    const fromName = String(payload.fromName || "Someone").trim().slice(0, 40);

    const type = String(payload.type || "love").trim();
    const stickerId = String(payload.stickerId || "heart_01").trim();
    const body = String(payload.body || "").trim();

    // Basic validation (tune later)
    if (!toEmail || !toEmail.includes("@")) {
      return jsonResponse(400, { ok: false, error: "Invalid toEmail" });
    }
    if (!body || body.length < 1 || body.length > 500) {
      return jsonResponse(400, { ok: false, error: "Message body must be 1..500 chars" });
    }

    const allowedTypes = ["love", "friendship", "family", "crush"];
    if (!mustBeOneOf(type, allowedTypes)) {
      return jsonResponse(400, { ok: false, error: "Invalid type" });
    }

    // 1) emailHash -> inboxId (create if missing)
    const emailHash = sha256Hex(toEmail);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);
    const emailIndexSnap = await emailIndexRef.get();

    let inboxId;

    if (emailIndexSnap.exists) {
      inboxId = emailIndexSnap.data().inboxId;
    } else {
      inboxId = "inbox_" + crypto.randomBytes(9).toString("hex"); // short random id
      const inboxRef = db.collection("inboxes").doc(inboxId);

      // Create inbox + mapping in a batch
      const batch = db.batch();
      batch.set(inboxRef, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        pinHash: null,
        pinSetAt: null,
      });
      batch.set(emailIndexRef, {
        inboxId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
    }

    // 2) Store message under inbox
    const msgRef = db.collection("inboxes").doc(inboxId).collection("messages").doc();
    await msgRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      fromName,
      type,
      stickerId,
      body, // MVP plaintext. Later: ciphertext + iv
      unread: true,
    });

    // 3) Create token (store only hash)
    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);

    const expiresDays = 30; // adjust (7–30 common)
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
    );

    await db.collection("tokens").doc(tokenHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      // optional:
      // messageId: msgRef.id,
    });

    // Build base URL from the incoming request (works on Netlify + locally)
const host =
event.headers["x-forwarded-host"] ||
event.headers.host;

const proto =
event.headers["x-forwarded-proto"] || "https";

const baseUrl = process.env.APP_BASE_URL || `${proto}://${host}`;

// If you're running Live Server from /public locally, keep /public.
// If your local URL serves index.html directly, remove "/public".
const localPath = baseUrl.includes("localhost") ? "/public" : "";

const link = `${baseUrl}${localPath}/#/inbox?t=${encodeURIComponent(token)}`;


    // For now return link for testing.
    // Next step: send the email from here.
    return jsonResponse(200, {
      ok: true,
      inboxId,
      messageId: msgRef.id,
      link,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};