# ✅ TODO Final - 4 Fichiers à Modifier (30 min)

## 📝 Résumé

**État actuel**: 72% complété  
**Reste à faire**: 4 fichiers  
**Temps estimé**: 30-45 minutes

---

## 1️⃣ App.tsx - Supprimer données mockées (5 min)

### ❌ Supprimer ceci (lignes 25-62):

```tsx
const [letters, setLetters] = useState<Letter[]>([
  {
    id: '1',
    from: 'Anonymous',
    to: 'You',
    type: 'crush',
    date: '2/14/26',
    message: '...',
    isAnonymous: true,
  },
  // ... 3 autres lettres
]);
```

### ❌ Supprimer la fonction handleSendLetter (lignes 72-80)

### ❌ Dans le JSX LettersPage, supprimer la prop:

```tsx
<LettersPage 
  letters={letters}  // ❌ SUPPRIMER CETTE LIGNE
  onBack={() => setCurrentPage('home')}
  language={language}
/>
```

---

## 2️⃣ LettersPage.tsx - Charger via API (15 min)

### 📍 Trouver l'interface LettersPageProps

Remplacer:
```tsx
interface LettersPageProps {
  letters: Letter[];  // ❌ SUPPRIMER
  onBack: () => void;
  language: 'en' | 'fr';
}
```

Par:
```tsx
interface LettersPageProps {
  onBack: () => void;
  language: 'en' | 'fr';
}
```

### 📍 Dans le composant LettersPage, AVANT les translations

Ajouter:
```tsx
export default function LettersPage({ onBack, language }: LettersPageProps) {
  const { session } = useSession();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<{ letter: Letter; color: string } | null>(null);

  // Charger messages au mount
  useEffect(() => {
    const loadMessages = async () => {
      if (!session.inboxId || !session.sessionToken) {
        toast.error(language === 'en' ? 'Invalid session' : 'Session invalide');
        onBack();
        return;
      }

      try {
        const response = await listInbox(session.inboxId, session.sessionToken);
        setMessages(response.messages);
      } catch (error: any) {
        if (error.message.includes('401')) {
          toast.error(language === 'en' ? 'Session expired' : 'Session expirée');
          onBack();
        } else if (error.message.includes('429')) {
          toast.error(language === 'en' ? 'Too many requests' : 'Trop de requêtes');
        } else {
          toast.error(error.message || (language === 'en' ? 'Failed to load' : 'Échec du chargement'));
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [session.inboxId, session.sessionToken, language, onBack]);

  // Mapper vers format Letter pour compatibilité
  const letters = messages.map(msg => ({
    id: msg.id,
    from: msg.fromName,
    to: 'You',
    type: msg.type === 'friendship' ? ('friend' as const) : msg.type,
    date: new Date(msg.lastActiveAt).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    }),
    message: msg.body,
    isAnonymous: msg.fromName.toLowerCase().includes('anonymous')
  }));

  const translations = {
    // ... reste du code
```

### 📍 Ajouter un loading state avant le return

Juste avant `return (`:
```tsx
  // Loading state
  if (loading) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          💌
        </motion.div>
      </div>
    );
  }

  return (
    // ... reste du JSX
```

---

## 3️⃣ LetterDetailView.tsx - Charger message complet (10 min)

### 📍 Ajouter les imports (ligne 1)

```tsx
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { useSession } from '../contexts/SessionContext';
import { getMessage, MessageDetail, MessageReply } from '../services/api';
import svgPaths from "../imports/svg-01d0jglvrw";
import type { Letter } from "../App";
import ReplyToLetterView from "./ReplyToLetterView";
```

### 📍 Modifier l'interface (ligne ~33)

Remplacer:
```tsx
interface LetterDetailViewProps {
  letter: Letter;
  color: string;
  onClose: () => void;
  onReply: (reply: Omit<Letter, 'id' | 'date'>) => void;
}
```

Par:
```tsx
interface LetterDetailViewProps {
  messageId: string;  // ✅ Changé
  color: string;
  onClose: () => void;
  language: 'en' | 'fr';
}
```

### 📍 Remplacer TOUT le composant

```tsx
export default function LetterDetailView({ messageId, color, onClose, language }: LetterDetailViewProps) {
  const { session } = useSession();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    const loadMessage = async () => {
      if (!session.inboxId || !session.sessionToken) {
        toast.error('Invalid session');
        onClose();
        return;
      }

      try {
        const response = await getMessage(
          session.inboxId,
          messageId,
          session.sessionToken
        );
        
        setMessage(response.message);
        setReplies(response.replies);
      } catch (error: any) {
        if (error.message.includes('401')) {
          toast.error('Session expired');
        } else if (error.message.includes('404')) {
          toast.error('Message not found');
        } else {
          toast.error('Failed to load message');
        }
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, [messageId, session.inboxId, session.sessionToken, onClose]);

  if (loading || !message) {
    return (
      <motion.div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          💌
        </motion.div>
      </motion.div>
    );
  }

  // Convertir en format Letter pour compatibilité avec le reste du code
  const letter: Letter = {
    id: message.id,
    from: message.fromName,
    to: 'You',
    type: message.type === 'friendship' ? 'friend' : message.type,
    date: new Date(message.createdAt).toLocaleDateString(),
    message: message.body,
    isAnonymous: message.fromName.toLowerCase().includes('anonymous')
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'love': return '🌹';
      case 'friend': return '🌻';
      case 'family': return '🌺';
      case 'crush': return '🌸';
      default: return '💌';
    }
  };

  // ... GARDER TOUT LE RESTE DU CODE JSX (le return avec le motion.div, etc.)
  // Juste utilise `message.body` au lieu de `letter.message`
}
```

