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

function pbkdf2Hash(pin, saltHex, iterations = 120000) {
  const salt = Buffer.from(saltHex, "hex");
  const dk = crypto.pbkdf2Sync(String(pin), salt, iterations, 32, "sha256");
  return dk.toString("hex");
}

async function requireValidSession(db, inboxId, sessionToken) {
  if (!sessionToken) return false;
  const sessionHash = sha256Hex(sessionToken);
  const ref = db.collection("inboxes").doc(inboxId).collection("sessions").doc(sessionHash);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const d = snap.data() || {};
  if (!d.expiresAt || !d.expiresAt.toDate) return false;
  return d.expiresAt.toDate() > new Date();
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      }, body: "" };
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body" }); }

    const inboxId = String(payload.inboxId || "").trim();
    const pin = payload.pin; // string or null
    const sessionToken = String(payload.sessionToken || "").trim() || null;

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = inboxSnap.data() || {};
    const hasPin = !!(d.pinHash && d.pinSalt && d.pinIter);

    // If PIN already exists, require valid session to change/remove it
    if (hasPin) {
      const ok = await requireValidSession(db, inboxId, sessionToken);
      if (!ok) return jsonResponse(401, { ok: false, error: "Unlock inbox first (PIN required)." });
    }

    // Remove PIN
    if (pin === null) {
      await inboxRef.set({
        pinHash: null,
        pinSalt: null,
        pinIter: null,
        pinSetAt: null,
      }, { merge: true });

      return jsonResponse(200, { ok: true, removed: true });
    }

    // Set / change PIN
    const pinStr = String(pin || "").trim();
    if (!/^\d{4,8}$/.test(pinStr)) return jsonResponse(400, { ok: false, error: "PIN must be 4–8 digits" });

    const saltHex = crypto.randomBytes(16).toString("hex");
    const iterations = 120000;
    const pinHash = pbkdf2Hash(pinStr, saltHex, iterations);

    await inboxRef.set({
      pinHash,
      pinSalt: saltHex,
      pinIter: iterations,
      pinSetAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return jsonResponse(200, { ok: true, updated: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};