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

// ---------------- CLAIM PENDING (legacy) ----------------
export interface ClaimPendingResponse {
  ok: true;
  inboxId: string;
  emailed: boolean;
}
export function claimPending(email: string) {
  return postJSON<ClaimPendingResponse>("claimPending", { email });
}

// ---------------- OPEN LINK ----------------
export interface OpenLinkResponse {
  ok: true;
  inboxId: string;
  pinRequired: boolean;
  pinMustBeCreated: boolean;
  sessionToken: string | null;
  needsEmailAssociation: boolean;
  isPinReset?: boolean;
}
export function openLink(token: string) {
  return postJSON<OpenLinkResponse>("openLink", { token });
}

// ---------------- VERIFY PIN ----------------
export interface VerifyPinResponse {
  ok: true;
  verified: boolean;
  pinRequired: boolean;
  sessionToken: string | null;
}
export function verifyPin(inboxId: string, pin: string) {
  return postJSON<VerifyPinResponse>("verifyPin", { inboxId, pin, mode: "verify" });
}

export async function unlockInboxWithPin(
  inboxIdOrParams: string | { inboxId: string; pin: string },
  maybePin?: string
): Promise<{ ok: true; sessionToken: string }> {
  const payload =
    typeof inboxIdOrParams === "string"
      ? { inboxId: inboxIdOrParams, pin: String(maybePin || "") }
      : inboxIdOrParams;

  return postJSON("unlockInboxWithPin", payload);
}

// ---------------- SET PIN ----------------
export interface SetPinResponse {
  ok: true;
  updated?: boolean;
  removed?: boolean;
}
export function setPin(inboxId: string, pin: string | null, sessionToken: string) {
  return postJSON<SetPinResponse>("setPin", { inboxId, pin, sessionToken });
}

// ---------------- CLAIM EMAIL ----------------
export function claimEmail(args: { inboxId: string; sessionToken: string; email: string }) {
  return postJSON<{ ok: true }>("claimEmail", args);
}

// ---------------- LIST INBOX ----------------
export interface InboxMessage {
  id: string;
  createdAt: number;
  fromName: string;
  type: "love" | "friendship" | "family" | "crush";
  stickerId?: string;
  body: string;
  unread: boolean;
  lastActiveAt: number;
  replyEnabled: boolean;
}

export interface ListInboxResponse {
  ok: true;
  pinRequired: boolean;
  unreadCount: number;
  messages: InboxMessage[];
}
export function listInbox(inboxId: string, sessionToken: string) {
  return postJSON<ListInboxResponse>("listInbox", { inboxId, sessionToken });
}

// ---------------- GET MESSAGE ----------------
export interface MessageReply {
  id: string;
  body: string;
  from: "them" | "me";
  createdAt: number;
}
export interface MessageDetail {
  id: string;
  fromName: string;
  type: "love" | "friendship" | "family" | "crush";
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
export function getMessage(inboxId: string, messageId: string, sessionToken: string) {
  return postJSON<GetMessageResponse>("getMessage", { inboxId, messageId, sessionToken });
}

// ---------------- SEND MESSAGE ----------------
export type DeliveryMode = "email" | "share" | "instagram";

export interface SendMessageRequest {
  deliveryMode: DeliveryMode;
  toEmail?: string;
  instagramHandle?: string;
  fromName: string;
  fromEmail?: string;
  replyAllowed?: boolean;
  type: "love" | "friendship" | "family" | "crush";
  stickerId?: string;
  body: string;
  toNameHint?: string;
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
export function sendMessage(data: SendMessageRequest) {
  return postJSON<SendMessageResponse>("sendMessage", data);
}

// ---------------- SEND REPLY ----------------
export function sendReply(args: { inboxId: string; messageId: string; body: string; sessionToken: string }) {
  return postJSON<{ ok: true; replyId: string }>("sendReply", args);
}

// ---------------- PUSH ----------------
export function savePushSub(params: { inboxId: string; sessionToken: string; subscription: PushSubscription }) {
  return postJSON("savePushSub", params);
}

// ---------------- LOGIN / RESET ----------------
export type RequestLoginLinkResponse =
  | { ok: true; action: "LINK_SENT" }
  | { ok: true; action: "PIN_REQUIRED"; inboxId: string };

export function requestLoginLink(email: string) {
  return postJSON<RequestLoginLinkResponse>("requestLoginLink", { email });
}

export function requestPinReset(email: string) {
  return postJSON<{ ok: true }>("requestPinReset", { email });
}