const admin = require("firebase-admin");
const crypto = require("crypto");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { PIN_REGEX } = require('./utils/pinPolicy');
const { PIN_LABEL } = require('./utils/pinPolicy');

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

function pbkdf2Hash(password, saltHex, iterations = 150000) {
  const salt = Buffer.from(saltHex, "hex");
  const dk = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256");
  return dk.toString("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return email.includes("@") && email.includes(".");
}

async function revokeAllSessions(db, inboxId) {
  const sessionRef = db.collection("inboxes").doc(inboxId).collection("sessions");
  const snap = await sessionRef.get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
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

async function linkInboxToEmail(db, inboxId, email) {
  const norm = normalizeEmail(email);
  if (!norm) return;
  if (!isValidEmail(norm)) throw new Error("Invalid email");

  const emailHash = sha256Hex(norm);
  const emailIndexRef = db.collection("emailIndex").doc(emailHash);
  const emailIndexSnap = await emailIndexRef.get();

  // Si l’email est déjà lié à un autre inbox => conflit
  if (emailIndexSnap.exists) {
    const existing = emailIndexSnap.data() || {};
    if (existing.inboxId && existing.inboxId !== inboxId) {
      throw new Error("Email already linked to another inbox");
    }
  }

  const batch = db.batch();

  batch.set(
    emailIndexRef,
    {
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(
    db.collection("inboxes").doc(inboxId),
    {
      linkedEmailHash: emailHash,
      linkedEmailAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
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
    const pin = payload.pin; // string or null
    const sessionToken = String(payload.sessionToken || "").trim() || null;

    // NEW: optional email association (share/instagram flows)
    const emailToLink = normalizeEmail(payload.email);

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });

    const inboxRef = db.collection("inboxes").doc(inboxId);
    const inboxSnap = await inboxRef.get();
    if (!inboxSnap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = inboxSnap.data() || {};
    const hasPin = !!(d.passHash && d.passSalt && d.passIter);

    // If Password already exists, require valid session to change/remove it (reset link will provide session)
    if (hasPin) {
      const ok = await requireValidSession(db, inboxId, sessionToken);
      if (!ok) return jsonResponse(401, { ok: false, error: "Unlock inbox first (Password required)." });
    }

    // Remove PIN
    if (pin === null) {
      await inboxRef.set(
        {
          passHash: null,
          passSalt: null,
          passIter: null,
          passSetAt: null,
        },
        { merge: true }
      );
      await revokeAllSessions(db, inboxId);
      return jsonResponse(200, { ok: true, removed: true });
    }

    // Set / change PIN
    const pinStr = String(pin || "").trim();
    if (!PIN_REGEX.test(pin)) return jsonResponse(400, { ok: false, error: PIN_LABEL });

    const saltHex = crypto.randomBytes(16).toString("hex");
    const iterations = 150000;
    const passHash = pbkdf2Hash(pinStr, saltHex, iterations);

    await inboxRef.set(
      {
        passHash,
        passSalt: saltHex,
        passIter: iterations,
        passSetAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Link email (optional)
    if (emailToLink) {
      await linkInboxToEmail(db, inboxId, emailToLink);
    }

    await revokeAllSessions(db, inboxId);

    return jsonResponse(200, { ok: true, updated: true, linkedEmail: !!emailToLink });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};