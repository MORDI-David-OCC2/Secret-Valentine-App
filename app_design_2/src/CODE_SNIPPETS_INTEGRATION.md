# 💻 Code Snippets - Intégration Backend

Snippets prêts à coller dans chaque composant pour l'intégration complète.

---

## 📮 ComposePage.tsx - Envoi de message

### Ajouter imports
```tsx
import { toast } from 'sonner@2.0.3';
import { sendMessage } from '../services/api';
```

### Ajouter états
```tsx
// États existants
const [to, setTo] = useState('');
const [from, setFrom] = useState('');
const [message, setMessage] = useState('');
const [isAnonymous, setIsAnonymous] = useState(false);
const [selectedType, setSelectedType] = useState<'love' | 'friend' | 'family' | 'crush' | null>(null);
const [isSending, setIsSending] = useState(false);

// NOUVEAUX états pour API
const [toEmail, setToEmail] = useState('');
const [fromEmail, setFromEmail] = useState('');
const [replyAllowed, setReplyAllowed] = useState(false);
```

### Remplacer handleSubmit
```tsx
const handleSubmit = async () => {
  // Validation
  if (!toEmail || !toEmail.includes('@')) {
    toast.error(language === 'en' ? 'Invalid email address' : 'Email invalide');
    return;
  }
  
  if (!message || message.length > 2000) {
    toast.error(language === 'en' ? 'Message required (max 2000 chars)' : 'Message requis (max 2000 caractères)');
    return;
  }
  
  if (!selectedType) {
    toast.error(language === 'en' ? 'Please select a type' : 'Veuillez sélectionner un type');
    return;
  }

  if (replyAllowed && !fromEmail) {
    toast.error(language === 'en' ? 'Email required to allow replies' : 'Email requis pour autoriser les réponses');
    return;
  }

  setIsSending(true);

  try {
    // Mapper friend → friendship
    const typeMapping = {
      'love': 'love' as const,
      'friend': 'friendship' as const,
      'family': 'family' as const,
      'crush': 'crush' as const
    };

    const response = await sendMessage({
      toEmail: toEmail.trim().toLowerCase(),
      fromName: isAnonymous ? 'Secret Admirer' : (from || 'Anonymous'),
      fromEmail: replyAllowed ? fromEmail.trim().toLowerCase() : undefined,
      replyAllowed,
      type: typeMapping[selectedType],
      body: message.trim()
    });

    // Gérer succès
    if (response.quarantined) {
      toast.warning(
        language === 'en' 
          ? 'Message sent but pending moderation' 
          : 'Message envoyé mais en attente de modération'
      );
    } else if (response.emailed) {
      toast.success(
        language === 'en' 
          ? 'Message sent! 💌 They will receive an email.' 
          : 'Message envoyé! 💌 Ils recevront un email.'
      );
    }

    // Retour à l'accueil
    setTimeout(() => {
      onBack();
    }, 1500);

  } catch (error: any) {
    // Gérer erreurs
    if (error.message.includes('429')) {
      toast.error(
        language === 'en' 
          ? 'Too many messages. Please wait a moment.' 
          : 'Trop de messages. Attendez un moment.'
      );
    } else if (error.message.includes('block')) {
      toast.error(
        language === 'en' 
          ? 'Message blocked by moderation' 
          : 'Message bloqué par la modération'
      );
    } else {
      toast.error(error.message || (language === 'en' ? 'Failed to send' : 'Échec d\'envoi'));
    }
  } finally {
    setIsSending(false);
  }
};
```

### Ajouter champs dans le formulaire

Après le champ "To":
```tsx
{/* Email destinataire */}
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.5, delay: 0.95 }}
>
  <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
    <span className="font-bold">Email:</span>{' '}
    <span className="font-normal text-[#4a4a4a]">Recipient's email</span>
  </p>
  <motion.input
    type="email"
    value={toEmail}
    onChange={(e) => setToEmail(e.target.value)}
    placeholder="olivia@example.com"
    className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
    whileFocus={{ scale: 1.02 }}
  />
</motion.div>
```

