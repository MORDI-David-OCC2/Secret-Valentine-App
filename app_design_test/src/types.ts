export type LetterType = 'love' | 'crush' | 'family' | 'friendship';

export type MessagePreview = {
  id: string;
  fromName?: string;
  type?: LetterType;
  createdAt?: string | number;
  lastActiveAt?: string | number;
  unread?: boolean;
  createdAtMs?: number;
  lastActiveAtMs?: number;
};

export type Reply = {
  body?: string;
  createdAt?: string;
  createdAtMs?: number;
};

export type MessageDetail = {
  id: string;
  fromName?: string;
  type?: LetterType;
  createdAt?: string | number;
  body?: string;
  replyEnabled?: boolean;
};

export type OpenLinkResponse = {
  ok: boolean;
  inboxId?: string;
  pinRequired?: boolean;
  sessionToken?: string;
  error?: string;
};

export type ListInboxResponse = {
  ok: boolean;
  messages?: MessagePreview[];
  pinRequired?: boolean;
  error?: string;
};

export type GetMessageResponse = {
  ok: boolean;
  message?: MessageDetail;
  replies?: Reply[];
  pinRequired?: boolean;
  error?: string;
};
