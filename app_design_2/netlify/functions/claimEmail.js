// netlify/functions/claimEmail.js
const admin = require("firebase-admin");
const crypto = require("crypto");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
           "access-control-allow-origin": CORS_ORIGIN,
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

    const inboxId = String(payload.inboxId || "").trim();
    const sessionToken = String(payload.sessionToken || "").trim();
    const email = normalizeEmail(payload.email);

    if (!inboxId) return jsonResponse(400, { ok: false, error: "Missing inboxId" });
    if (!sessionToken) return jsonResponse(401, { ok: false, error: "Missing sessionToken" });
    if (!email || !email.includes("@")) return jsonResponse(400, { ok: false, error: "Invalid email" });

    // validate session
    const sessionHash = sha256Hex(sessionToken);
    const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return jsonResponse(401, { ok: false, error: "Invalid session" });

    const session = sessionSnap.data() || {};
    const exp = session.expiresAt;
    if (exp && exp.toDate && exp.toDate() < new Date()) {
      return jsonResponse(401, { ok: false, error: "Session expired" });
    }

    // create email index if not already taken
    const emailHash = sha256Hex(email);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(emailIndexRef);
      if (existing.exists) {
        const existingInboxId = existing.data()?.inboxId;
        // If same inbox, allow idempotent
        if (existingInboxId !== inboxId) {
          throw new Error("Email already linked to another inbox");
        }
      } else {
        tx.set(emailIndexRef, {
          inboxId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // store on inbox doc too
      tx.set(
        db.collection("inboxes").doc(inboxId),
        { email, emailLinkedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    });

    return jsonResponse(200, { ok: true, inboxId, email });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};