Après le champ "Anonymous":
```tsx
{/* Allow Replies Checkbox */}
<motion.div 
  className="flex items-center gap-3"
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.5, delay: 1.15 }}
>
  <motion.button
    onClick={() => setReplyAllowed(!replyAllowed)}
    className="size-[20px] border-2 border-[#2d1b1b] rounded-[3px] bg-white flex items-center justify-center"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    {replyAllowed && (
      <motion.div 
        className="size-[12px] bg-[#a31e46] rounded-[1px]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500 }}
      />
    )}
  </motion.button>
  <p className="font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b]">
    {language === 'en' ? 'Allow replies' : 'Autoriser les réponses'}
  </p>
</motion.div>

{/* Your Email (si reply allowed) */}
{replyAllowed && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.3 }}
  >
    <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
      <span className="font-bold">Your Email:</span>{' '}
      <span className="font-normal text-[#4a4a4a]">For replies</span>
    </p>
    <motion.input
      type="email"
      value={fromEmail}
      onChange={(e) => setFromEmail(e.target.value)}
      placeholder="your.email@example.com"
      className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
      whileFocus={{ scale: 1.02 }}
    />
  </motion.div>
)}
```

---

## 📬 LettersPage.tsx - Charger messages

### Remplacer imports
```tsx
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { useSession } from '../contexts/SessionContext';
import { listInbox, InboxMessage } from '../services/api';
```

### Supprimer props `letters` et charger via API
```tsx
interface LettersPageProps {
  onBack: () => void;
  language: 'en' | 'fr';
  // Supprimer: letters: Letter[];
}

export default function LettersPage({ onBack, language }: LettersPageProps) {
  const { session } = useSession();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // Charger messages au mount
  useEffect(() => {
    const loadMessages = async () => {
      // Vérifier session
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
  }, [session.inboxId, session.sessionToken]);

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
    message: msg.body, // preview
    isAnonymous: msg.fromName.toLowerCase().includes('anonymous')
  }));

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
      </motion.div>
    );
  }

  // ... reste du composant (utilise `letters` comme avant)
}
```

---

## 💌 LetterDetailView.tsx - Charger message complet

### Ajouter imports
```tsx
import { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import { getMessage, MessageDetail, MessageReply } from '../services/api';
import { toast } from 'sonner@2.0.3';
```

### Remplacer par chargement API
```tsx
interface LetterDetailViewProps {
  messageId: string; // au lieu de letter: Letter
  onClose: () => void;
  onReply?: (messageId: string) => void;
  language: 'en' | 'fr';
}

export default function LetterDetailView({ 
  messageId, 
  onClose, 
  onReply, 
  language 
}: LetterDetailViewProps) {
  const { session } = useSession();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [messageId, session.inboxId, session.sessionToken]);

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

  // Afficher le message et replies
  return (
    <motion.div /* ... reste du composant avec message.body, message.fromName, etc. */>
      {/* Afficher message.body (texte complet) */}
      <p>{message.body}</p>

      {/* Afficher replies */}
      {replies.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3>Replies:</h3>
          {replies.map(reply => (
            <div key={reply.id} className={reply.from === 'me' ? 'text-right' : 'text-left'}>
              <p>{reply.body}</p>
              <span className="text-sm text-gray-500">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bouton Reply si enabled */}
      {message.replyEnabled && onReply && (
        <button onClick={() => onReply(messageId)}>
          Reply
        </button>
      )}
    </motion.div>
  );
}
```

---

## 💬 ReplyToLetterView.tsx - Envoyer réponse

### Ajouter imports
```tsx
import { useState } from 'react';
import { sendReply } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import { toast } from 'sonner@2.0.3';
```

### Remplacer handleSend
```tsx
export default function ReplyToLetterView({ 
  messageId, 
  onClose, 
  language 
}: Props) {
  const { session } = useSession();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!replyText.trim()) {
      toast.error(language === 'en' ? 'Message is empty' : 'Message vide');
      return;
    }

    if (replyText.length > 2000) {
      toast.error(language === 'en' ? 'Message too long (max 2000)' : 'Message trop long (max 2000)');
      return;
    }

    if (!session.inboxId || !session.sessionToken) {
      toast.error('Invalid session');
      return;
    }

    setSending(true);

    try {
      await sendReply({
        inboxId: session.inboxId,
        messageId,
        body: replyText.trim(),
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
      setSending(false);
    }
  };

  // ... reste du composant
}
```