### 📍 Dans le JSX, afficher les replies

Après l'affichage du message, ajouter:
```tsx
{/* Replies Thread */}
{replies.length > 0 && (
  <motion.div
    className="mt-6 space-y-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <h3 className="font-['Inter',sans-serif] font-bold text-lg text-black/80 mb-4">
      {language === 'en' ? 'Conversation' : 'Conversation'}
    </h3>
    {replies.map((reply, index) => (
      <motion.div
        key={reply.id}
        className={`p-4 rounded-lg ${
          reply.from === 'me' 
            ? 'bg-white/40 ml-8' 
            : 'bg-white/60 mr-8'
        }`}
        initial={{ opacity: 0, x: reply.from === 'me' ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <p className="font-['Inter',sans-serif] text-[14px] text-black">
          {reply.body}
        </p>
        <p className="font-['Inter',sans-serif] text-[11px] text-black/50 mt-2">
          {new Date(reply.createdAt).toLocaleString()}
        </p>
      </motion.div>
    ))}
  </motion.div>
)}
```

---

## 4️⃣ ReplyToLetterView.tsx - Envoyer via API (10 min)

### 📍 Modifier l'interface

Remplacer:
```tsx
interface ReplyToLetterViewProps {
  originalLetter: Letter;
  color: string;
  onClose: () => void;
  onSend: (reply: Omit<Letter, 'id' | 'date'>) => void;
}
```

Par:
```tsx
interface ReplyToLetterViewProps {
  messageId: string;  // ✅ Ajouté
  originalLetter: Letter;
  color: string;
  onClose: () => void;
  language: 'en' | 'fr';
}
```

### 📍 Remplacer handleSubmit

Chercher la fonction `handleSubmit` et remplacer par:

```tsx
const handleSubmit = async () => {
  if (!message.trim()) {
    toast.error(language === 'en' ? 'Message is empty' : 'Message vide');
    return;
  }

  if (message.length > 2000) {
    toast.error(language === 'en' ? 'Message too long (max 2000)' : 'Message trop long (max 2000)');
    return;
  }

  if (!session.inboxId || !session.sessionToken) {
    toast.error('Invalid session');
    return;
  }

  setIsSending(true);

  try {
    await sendReply({
      inboxId: session.inboxId,
      messageId: messageId,
      body: message.trim(),
      sessionToken: session.sessionToken
    });

    toast.success(language === 'en' ? 'Reply sent! 💌' : 'Réponse envoyée! 💌');
    onClose();
  } catch (error: any) {
    if (error.message.includes('403')) {
      toast.error(language === 'en' ? 'Replies disabled' : 'Réponses désactivées');
    } else if (error.message.includes('429')) {
      toast.error(language === 'en' ? 'Too many replies' : 'Trop de réponses');
    } else if (error.message.includes('401')) {
      toast.error(language === 'en' ? 'Session expired' : 'Session expirée');
    } else if (error.message.includes('block')) {
      toast.error(language === 'en' ? 'Blocked by moderation' : 'Bloqué par modération');
    } else {
      toast.error(error.message || (language === 'en' ? 'Failed to send' : 'Échec d\'envoi'));
    }
  } finally {
    setIsSending(false);
  }
};
```

---

## 5️⃣ Mise à jour des appels dans LettersPage

### 📍 Quand tu ouvres LetterDetailView

Dans `LettersPage.tsx`, chercher:
```tsx
{selectedLetter && (
  <LetterDetailView
    letter={selectedLetter.letter}  // ❌ CHANGER
    color={selectedLetter.color}
    onClose={() => setSelectedLetter(null)}
    onReply={...}  // ❌ SUPPRIMER
  />
)}
```

Remplacer par:
```tsx
{selectedLetter && (
  <LetterDetailView
    messageId={selectedLetter.letter.id}  // ✅ Passer l'ID
    color={selectedLetter.color}
    onClose={() => setSelectedLetter(null)}
    language={language}
  />
)}
```

---

## ✅ **Checklist Finale**

Après ces 4 modifications:

- [ ] App.tsx - Données mockées supprimées
- [ ] LettersPage.tsx - Charge via `listInbox()`
- [ ] LetterDetailView.tsx - Charge via `getMessage()`
- [ ] ReplyToLetterView.tsx - Envoie via `sendReply()`
- [ ] LettersPage.tsx - Appel LetterDetailView mis à jour

---

## 🧪 **Test Final**

1. HomePage → "Write your message"
2. Envoie à `ton-email@gmail.com`
3. Vérifie email reçu
4. Click lien dans email
5. LettersPage charge → Voit enveloppe
6. Click enveloppe → LetterDetailView charge message
7. Click "Reply" → Écrit réponse → Envoie
8. ✅ Toast "Réponse envoyée! 💌"

---

**C'est tout!** Après ces 4 modifications, ton app sera 100% fonctionnelle avec le backend! 🚀
