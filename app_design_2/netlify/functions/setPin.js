const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { PIN_REGEX } = require('./utils/pinPolicy');
const { PIN_LABEL } = require('./utils/pinPolicy');
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, requireValidSession, revokeAllSessions } = require("./utils/auth");
const { pbkdf2Hash } = require("./utils/pinCrypto");


function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return email.includes("@") && email.includes(".");
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
      return optionsResponse();
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    const db = getDb();

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

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