---

## 🔐 PinEntryScreen.tsx - Vérifier PIN

### Remplacer imports et props
```tsx
import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { useSession } from '../contexts/SessionContext';
import { verifyPin } from '../services/api';

interface PinEntryScreenProps {
  // Supprimer: correctPin: string;
  onSuccess: () => void;
  onBack: () => void;
  language: 'en' | 'fr';
}

export default function PinEntryScreen({ 
  onSuccess, 
  onBack, 
  language 
}: PinEntryScreenProps) {
  const { session, unlock } = useSession();
  const [pin, setPin] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    const pinCode = pin.join('');
    
    if (pinCode.length !== 4) {
      setError(language === 'en' ? 'Enter 4 digits' : 'Entrez 6 chiffres');
      return;
    }

    if (!session.inboxId) {
      toast.error('Invalid session');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await verifyPin(session.inboxId, pinCode);
      
      if (response.verified && response.sessionToken) {
        // Déverrouiller la session
        unlock(response.sessionToken);
        toast.success(language === 'en' ? 'Unlocked! ✅' : 'Déverrouillé! ✅');
        onSuccess();
      } else {
        setError(language === 'en' ? 'Incorrect PIN' : 'PIN incorrect');
        setPin(['', '', '', '']);
      }
    } catch (error: any) {
      if (error.message.includes('429')) {
        setError(language === 'en' ? 'Too many attempts. Wait a moment.' : 'Trop de tentatives. Attendez.');
      } else if (error.message.includes('401')) {
        setError(language === 'en' ? 'Incorrect PIN' : 'PIN incorrect');
        setPin(['', '', '', '']);
      } else {
        setError(error.message || (language === 'en' ? 'Verification failed' : 'Vérification échouée'));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // ... reste du composant
}
```

---

## ⚙️ SettingsPage.tsx - Gérer PIN

### Ajouter imports
```tsx
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { useSession } from '../contexts/SessionContext';
import { setPin } from '../services/api';
```

### Ajouter fonction setPin
```tsx
export default function SettingsPage({ /* ... */ }: Props) {
  const { session } = useSession();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [settingPin, setSettingPin] = useState(false);

  const handleSetPin = async () => {
    // Validation
    if (newPin.length < 4 || newPin.length > 8) {
      toast.error(language === 'en' ? 'PIN must be 4-8 digits' : 'PIN doit faire 4-8 chiffres');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      toast.error(language === 'en' ? 'PIN must contain only digits' : 'PIN doit contenir que des chiffres');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error(language === 'en' ? 'PINs don\'t match' : 'PINs ne correspondent pas');
      return;
    }

    if (!session.inboxId || !session.sessionToken) {
      toast.error(language === 'en' ? 'You must be logged in' : 'Vous devez être connecté');
      return;
    }

    setSettingPin(true);

    try {
      await setPin(session.inboxId, newPin, session.sessionToken);
      
      toast.success(language === 'en' ? 'PIN set! 🔒' : 'PIN défini! 🔒');
      onPinCodeChange(newPin);
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      if (error.message.includes('401')) {
        toast.error(language === 'en' ? 'Unlock your inbox first' : 'Déverrouillez d\'abord votre boîte');
      } else {
        toast.error(error.message || (language === 'en' ? 'Failed to set PIN' : 'Échec définition PIN'));
      }
    } finally {
      setSettingPin(false);
    }
  };

  const handleRemovePin = async () => {
    if (!session.inboxId || !session.sessionToken) {
      toast.error(language === 'en' ? 'Invalid session' : 'Session invalide');
      return;
    }

    if (!confirm(language === 'en' ? 'Remove PIN? All sessions will be logged out.' : 'Supprimer le PIN? Toutes les sessions seront déconnectées.')) {
      return;
    }

    setSettingPin(true);

    try {
      await setPin(session.inboxId, null, session.sessionToken);
      
      toast.success(language === 'en' ? 'PIN removed' : 'PIN supprimé');
      onPinCodeChange(null);
    } catch (error: any) {
      toast.error(error.message || (language === 'en' ? 'Failed to remove PIN' : 'Échec suppression PIN'));
    } finally {
      setSettingPin(false);
    }
  };

  // ... reste du composant avec UI pour set/remove PIN
}
```

