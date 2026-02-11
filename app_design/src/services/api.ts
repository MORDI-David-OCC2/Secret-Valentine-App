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
  sessionToken: string | null;
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

// ================== LIST INBOX (Liste messages avec preview) ==================
export interface InboxMessage {
  id: string;
  createdAt: number;
  fromName: string;
  type: 'love' | 'friendship' | 'family' | 'crush';
  stickerId?: string;
  body: string; // preview tronqué à 120 chars
  unread: boolean;
  lastActiveAt: number;
  replyEnabled: boolean;
}

export interface ListInboxResponse {
  ok: true;
  pinRequired: boolean;
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

// ================== GET MESSAGE (Message complet + replies) ==================
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
  body: string; // texte complet déchiffré
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
export interface SendMessageRequest {
  toEmail: string;
  fromName: string;
  fromEmail?: string;
  replyAllowed?: boolean;
  type: 'love' | 'friendship' | 'family' | 'crush';
  stickerId?: string;
  body: string;
}

export interface SendMessageResponse {
  ok: true;
  inboxId: string;
  messageId: string;
  emailed: boolean;
  quarantined?: boolean;
  moderationStatus?: 'allow' | 'quarantine' | 'block';
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to send reply');
  }

  return response.json();
}

// ================== ERROR HANDLING ==================
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): string {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 400:
        return 'Requête invalide';
      case 401:
        return 'Non autorisé - vérifiez vos identifiants';
      case 403:
        return 'Accès interdit';
      case 404:
        return 'Ressource non trouvée';
      case 429:
        return 'Trop de tentatives - réessayez plus tard';
      case 500:
        return 'Erreur serveur';
      default:
        return error.message;
    }
  }
  return error.message || 'Une erreur est survenue';
}