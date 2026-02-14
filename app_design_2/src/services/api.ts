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
export function claimPending(email: string): Promise<ClaimPendingResponse> {
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
export function openLink(token: string): Promise<OpenLinkResponse> {
  return postJSON("openLink", { token });
}

// ---------------- VERIFY PIN ----------------
// ton backend verifyPin peut exister ou non.
// Si tu n'as pas verifyPin côté backend, utilise unlockInboxWithPin uniquement.
export interface VerifyPinResponse {
  ok: true;
  verified: boolean;
  pinRequired: boolean;
  sessionToken: string | null;
}
export function verifyPin(inboxId: string, pin: string): Promise<VerifyPinResponse> {
  return postJSON("verifyPin", { inboxId, pin, mode: "verify" });
}

// ---------------- UNLOCK WITH PIN ----------------
export interface UnlockInboxWithPinResponse {
  ok: true;
  sessionToken: string;
}
export function unlockInboxWithPin(args: { inboxId: string; pin: string }): Promise<UnlockInboxWithPinResponse> {
  return postJSON("unlockInboxWithPin", args);
}

// ---------------- SET PIN ----------------
export interface SetPinResponse {
  ok: true;
  updated?: boolean;
  removed?: boolean;
}
export function setPin(inboxId: string, pin: string | null, sessionToken: string): Promise<SetPinResponse> {
  return postJSON("setPin", { inboxId, pin, sessionToken });
}

// ---------------- CLAIM EMAIL ----------------
export function claimEmail(args: { inboxId: string; sessionToken: string; email: string }): Promise<{ ok: true }> {
  return postJSON("claimEmail", args);
}

// ---------------- LIST INBOX ----------------
export interface InboxMessage {
  id: string;
  createdAt: number | null;
  fromName: string;
  type: "love" | "friendship" | "family" | "crush";
  stickerId?: string;
  body: string;
  unread: boolean;
  lastActiveAt: number | null;
  replyEnabled: boolean;
}
export interface ListInboxResponse {
  ok: true;
  pinRequired: boolean;
  unreadCount: number;
  messages: InboxMessage[];
}
export function listInbox(inboxId: string, sessionToken: string): Promise<ListInboxResponse> {
  return postJSON("listInbox", { inboxId, sessionToken });
}

// ---------------- GET MESSAGE ----------------
export interface MessageReply {
  id: string;
  body: string;
  from: "them" | "me";
  createdAt: number | null;
}
export interface MessageDetail {
  id: string;
  fromName: string;
  type: "love" | "friendship" | "family" | "crush";
  stickerId?: string;
  body: string;
  unread: boolean;
  replyEnabled: boolean;
  createdAt: number | null;
}
export interface GetMessageResponse {
  ok: true;
  message: MessageDetail;
  replies: MessageReply[];
}
export function getMessage(inboxId: string, messageId: string, sessionToken: string): Promise<GetMessageResponse> {
  return postJSON("getMessage", { inboxId, messageId, sessionToken });
}

// ---------------- SEND REPLY ----------------
export interface SendReplyResponse {
  ok: true;
  replyId: string;
}
export function sendReply(args: { inboxId: string; messageId: string; body: string; sessionToken: string }): Promise<SendReplyResponse> {
  return postJSON("sendReply", args);
}

// ---------------- LOGIN BY EMAIL / PIN RESET ----------------
export type RequestLoginLinkResponse =
  | { ok: true; action: "LINK_SENT" }
  | { ok: true; action: "PIN_REQUIRED"; inboxId: string };

export async function requestLoginLink(email: string): Promise<RequestLoginLinkResponse> {
  const data: any = await postJSON("requestLoginLink", { email });

  // Tolérance si backend ne met pas ok
  if (data?.action === "LINK_SENT") return { ok: true, action: "LINK_SENT" };
  if (data?.action === "PIN_REQUIRED" && typeof data?.inboxId === "string") {
    return { ok: true, action: "PIN_REQUIRED", inboxId: data.inboxId };
  }

  throw new Error("Unexpected response from requestLoginLink");
}

export function requestPinReset(email: string): Promise<{ ok: true }> {
  return postJSON("requestPinReset", { email });
}