### Ajouter UI pour PIN dans Settings
```tsx
{/* PIN Security Section */}
<motion.div className="mb-8">
  <h2 className="font-['Inter',sans-serif] font-bold text-[20px] text-[#a31e46] mb-4">
    {language === 'en' ? 'Security' : 'Sécurité'}
  </h2>
  
  {pinCode ? (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        {language === 'en' ? 'PIN is currently set' : 'PIN actuellement défini'}
      </p>
      <button
        onClick={handleRemovePin}
        disabled={settingPin}
        className="bg-red-500 text-white px-4 py-2 rounded-lg"
      >
        {language === 'en' ? 'Remove PIN' : 'Supprimer le PIN'}
      </button>
    </div>
  ) : (
    <div>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
        placeholder={language === 'en' ? 'New PIN (4-8 digits)' : 'Nouveau PIN (4-8 chiffres)'}
        className="w-full border-2 rounded-lg p-2 mb-2"
        maxLength={8}
      />
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={confirmPin}
        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
        placeholder={language === 'en' ? 'Confirm PIN' : 'Confirmer le PIN'}
        className="w-full border-2 rounded-lg p-2 mb-4"
        maxLength={8}
      />
      <button
        onClick={handleSetPin}
        disabled={settingPin}
        className="bg-[#a31e46] text-white px-4 py-2 rounded-lg"
      >
        {settingPin ? '...' : (language === 'en' ? 'Set PIN' : 'Définir le PIN')}
      </button>
    </div>
  )}
</motion.div>
```

---

## 🎯 Checklist d'intégration

### ComposePage ✅
- [ ] Imports: `sendMessage`, `toast`
- [ ] États: `toEmail`, `fromEmail`, `replyAllowed`
- [ ] handleSubmit appelle `sendMessage()`
- [ ] Gestion erreurs 429, block, quarantine
- [ ] Champs UI: email destinataire, checkbox reply, email expéditeur

### LettersPage ✅
- [ ] Import: `listInbox`, `useSession`
- [ ] useEffect: charge messages via API
- [ ] Loading state avec animation
- [ ] Mapping `InboxMessage` → `Letter`
- [ ] Gestion erreurs 401, 429

### LetterDetailView ✅
- [ ] Props: `messageId` (pas `letter`)
- [ ] Import: `getMessage`, `useSession`
- [ ] useEffect: charge message complet
- [ ] Affiche replies
- [ ] Bouton Reply si `replyEnabled`

### ReplyToLetterView ✅
- [ ] Import: `sendReply`, `useSession`
- [ ] handleSend appelle `sendReply()`
- [ ] Validation longueur (max 2000)
- [ ] Gestion erreurs 403, 429, block

### PinEntryScreen ✅
- [ ] Import: `verifyPin`, `useSession`
- [ ] Suppression prop `correctPin`
- [ ] handleVerify appelle `verifyPin()`
- [ ] Appelle `unlock(sessionToken)` au succès
- [ ] Gestion erreurs 401, 429

### SettingsPage ✅
- [ ] Import: `setPin`, `useSession`
- [ ] handleSetPin / handleRemovePin
- [ ] UI: inputs PIN + confirm + boutons
- [ ] Validation 4-8 digits
- [ ] Gestion erreurs 401

---

## 🔧 Variables ENV à configurer

Dans **Netlify → Site settings → Environment variables**:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
API_EMAIL_KEY=re_xxxxxxxxxxxxx
EMAIL_VALENTINE=noreply@yourdomaine.com
EMAIL_BASE_URL=https://votre-site.netlify.app
RECOVERY_KEY_B64=base64_32_bytes_key
PIN_PEPPER=random_secret_pepper_string
```

---

## 🚀 Tester

### Test local avec Netlify Dev
```bash
netlify dev
```

### Test sendMessage
```bash
curl -X POST http://localhost:8888/.netlify/functions/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "toEmail": "test@test.com",
    "fromName": "Test User",
    "type": "love",
    "body": "Test message"
  }'
```

---

**C'est tout!** Tous les snippets sont prêts à coller. 🎉
