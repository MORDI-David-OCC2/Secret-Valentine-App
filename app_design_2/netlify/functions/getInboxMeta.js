// netlify/functions/getInboxMeta.js
const { getDb, admin } = require("./utils/admin");
const crypto = require("crypto");
const { rateLimit } = require("./rateLimit");
const { CORS_ORIGIN } = require('./utils/pinPolicy');
const { jsonResponse, optionsResponse, parseBody } = require("./utils/response");
const { sha256Hex, getClientIp, randomTokenBase64Url, requireValidSession, revokeAllSessions } = require("./utils/auth");

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }
    if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Use POST" });

    const db = getDb();

    const ip = getClientIp(event);
    const { allowed } = await rateLimit(db, { action: "getInboxMeta", key: ip, limit: 60, windowSec: 60 });
    if (!allowed) return jsonResponse(429, { ok: false, error: "Too many requests" });

    const payload = parseBody(event);
    if (!payload) return jsonResponse(400, { ok: false, error: "Invalid JSON body" });

    const inboxId = String(payload.inboxId || "").trim();
    const sessionToken = payload.sessionToken ? String(payload.sessionToken).trim() : null;

    if (!inboxId.startsWith("inbox_")) return jsonResponse(400, { ok: false, error: "Invalid inboxId" });

    const okSession = await requireValidSession(db, inboxId, sessionToken);
    if (!okSession) return jsonResponse(401, { ok: false, error: "Unauthorized" });

    const inboxSnap = await db.collection("inboxes").doc(inboxId).get();
    if (!inboxSnap.exists) return jsonResponse(404, { ok: false, error: "Inbox not found" });

    const d = inboxSnap.data() || {};
    const pinRequired = !(d.passHash && d.passSalt && d.passIter);

    return jsonResponse(200, {
      ok: true,
      inboxId,
      pinRequired,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { ok: false, error: err.message || "Server error" });
  }
};