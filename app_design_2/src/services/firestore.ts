/**
 * Service Firestore pour récupérer les messages chiffrés
 * Nécessite Firebase SDK côté client
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  Firestore
} from 'firebase/firestore';

export interface EncryptedMessage {
  id: string;
  fromName: string;
  type: 'love' | 'friendship' | 'family' | 'crush';
  stickerId?: string;
  bodyEnc: {
    alg: string;
    iv: string;
    ct: string;
    tag: string;
  };
  dekWrapped: {
    alg: string;
    iv: string;
    ct: string;
    tag: string;
  };
  cryptoVersion: number;
  replyEnabled: boolean;
  replyToInboxId?: string;
  replyToEmail?: string;
  unread: boolean;
  hasReplies: boolean;
  lastPreviewEnc?: any;
  createdAt: any;
  updatedAt?: any;
  moderationStatus?: string;
}

/**
 * Écoute en temps réel les messages d'une inbox
 */
export function subscribeToMessages(
  db: Firestore,
  inboxId: string,
  onUpdate: (messages: EncryptedMessage[]) => void,
  onError?: (error: Error) => void
) {
  const messagesRef = collection(db, 'inboxes', inboxId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: EncryptedMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EncryptedMessage));
      onUpdate(messages);
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
      onError?.(error);
    }
  );
}

/**
 * Récupère un message spécifique
 */
export async function getMessage(
  db: Firestore,
  inboxId: string,
  messageId: string
): Promise<EncryptedMessage | null> {
  const messageRef = doc(db, 'inboxes', inboxId, 'messages', messageId);
  const snapshot = await getDoc(messageRef);
  
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  } as EncryptedMessage;
}

/**
 * Récupère les réponses d'un message
 */
export function subscribeToReplies(
  db: Firestore,
  inboxId: string,
  messageId: string,
  onUpdate: (replies: any[]) => void,
  onError?: (error: Error) => void
) {
  const repliesRef = collection(db, 'inboxes', inboxId, 'messages', messageId, 'replies');
  const q = query(repliesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const replies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      onUpdate(replies);
    },
    (error) => {
      console.error('Error subscribing to replies:', error);
      onError?.(error);
    }
  );
}
