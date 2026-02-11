const KEYS = {
  inboxId: 'sv_inboxId',
  sessionToken: 'sv_sessionToken',
  pinRequired: 'sv_pinRequired',
  cachedMessages: 'sv_cachedMessages',
} as const;

export function getInboxId(): string | null {
  return localStorage.getItem(KEYS.inboxId);
}

export function setInboxId(inboxId: string | null) {
  if (!inboxId) localStorage.removeItem(KEYS.inboxId);
  else localStorage.setItem(KEYS.inboxId, inboxId);
}

export function getSessionToken(): string | null {
  return localStorage.getItem(KEYS.sessionToken);
}

export function setSessionToken(token: string | null) {
  if (!token) localStorage.removeItem(KEYS.sessionToken);
  else localStorage.setItem(KEYS.sessionToken, token);
}

export function isPinRequired(): boolean {
  return localStorage.getItem(KEYS.pinRequired) === '1';
}

export function setPinRequired(val: boolean) {
  localStorage.setItem(KEYS.pinRequired, val ? '1' : '0');
}

export function getCachedMessages<T = unknown>(): T[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.cachedMessages) || '[]') as T[];
  } catch {
    return [];
  }
}

export function setCachedMessages(messages: unknown[]) {
  localStorage.setItem(KEYS.cachedMessages, JSON.stringify(messages || []));
}

export function clearLocalSession() {
  localStorage.removeItem(KEYS.inboxId);
  localStorage.removeItem(KEYS.sessionToken);
  localStorage.removeItem(KEYS.pinRequired);
  localStorage.removeItem(KEYS.cachedMessages);
}
