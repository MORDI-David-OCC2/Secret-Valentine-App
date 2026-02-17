// netlify/functions/verifyPin.js
const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { ensureInboxCrypto, storeInboxKeyInSession, getInboxKeyViaRecovery } = require("./cryptageInbox");

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

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"];
  if (xf) return String(xf).split(",")[0].trim();
  return event.headers["client-ip"] || event.headers["x-real-ip"] || "unknown";
}

function pbkdf2Hash(pin, saltHex, iterations = 150000) {
  const salt = Buffer.from(String(saltHex || ""), "hex");
  const dk = crypto.pbkdf2Sync(String(pin), salt, iterations, 32, "sha256");
  return dk.toString("base64");
}

function timingSafeEqualHex(a, b) {
  const ba = Buffer.from(String(a || ""), "hex");
  const bb = Buffer.from(String(b || ""), "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

async function resolveInboxIdFromToken(db, token) {
  const tokenHash = sha256Hex(token);
  const tokenRef = db.collection("tokens").doc(tokenHash);
  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) return null;

  const tokenData = tokenSnap.data() || {};
  const inboxId = String(tokenData.inboxId || "").trim();
  if (!inboxId.startsWith("inbox_")) return null;

  // Optionnel: vérifier expiration si présente
  const expiresAt = tokenData.expiresAt;
  if (expiresAt && typeof expiresAt.toDate === "function") {
    if (expiresAt.toDate().getTime() < Date.now()) return null;
  }

  return inboxId;
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

    const ip = getClientIp(event);
    const rl = await rateLimit(db, { action: "verifyPin", key: ip, limit: 15, windowSec: 60 });
    if (!rl.allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    let payload;
    console.log(payload);
    try {
      payload = JSON.parse(event.body || ",");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    // ✅ accepte plusieurs clés côté client (au cas où)
    let inboxId =
      String(payload.inboxId || payload.inbox_id || payload?.session?.inboxId || "").trim();

    const token = String(payload.token || "").trim(); // ✅ NEW: allow passing link token
    const pin = String(payload.pin || "").trim();
    const mode = String(payload.mode || "verify").trim();

    if (mode !== "verify") return jsonResponse(400, { ok: false, error: "Invalid mode" });
    if (!/^\d{4,8}$/.test(pin)) return jsonResponse(400, { ok: false, error: "PIN must be 4–8 digits" });

    // ✅ if inboxId missing, try resolving from token
    if (!inboxId && token) {
      const resolved = await resolveInboxIdFromToken(db, token);
      if (resolved) inboxId = resolved;
    }

    // ✅ clearer error when missing
    if (!inboxId) {
      return jsonResponse(400, { ok: false, error: "Missing inboxId (or token)" });
    }

    if (!inboxId.startsWith("inbox_")) {
      return jsonResponse(400, { ok: false, error: "Invalid inboxId format" });
    }

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const snap = await inboxRef.get();
    if (!snap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = snap.data() || {};

    // If no PIN configured => treat as already unlocked (rare, but safe)
    if (!d.passHash || !d.passSalt || !d.passIter) {
      // Create a session anyway so the client can proceed normally
      const sessionToken = randomTokenBase64Url(32);
      const sessionHash = sha256Hex(sessionToken);
      const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      await inboxRef.collection("sessions").doc(sessionHash).set({
        inboxId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        purpose: "unlocked_no_pin",
      });

      await ensureInboxCrypto(db, inboxId);
      const inboxKey = await getInboxKeyViaRecovery(db, inboxId);
      await storeInboxKeyInSession(db, inboxId, sessionToken, inboxKey);

      return jsonResponse(200, { ok: true, verified: true, pinRequired: false, inboxId, sessionToken });
    }

    const computed = pbkdf2Hash(pin, d.passSalt, d.passIter);
    const ok = timingSafeEqualHex(computed, d.passHash);
    console.log(d.passIter);
    console.log(d.passHash);
    console.log(computed);
    if (!ok) return jsonResponse(401, { ok: false, error: "Incorrect PIN", pinRequired: true });

    // Create unlock session token
    const sessionToken = randomTokenBase64Url(32);
    const sessionHash = sha256Hex(sessionToken);

    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    await inboxRef.collection("sessions").doc(sessionHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      purpose: "unlock",
    });

    // --- Encryption bootstrap + attach inboxKeyEnc to session ---
    await ensureInboxCrypto(db, inboxId);
    const inboxKey = await getInboxKeyViaRecovery(db, inboxId);
    await storeInboxKeyInSession(db, inboxId, sessionToken, inboxKey);

    return jsonResponse(200, { ok: true, verified: true, pinRequired: true, inboxId, sessionToken });
  } catch (err) {
    console.error(err);
    const status = err?.code && Number.isInteger(err.code) ? err.code : 500;
    return jsonResponse(status, { ok: false, error: err.message || "Server error" });
  }
};