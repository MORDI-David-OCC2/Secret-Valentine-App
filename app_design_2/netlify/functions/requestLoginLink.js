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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function isValidEmail(email) {
  return email.includes("@") && email.includes(".");
}
function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}
function randomTokenBase64Url(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function buildBaseUrl(event) {
  const env = process.env.URL_DE_BASE;
  if (env) return String(env).replace(/\/+$/, "");

  const proto = event.headers["x-forwarded-proto"] || "https";
  let host = event.headers["x-forwarded-host"] || event.headers.host || "";
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host = host + ".app";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.API_EMAIL_KEY;
  const from = process.env.EMAIL_VALENTINE;
  if (!apiKey) throw new Error("Missing API_EMAIL_KEY env var");
  if (!from) throw new Error("Missing EMAIL_VALENTINE env var");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

function simpleLoginEmailHtml(link) {
  const safe = String(link).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html><html><body style="font-family:Arial;background:#fff5f8;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:22px;border:1px solid #f0c3d4">
    <h2 style="margin:0 0 10px;color:#7a1a45;">Your Secret Valentine inbox link 💌</h2>
    <p style="margin:0 0 16px;color:#5a2d42;">Click the button below to open your inbox.</p>
    <p><a href="${safe}" style="display:inline-block;background:#7a1a45;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;">Open my inbox</a></p>
    <p style="margin-top:16px;color:#9e6b80;font-size:12px;">Link valid for 7 days.</p>
  </div></body></html>`;
}

async function getOrCreateInboxIdForEmail(db, email) {
  const emailHash = sha256Hex(email);
  const emailIndexRef = db.collection("emailIndex").doc(emailHash);
  const emailIndexSnap = await emailIndexRef.get();

  if (emailIndexSnap.exists) return emailIndexSnap.data().inboxId;

  const inboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
  const inboxRef = db.collection("inboxes").doc(inboxId);

  const batch = db.batch();
  batch.set(inboxRef, {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    pinHash: null,
    pinSalt: null,
    pinIter: null,
    pinSetAt: null,
    linkedEmailHash: emailHash,
    linkedEmail: email,
    linkedEmailAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(emailIndexRef, {
    inboxId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
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

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const email = normalizeEmail(payload.email);
    if (!email || !isValidEmail(email)) return jsonResponse(400, { ok: false, error: "Invalid email" });

    const inboxId = await getOrCreateInboxIdForEmail(db, email);

    const inboxSnap = await db.collection("inboxes").doc(inboxId).get();
    const inbox = inboxSnap.data() || {};
    const hasPin = !!(inbox.pinHash && inbox.pinSalt && inbox.pinIter);

    // ✅ Si un PIN existe: on NE renvoie PAS de lien ici
    if (hasPin) {
      return jsonResponse(200, { ok: true, action: "PIN_REQUIRED", inboxId });
    }

    // ✅ Si pas de PIN: on envoie un lien d’accès
    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);

    const expiresDays = 7;
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000));

    await db.collection("tokens").doc(tokenHash).set({
      inboxId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      purpose: "open",
    });

    const baseUrl = buildBaseUrl(event);
    const link = `${baseUrl}/#/inbox?t=${encodeURIComponent(token)}`;

    await sendWithResend({
      to: email,
      subject: "💌 Your Secret Valentine inbox link",
      html: simpleLoginEmailHtml(link),
    });

    return jsonResponse(200, { ok: true, action: "LINK_SENT" });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};