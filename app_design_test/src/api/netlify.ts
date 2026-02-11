import type { GetMessageResponse, ListInboxResponse, OpenLinkResponse, LetterType } from '../types';
import {
  getInboxId,
  getSessionToken,
  setInboxId,
  setSessionToken,
  setPinRequired,
  setCachedMessages,
  clearLocalSession,
} from './storage';

async function apiPost<T>(url: string, payload: unknown): Promise<{ res: Response; data: T }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { res, data };
}

export function parseTokenFromHash(): string | null {
  // Supports: #/letters?t=TOKEN (or any route with ?t=)
  const hash = window.location.hash || '';
  const q = hash.split('?')[1] || '';
  const params = new URLSearchParams(q);
  return params.get('t');
}

export function clearQueryFromHash() {
  const routeOnly = (window.location.hash || '#/').split('?')[0];
  history.replaceState({}, '', `${location.pathname}${routeOnly}`);
}

export async function openEmailLink(token: string): Promise<OpenLinkResponse> {
  const { res, data } = await apiPost<OpenLinkResponse>('/.netlify/functions/openLink', { token });

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `openLink failed (${res.status})`);
  }

  setInboxId(data.inboxId || null);
  setPinRequired(!!data.pinRequired);
  if (data.sessionToken) setSessionToken(data.sessionToken);
  setCachedMessages([]);

  return data;
}

export async function verifyPin(pin: string): Promise<{ ok: boolean; verified?: boolean; sessionToken?: string; error?: string }> {
  const inboxId = getInboxId();
  if (!inboxId) throw new Error('No inbox selected.');

  const { res, data } = await apiPost<{ ok: boolean; verified?: boolean; sessionToken?: string; error?: string }>(
    '/.netlify/functions/verifyPin',
    { inboxId, pin, mode: 'verify' },
  );

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `verifyPin failed (${res.status})`);
  }

  if (data.sessionToken) setSessionToken(data.sessionToken);
  setPinRequired(true);
  return data;
}

export async function listInbox(): Promise<ListInboxResponse> {
  const inboxId = getInboxId();
  const sessionToken = getSessionToken();
  if (!inboxId) throw new Error('No inbox selected.');

  const { res, data } = await apiPost<ListInboxResponse>('/.netlify/functions/listInbox', {
    inboxId,
    sessionToken,
  });

  if (!res.ok || !data.ok) {
    if (data.pinRequired) setPinRequired(true);
    throw new Error(data.error || `listInbox failed (${res.status})`);
  }

  setCachedMessages(data.messages || []);
  setPinRequired(!!data.pinRequired);
  return data;
}

export async function getMessageById(messageId: string): Promise<GetMessageResponse> {
  const inboxId = getInboxId();
  if (!inboxId) throw new Error('Not connected (missing inboxId)');
  if (!messageId) throw new Error('Missing messageId');

  const sessionToken = getSessionToken() || null;

  const { res, data } = await apiPost<GetMessageResponse>('/.netlify/functions/getMessage', {
    inboxId,
    messageId,
    sessionToken,
  });

  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load message');
  return data;
}

export async function sendReply(messageId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const inboxId = getInboxId();
  if (!inboxId) throw new Error('Not connected (missing inboxId)');

  const sessionToken = getSessionToken();

  const { res, data } = await apiPost<{ ok: boolean; error?: string }>('/.netlify/functions/sendReply', {
    inboxId,
    messageId,
    body,
    sessionToken,
  });

  if (!res.ok || !data.ok) throw new Error(data.error || `sendReply failed (${res.status})`);
  return data;
}

export type SendMessagePayload = {
  toEmail: string;
  fromName: string;
  type: LetterType;
  stickerId?: string;
  body: string;
  replyAllowed: boolean;
  fromEmail?: string;
};

export async function sendMessage(payload: SendMessagePayload): Promise<{ ok: boolean; error?: string }> {
  const { res, data } = await apiPost<{ ok: boolean; error?: string }>('/.netlify/functions/sendMessage', payload);
  if (!res.ok || !data.ok) throw new Error(data.error || `sendMessage failed (${res.status})`);
  return data;
}

export function disconnect() {
  clearLocalSession();
}
