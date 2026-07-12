const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url } = require("./utils/auth");
const { sendWithResend } = require("./utils/email");


function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function buildBaseUrl(event) {
  // Prefer explicit env vars (support both names)
  const envBase =
    process.env.APP_BASE_URL ||
    process.env.URL_DE_BASE ||
    process.env.URL_BASE ||
    "";

  if (envBase) return String(envBase).replace(/\/+$/, "");

  const headers = event.headers || {};
  const proto = h["x-forwarded-proto"] || "https";
  let host = headers["x-forwarded-host"] || headers["host"] || "";

  // Netlify sometimes gives *.netlify (no .app)
  if (host.endsWith(".netlify") && !host.endsWith(".netlify.app")) host += ".app";

  return `${proto}://${host}`.replace(/\/+$/, "");
}

function claimEmailHtml({ link }) {
  // Simple, reliable HTML template (no external deps)
  const safeLink = String(link);
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px">Open your inbox</h2>
    <p style="margin:0 0 16px">Click the button below to open your inbox securely.</p>
    <p style="margin:0 0 20px">
      <a href="${safeLink}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111;color:#fff;text-decoration:none">
        Open inbox
      </a>
    </p>
    <p style="margin:0 0 6px;color:#444;font-size:13px">If the button doesn’t work, copy/paste this link:</p>
    <p style="margin:0;color:#444;font-size:13px;word-break:break-all">${safeLink}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />
    <p style="margin:0;color:#777;font-size:12px">This link expires in 7 days.</p>
  </div>`;
}

// ---------- handler ----------
exports.handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }
    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Use POST" });
    }

    const db = getDb();

    // Rate limit by IP
    const ip = getClientIp(event);
    const { allowed, remaining, resetAt } = await rateLimit(db, {
      action: "claimPending",
      key: ip,
      limit: 5,
      windowSec: 60,
    });

    if (!allowed) {
      return jsonResponse(429, {
        ok: false,
        error: "Too many attempts. Try again later.",
        remaining,
        resetAt: resetAt?.toMillis ? resetAt.toMillis() : undefined,
      });
    }

    // Parse body
    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    const email = normalizeEmail(payload.email);
    if (!email || !email.includes("@")) {
      return jsonResponse(400, { ok: false, error: "Invalid email" });
    }

    const emailHash = sha256Hex(email);
    const emailIndexRef = db.collection("emailIndex").doc(emailHash);

    // Use a transaction to avoid race conditions (two inboxes for same email)
    const inboxId = await db.runTransaction(async (tx) => {
      const emailIndexSnap = await tx.get(emailIndexRef);
      if (emailIndexSnap.exists) {
        const data = emailIndexSnap.data() || {};
        if (data.inboxId) return data.inboxId;
      }

      const newInboxId = "inbox_" + crypto.randomBytes(9).toString("hex");
      const inboxRef = db.collection("inboxes").doc(newInboxId);

      tx.set(inboxRef, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        pinHash: null,
        pinSetAt: null,
      });

      tx.set(emailIndexRef, {
        inboxId: newInboxId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return newInboxId;
    });

    // Create open token (store only hash)
    const token = randomTokenBase64Url(32);
    const tokenHash = sha256Hex(token);

    const expiresDays = 7;
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

    await sendWithResend({
      to: email,
      subject: "Open your inbox",
      html: claimEmailHtml({ link }),
    });

    return jsonResponse(200, { ok: true, inboxId, emailed: true });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};