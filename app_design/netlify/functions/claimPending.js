const admin = require("firebase-admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");

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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function getClientIp(event) {
  const xf = event.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return event.headers["client-ip"] || "unknown";
}

function buildBaseUrl(event) {
  const proto = event.headers["x-forwarded-proto"] || "https";
  let host = event.headers["x-forwarded-host"] || event.headers.host || "";
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host = host + ".app";
  return process.env.APP_BASE_URL || `${proto}://${host}`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    }, body: "" };

    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    initAdmin();
    const db = admin.firestore();

    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, {
      action: "claimPending",
      key: ip,
      limit: 5,
      windowSec: 60,
    });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many attempts. Try again later." });

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body" }); }

    const email = normalizeEmail(payload.email);
    if (!email || !email.includes("@")) return jsonResponse(400, { ok: false, error: "Invalid email" });

    const emailHash = sha256Hex(email);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);
    const emailIndexSnap = await emailIndexRef.get();

    let inboxId;

    if (emailIndexSnap.exists) {
      inboxId = emailIndexSnap.data().inboxId;
    } else {
      inboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
      const inboxRef = db.collection("inboxes").doc(inboxId);

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

    // Create claim token (store only hash)
    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);

    const expiresDays = 7; // claim links can be shorter-lived
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
    );

    await db.collection("tokens").doc(tokenHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      purpose: "open",
    });

    const baseUrl = buildBaseUrl(event);
    const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

    // Later: send email with link here.
    await sendWithResend({ to: email, subject: "Open your inbox", html: claimEmailHtml({ link }) });
    return jsonResponse(200, { ok: true, inboxId, emailed: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};