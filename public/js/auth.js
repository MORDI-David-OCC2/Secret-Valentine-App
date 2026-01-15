// public/js/auth.js
import { apiPost } from "./crypto.js";

const KEYS = {
  inboxId: "sv_inboxId",
  sessionToken: "sv_sessionToken",
  pinRequired: "sv_pinRequired",
  cachedMessages: "sv_cachedMessages",
};

export function getInboxId() {
  return localStorage.getItem(KEYS.inboxId);
}
export function setInboxId(inboxId) {
  if (!inboxId) localStorage.removeItem(KEYS.inboxId);
  else localStorage.setItem(KEYS.inboxId, inboxId);
}

export function getSessionToken() {
  return localStorage.getItem(KEYS.sessionToken);
}
export function setSessionToken(token) {
  if (!token) localStorage.removeItem(KEYS.sessionToken);
  else localStorage.setItem(KEYS.sessionToken, token);
}

export function isPinRequired() {
  return localStorage.getItem(KEYS.pinRequired) === "1";
}
export function setPinRequired(val) {
  localStorage.setItem(KEYS.pinRequired, val ? "1" : "0");
}

export function getCachedMessages() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.cachedMessages) || "[]");
  } catch {
    return [];
  }
}
export function setCachedMessages(messages) {
  localStorage.setItem(KEYS.cachedMessages, JSON.stringify(messages || []));
}

export function clearLocalSession() {
  localStorage.removeItem(KEYS.inboxId);
  localStorage.removeItem(KEYS.sessionToken);
  localStorage.removeItem(KEYS.pinRequired);
  localStorage.removeItem(KEYS.cachedMessages);
}

/**
 * Called when user clicks email link: #/inbox?t=TOKEN
 * Exchanges token -> inboxId (+ maybe pinRequired and maybe sessionToken if no PIN)
 */
export async function openEmailLink(token) {
  const { res, data } = await apiPost("/.netlify/functions/openLink", { token });

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `openLink failed (${res.status})`);
  }

  setInboxId(data.inboxId || null);
  setPinRequired(!!data.pinRequired);

  // If server gives a sessionToken (e.g., inbox has no PIN), store it.
  if (data.sessionToken) setSessionToken(data.sessionToken);

  // Never trust cached bodies when locked. We cache list previews only after listInbox.
  setCachedMessages([]);

  return data; // { ok, inboxId, pinRequired, sessionToken? }
}

export async function verifyPin(inboxId, pin) {
  const { res, data } = await apiPost("/.netlify/functions/verifyPin", {
    inboxId,
    pin,
    mode: "verify",
  });
  console.log("verifyPin response:", data);

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `verifyPin failed (${res.status})`);
  }

  if (data.sessionToken) setSessionToken(data.sessionToken);
  setPinRequired(true);

  return data; // { ok, verified:true, sessionToken }
}

export async function listInbox() {
  const inboxId = getInboxId();
  const sessionToken = getSessionToken();

  if (!inboxId) throw new Error("No inbox selected.");
  const { res, data } = await apiPost("/.netlify/functions/listInbox", {
    inboxId,
    sessionToken,
  });

  if (!res.ok || !data.ok) {
    // If server says locked, update flag
    if (data.pinRequired) setPinRequired(true);
    throw new Error(data.error || `listInbox failed (${res.status})`);
  }

  setCachedMessages(data.messages || []);
  setPinRequired(!!data.pinRequired);

  return data; // { ok, messages, pinRequired }
}


export async function getMessageById(messageId) {
  const inboxId = getInboxId();
  if (!inboxId) throw new Error("Not connected (missing inboxId)");
  if (!messageId) throw new Error("Missing messageId");

  const sessionToken = getSessionToken() || null;

  const res = await apiPost("/.netlify/functions/getMessage", {
    inboxId,
    messageId,
    sessionToken,
  });

  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load message");

  // ✅ Backend returns { message, replies }
  return data;
}

export async function setPin(newPinOrNull) {
  const inboxId = getInboxId();
  const sessionToken = getSessionToken();
  if (!inboxId) throw new Error("No inbox selected.");

  const { res, data } = await apiPost("/.netlify/functions/setPin", {
    inboxId,
    pin: newPinOrNull, // string or null to remove
    sessionToken: sessionToken || null,
  });

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `setPin failed (${res.status})`);
  }

  return data;
}

export async function sendMessage(payload) {
  const { res, data } = await apiPost("/.netlify/functions/sendMessage", payload);

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `sendMessage failed (${res.status})`);
  }

  return data;
}

export async function sendReply(inboxId, messageId, body) {
  const sessionToken = getSessionToken();
  return apiPost("/.netlify/functions/sendReply", {
    inboxId,
    messageId,
    body,
    sessionToken,
  });
}