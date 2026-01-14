// public/js/auth.js
import { apiPost } from "./crypto.js";

const LS_SESSION = "sv_sessionToken"

const KEYS = {
  inboxId: "sv_inboxId",
  messages: "sv_messages",
  pinRequired: "sv_pinRequired",
};

export function getInboxId() {
  return localStorage.getItem(KEYS.inboxId);
}

export function setInboxId(inboxId) {
  localStorage.setItem(KEYS.inboxId, inboxId);
}

export function getSessionToken() {
  return localStorage.getItem(LS_SESSION);
}
export function setSessionToken(token) {
  if (!token) localStorage.removeItem(LS_SESSION);
  else localStorage.setItem(LS_SESSION, token);
}


export function clearLocalSession() {
  localStorage.removeItem(KEYS.inboxId);
  localStorage.removeItem(KEYS.messages);
  localStorage.removeItem(KEYS.pinRequired);
}

export function getCachedMessages() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.messages) || "[]");
  } catch {
    return [];
  }
}

export function setCachedMessages(messages) {
  localStorage.setItem(KEYS.messages, JSON.stringify(messages || []));
}

export function isPinRequired() {
  return localStorage.getItem(KEYS.pinRequired) === "1";
}

export function setPinRequired(flag) {
  localStorage.setItem(KEYS.pinRequired, flag ? "1" : "0");
}

// ---- Backend glue (Netlify functions) ----

export async function claimTokenAndCacheInbox(token) {
  const { res, data } = await apiPost("/.netlify/functions/openLink", { token });

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `openLink failed (${res.status})`);
  }

  setInboxId(data.inboxId);
  setPinRequired(!!data.pinRequired);
  setCachedMessages(data.messages || []);

  return data;
}

export async function sendMessage(payload) {
  const { res, data } = await apiPost("/.netlify/functions/sendMessage", payload);

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `sendMessage failed (${res.status})`);
  }

  return data; // { ok, inboxId, messageId, link }
}
