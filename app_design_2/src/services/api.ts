/**
 * Service API pour communiquer avec les Netlify Functions
 * Gère tous les appels aux endpoints backend
 */

const API_BASE = '/.netlify/functions';

// Types pour les réponses API
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: number;
}

// ================== CLAIM PENDING (Réclamer inbox via email) ==================
export interface ClaimPendingRequest {
  email: string;
}

export interface ClaimPendingResponse {
  ok: true;
  inboxId: string;
  emailed: boolean;
}

export async function claimPending(email: string): Promise<ClaimPendingResponse> {
  const response = await fetch(`${API_BASE}/claimPending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ================== OPEN LINK ==================
export interface OpenLinkRequest {
  token: string;
}

export interface OpenLinkResponse {
  ok: true;
  inboxId: string;
  pinRequired: boolean;
  pinMustBeCreated: boolean;
  sessionToken: string | null;
  needsEmailAssociation: boolean;
}

export async function openLink(token: string): Promise<OpenLinkResponse> {
  const response = await fetch(`${API_BASE}/openLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ================== VERIFY PIN ==================
export interface VerifyPinRequest {
  inboxId: string;
  pin: string;
  mode: 'verify';
}

export interface VerifyPinResponse {
  ok: true;
  verified: boolean;
  pinRequired: boolean;
  sessionToken: string | null;
}

export async function verifyPin(
  inboxId: string,
  pin: string
): Promise<VerifyPinResponse> {
  const response = await fetch(`${API_BASE}/verifyPin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inboxId, pin, mode: 'verify' })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'PIN incorrect');
  }

  return response.json();
}

// ================== SET PIN ==================
export interface SetPinRequest {
  inboxId: string;
  pin: string | null;
  sessionToken: string;
}

export interface SetPinResponse {
  ok: true;
  updated?: boolean;
  removed?: boolean;
}

export async function setPin(
  inboxId: string,
  pin: string | null,
  sessionToken: string
): Promise<SetPinResponse> {
  const response = await fetch(`${API_BASE}/setPin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inboxId, pin, sessionToken })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to set PIN');
  }

  return response.json();
}

// ================== LIST INBOX ==================
export interface InboxMessage {
  id: string;
  createdAt: number;
  fromName: string;
  type: 'love' | 'friendship' | 'family' | 'crush';
  stickerId?: string;
  body: string; // preview
  unread: boolean;
  lastActiveAt: number;
  replyEnabled: boolean;
}

export interface ListInboxResponse {
  ok: true;
  pinRequired: boolean;
  unreadCount: number;      // ✅ NEW
  messages: InboxMessage[];
}

export async function listInbox(
  inboxId: string,
  sessionToken: string
): Promise<ListInboxResponse> {
  const response = await fetch(`${API_BASE}/listInbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inboxId, sessionToken })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load inbox');
  }

  return response.json();
}

// ================== GET MESSAGE ==================
export interface MessageReply {
  id: string;
  body: string;
  from: 'them' | 'me';
  createdAt: number;
}

export interface MessageDetail {
  id: string;
  fromName: string;
  type: 'love' | 'friendship' | 'family' | 'crush';
  stickerId?: string;
  body: string;
  unread: boolean;
  replyEnabled: boolean;
  createdAt: number;
}

export interface GetMessageResponse {
  ok: true;
  message: MessageDetail;
  replies: MessageReply[];
}

export async function getMessage(
  inboxId: string,
  messageId: string,
  sessionToken: string
): Promise<GetMessageResponse> {
  const response = await fetch(`${API_BASE}/getMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inboxId, messageId, sessionToken })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load message');
  }

  return response.json();
}

// ================== SEND MESSAGE ==================
export type DeliveryMode = "email" | "share" | "instagram";

export interface SendMessageRequest {
  deliveryMode: DeliveryMode;

  // required only if deliveryMode === "email"
  toEmail?: string;

  // required only if deliveryMode === "instagram"
  instaHandle?: string;

  fromName: string;
  fromEmail?: string;
  replyAllowed?: boolean;

  type: "love" | "friendship" | "family" | "crush";
  stickerId?: string;
  body: string;
}

export interface SendMessageResponse {
  ok: true;
  inboxId: string;
  messageId: string;
  deliveryMode: DeliveryMode;
  link: string;

  emailed: boolean;
  relayedToAdmin?: boolean;
  push?: { ok: boolean; reason?: string; sent?: number; removed?: number };

  quarantined?: boolean;
  moderationStatus?: "allow" | "quarantine" | "block";
}

export async function sendMessage(
  data: SendMessageRequest
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

// ================== SEND REPLY ==================
export interface SendReplyRequest {
  inboxId: string;
  messageId: string;
  body: string;
  sessionToken: string;
}

export interface SendReplyResponse {
  ok: true;
  replyId: string;
}

export async function sendReply(
  data: SendReplyRequest
): Promise<SendReplyResponse> {
  const response = await fetch(`${API_BASE}/sendReply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to send reply");
  }

  return response.json();
}

export async function savePushSub(params: {
  inboxId: string;
  sessionToken: string;
  subscription: PushSubscription;
}) {
  const response = await fetch(`${API_BASE}/savePushSub`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function claimEmail(args: { inboxId: string; sessionToken: string; email: string }) {
  const res = await fetch("/.netlify/functions/claimEmail", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "claimEmail failed");
  return data;
}

export async function requestLoginLink(email: string): Promise<{ ok: true; action: "LINK_SENT" } | { ok: true; action: "PIN_REQUIRED"; inboxId: string }> {
  const res = await fetch("/.netlify/functions/requestLoginLink", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed");
  return data;
}

export async function requestPinReset(email: string): Promise<{ ok: true; action: "RESET_SENT" }> {
  const res = await fetch("/.netlify/functions/requestPinReset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed");
  return data;
}

// src/services/api.ts

const FN_BASE =
  (import.meta as any).env?.DEV
    ? "http://localhost:8888/.netlify/functions"
    : "/.netlify/functions";

async function postJSON<T>(fnName: string, body: any): Promise<T> {
  const res = await fetch(`${FN_BASE}/${fnName}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

/** ✅ 1) Unlock with PIN (needed by ClaimInboxPage import) */
export async function unlockInboxWithPin(params: {
  inboxId: string;
  pin: string;
}): Promise<{ ok: true; inboxId: string; sessionToken: string }> {
  return postJSON("unlockInboxWithPin", params);
}

/** ✅ 2) Request a login link by email */
export async function requestLoginLink(email: string): Promise<{ ok: true }> {
  return postJSON("requestLoginLink", { email });
}

/** ✅ 3) Request a PIN reset link by email */
export async function requestPinReset(email: string): Promise<{ ok: true }> {
  return postJSON("requestPinReset", { email });
}
