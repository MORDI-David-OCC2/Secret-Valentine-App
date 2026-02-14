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
export async function claimPending(email: string): Promise<ClaimPendingResponse> {
  return postJSON("claimPending", { email });
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
export async function openLink(token: string): Promise<OpenLinkResponse> {
  return postJSON("openLink", { token });
}

// ---------------- VERIFY PIN ----------------
export interface VerifyPinResponse {
  ok: true;
  verified: boolean;
  pinRequired: boolean;
  sessionToken: string | null;
}
export async function verifyPin(inboxId: string, pin: string): Promise<VerifyPinResponse> {
  return postJSON("verifyPin", { inboxId, pin, mode: "verify" });
}

// ---------------- SET PIN ----------------
export interface SetPinResponse {
  ok: true;
  updated?: boolean;
  removed?: boolean;
}
export async function setPin(inboxId: string, pin: string | null, sessionToken: string): Promise<SetPinResponse> {
  return postJSON("setPin", { inboxId, pin, sessionToken });
}

// ---------------- CLAIM EMAIL ----------------
export async function claimEmail(args: { inboxId: string; sessionToken: string; email: string }) {
  return postJSON<{ ok: true }>("claimEmail", args);
}

// ---------------- LIST INBOX ----------------
export interface InboxMessage {
  id: string;
  createdAt: number;
  fromName: string;
  type: "love" | "friendship" | "family" | "crush";
  stickerId?: string;
  body: string; // preview
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
export async function listInbox(inboxId: string, sessionToken: string): Promise<ListInboxResponse> {
  return postJSON("listInbox", { inboxId, sessionToken });
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
export async function getMessage(inboxId: string, messageId: string, sessionToken: string): Promise<GetMessageResponse> {
  return postJSON("getMessage", { inboxId, messageId, sessionToken });
}

// ---------------- SEND REPLY ----------------
export interface SendReplyResponse {
  ok: true;
  replyId: string;
}
export async function sendReply(args: { inboxId: string; messageId: string; body: string; sessionToken: string }) {
  return postJSON<SendReplyResponse>("sendReply", args);
}

// ---------------- SEND MESSAGE ----------------
export type DeliveryMode = "email" | "share" | "instagram";

export interface SendMessageRequest {
  deliveryMode: DeliveryMode;
  toEmail?: string;
  instaHandle?: string;

  fromName: string;
  fromEmail?: string;
  replyAllowed?: boolean;

  type: "love" | "friendship" | "family" | "crush";
  stickerId?: string;
  body: string;

  // optional extras
  instagramHandle?: string;
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

export async function sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
  return postJSON("sendMessage", data);
}

// ---------------- PUSH SUB ----------------
export async function savePushSub(params: { inboxId: string; sessionToken: string; subscription: PushSubscription }) {
  return postJSON("savePushSub", params);
}

// ---------------- LOGIN BY EMAIL / PIN RESET ----------------
export type RequestLoginLinkResponse =
  | { ok: true; action: "LINK_SENT" }
  | { ok: true; action: "PIN_REQUIRED"; inboxId: string };

export async function requestLoginLink(email: string): Promise<RequestLoginLinkResponse> {
  return postJSON("requestLoginLink", { email });
}

export async function requestPinReset(email: string): Promise<{ ok: true }> {
  return postJSON("requestPinReset", { email });
}

// ---------------- UNLOCK (wrapper) ----------------
export async function unlockInboxWithPin(inboxId: string, pin: string): Promise<{ ok: true; inboxId: string; sessionToken: string }> {
  const res = await verifyPin(inboxId, pin);
  if (!res?.sessionToken) throw new Error("No session token");
  return { ok: true, inboxId, sessionToken: res.sessionToken };
}

// ---------------- IMPORT LINK INTO CURRENT INBOX ----------------
export interface ImportLinkToInboxRequest {
  token: string;
  destInboxId: string;
  destSessionToken: string;
}

export interface ImportLinkToInboxResponse {
  ok: true;
  importedMessageId: string;
}

export async function importLinkToInbox(args: ImportLinkToInboxRequest): Promise<ImportLinkToInboxResponse> {
  return postJSON("importLinkToInbox", args);
}