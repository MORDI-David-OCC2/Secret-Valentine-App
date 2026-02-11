# 🔐 Guide d'Intégration Backend - Secret Valentine App

## ✅ Ce qui a été fait

### 1. **Services API** (`/services/`)
Tous les endpoints Netlify Functions sont maintenant intégrés:

- ✅ **claimPending** - Réclamer inbox via email
- ✅ **openLink** - Ouvrir un lien token
- ✅ **verifyPin** - Vérifier PIN et créer session
- ✅ **setPin** - Définir/supprimer PIN
- ✅ **listInbox** - Liste des messages (preview)
- ✅ **getMessage** - Message complet + replies
- ✅ **sendMessage** - Envoyer message (avec modération)
- ✅ **sendReply** - Répondre à un message

### 2. **Context & State Management** (`/contexts/`, `/hooks/`)
- ✅ **SessionContext** - Gère inboxId, sessionToken, locked state
- ✅ **useInboxLink** - Hook pour ouverture de liens
- ✅ Persistence localStorage

### 3. **Composants**
- ✅ **App.tsx** - SessionProvider + Toaster + routing token
- ✅ **InboxLinkHandler** - Écran ouverture de lien
- ✅ **ClaimInboxPage** - Page pour réclamer sa boîte
- ✅ **HomePage** - Ajout bouton "Access my inbox"

### 4. **Crypto & Firestore** (`/services/`)
- ✅ **crypto.ts** - Déchiffrement AES-GCM côté client
- ✅ **firestore.ts** - Listeners temps réel (préparé)

---

## 🚧 À FINALISER

### Étape 1: **Mettre à jour ComposePage**

Le `ComposePage.tsx` doit appeler l'API `sendMessage()` au lieu du local `onSend`.

**Fichier**: `/components/ComposePage.tsx`

**Changements**:
```tsx
// Ajouter états pour email destinataire
const [toEmail, setToEmail] = useState('');
const [fromEmail, setFromEmail] = useState('');
const [replyAllowed, setReplyAllowed] = useState(false);

// Mapper les types
const typeMapping = {
  'friend': 'friendship' as const,
  'love': 'love' as const,
  'family': 'family' as const,
  'crush': 'crush' as const
};

// Remplacer handleSubmit:
const handleSubmit = async () => {
  if (!toEmail || !message || !selectedType) {
    toast.error(t.fillRequired);
    return;
  }

  setIsSending(true);

  try {
    const response = await sendMessage({
      toEmail,
      fromName: isAnonymous ? 'Secret Admirer' : from || 'Anonymous',
      fromEmail: replyAllowed ? fromEmail : undefined,
      replyAllowed,
      type: typeMapping[selectedType],
      body: message
    });

    if (response.quarantined) {
      toast.warning('Message en attente de modération');
    } else if (response.emailed) {
      toast.success('Message envoyé! 💌');
    }

    onBack();
  } catch (error: any) {
    if (error.message.includes('429')) {
      toast.error('Trop de tentatives. Réessayez plus tard.');
    } else if (error.message.includes('block')) {
      toast.error('Message bloqué par la modération');
    } else {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    }
  } finally {
    setIsSending(false);
  }
};
```

**Ajouter champs**:
- Input `toEmail` (email du destinataire)
- Input `fromEmail` (si reply allowed)
- Checkbox "Allow replies"

---

### Étape 2: **Mettre à jour LettersPage**

Le `LettersPage.tsx` doit charger les messages depuis `listInbox()` API.

**Fichier**: `/components/LettersPage.tsx`

**Changements**:
```tsx
import { useEffect, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { listInbox, InboxMessage } from '../services/api';
import { toast } from 'sonner@2.0.3';

export default function LettersPage({ onBack, language }: LettersPageProps) {
  const { session } = useSession();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.inboxId || !session.sessionToken) {
      toast.error('Session invalide');
      onBack();
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await listInbox(session.inboxId!, session.sessionToken!);
        setMessages(response.messages);
      } catch (error: any) {
        if (error.message.includes('401')) {
          toast.error('Session expirée');
          onBack();
        } else {
          toast.error('Erreur de chargement');
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [session.inboxId, session.sessionToken]);

  if (loading) {
    return <LoadingScreen />;
  }

  // Mapper vers le format Letter existant
  const letters = messages.map(msg => ({
    id: msg.id,
    from: msg.fromName,
    to: 'You',
    type: msg.type === 'friendship' ? 'friend' : msg.type,
    date: new Date(msg.lastActiveAt).toLocaleDateString(),
    message: msg.body, // preview
    isAnonymous: msg.fromName === 'Anonymous'
  }));

  // ... reste du composant
}
```

---

### Étape 3: **Mettre à jour LetterDetailView**

Le `LetterDetailView.tsx` doit charger le message complet via `getMessage()`.

**Fichier**: `/components/LetterDetailView.tsx`

**Changements**:
```tsx
import { useEffect, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { getMessage, MessageDetail, MessageReply } from '../services/api';

export default function LetterDetailView({ messageId, onClose, language }: Props) {
  const { session } = useSession();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessage = async () => {
      if (!session.inboxId || !session.sessionToken) return;

      try {
        const response = await getMessage(
          session.inboxId,
          messageId,
          session.sessionToken
        );
        
        setMessage(response.message);
        setReplies(response.replies);
      } catch (error) {
        toast.error('Erreur de chargement du message');
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, [messageId, session]);

  // ... render
}
```

---

### Étape 4: **Mettre à jour ReplyToLetterView**

Le `ReplyToLetterView.tsx` doit appeler `sendReply()`.

**Fichier**: `/components/ReplyToLetterView.tsx`

**Changements**:
```tsx
import { sendReply } from '../services/api';
import { useSession } from '../contexts/SessionContext';

const handleSendReply = async () => {
  if (!replyText.trim()) {
    toast.error('Message vide');
    return;
  }

  setSending(true);

  try {
    await sendReply({
      inboxId: session.inboxId!,
      messageId: letter.id,
      body: replyText,
      sessionToken: session.sessionToken!
    });

    toast.success('Réponse envoyée! 💌');
    onClose();
  } catch (error: any) {
    if (error.message.includes('403')) {
      toast.error('Réponses désactivées pour ce message');
    } else if (error.message.includes('429')) {
      toast.error('Trop de réponses. Ralentissez!');
    } else {
      toast.error(error.message || 'Erreur d\'envoi');
    }
  } finally {
    setSending(false);
  }
};
```

---

### Étape 5: **Mettre à jour PinEntryScreen**

Le `PinEntryScreen.tsx` doit appeler `verifyPin()`.

**Fichier**: `/components/PinEntryScreen.tsx`

**Changements**:
```tsx
import { verifyPin } from '../services/api';
import { useSession } from '../contexts/SessionContext';

const handleVerify = async () => {
  if (pin.length !== 4) return;

  setIsVerifying(true);
  setError(null);

  try {
    const response = await verifyPin(session.inboxId!, pin);
    
    if (response.verified && response.sessionToken) {
      unlock(response.sessionToken);
      toast.success('Déverrouillé! ✅');
      onSuccess();
    }
  } catch (error: any) {
    if (error.message.includes('429')) {
      setError('Trop de tentatives. Réessayez plus tard.');
    } else {
      setError('PIN incorrect');
      setPin('');
    }
  } finally {
    setIsVerifying(false);
  }
};
```

---

### Étape 6: **Mettre à jour SettingsPage**

Le `SettingsPage.tsx` doit appeler `setPin()`.

**Fichier**: `/components/SettingsPage.tsx`

**Changements**:
```tsx
import { setPin } from '../services/api';
import { useSession } from '../contexts/SessionContext';

const handleSetPin = async (newPin: string | null) => {
  if (!session.sessionToken) {
    toast.error('Session invalide');
    return;
  }

  try {
    const response = await setPin(
      session.inboxId!,
      newPin,
      session.sessionToken
    );

    if (response.updated) {
      toast.success('PIN défini! 🔒');
    } else if (response.removed) {
      toast.success('PIN supprimé');
    }

    onPinCodeChange(newPin);
  } catch (error: any) {
    if (error.message.includes('401')) {
      toast.error('Déverrouillez d\'abord votre boîte');
    } else {
      toast.error(error.message || 'Erreur');
    }
  }
};
```

---

## 📦 Variables d'Environnement Netlify

Ajoute ces variables dans **Netlify → Site settings → Environment variables**:

```bash
# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Resend
API_EMAIL_KEY=re_xxxxxxxxxxxxx
EMAIL_VALENTINE=noreply@votredomaine.com

# Crypto
RECOVERY_KEY_B64=base64_32_bytes
PIN_PEPPER=random_secret_string

# Base URL
EMAIL_BASE_URL=https://votre-site.netlify.app
```

---

## 🔥 Configuration Firebase

### 1. Créer projet Firebase Console
1. Va sur https://console.firebase.google.com/
2. Crée projet "secret-valentine"
3. Active Firestore Database (mode production)

### 2. Télécharger Service Account
1. Project Settings → Service Accounts
2. Generate New Private Key
3. Copie le JSON complet dans `FIREBASE_SERVICE_ACCOUNT_JSON`

### 3. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Pas d'accès direct client
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 📧 Configuration Resend

1. Crée un compte sur https://resend.com/
2. Obtiens ton API key
3. Ajoute dans Netlify: `API_EMAIL_KEY`
4. Configure un domaine vérifié (ou utilise sandbox)

---

## 🧪 Tester localement

### 1. Installer Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Créer `.env` local
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
API_EMAIL_KEY=re_test_key
EMAIL_VALENTINE=test@test.com
RECOVERY_KEY_B64=your_base64_key
PIN_PEPPER=test_pepper
EMAIL_BASE_URL=http://localhost:8888
```

### 3. Lancer dev server
```bash
netlify dev
```

L'app sera sur `http://localhost:8888` avec les functions actives.

---

## 🐛 Debugging

### Vérifier les logs Netlify Functions
```bash
netlify functions:log functionName
```

### Tester un endpoint
```bash
curl -X POST http://localhost:8888/.netlify/functions/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "toEmail": "test@test.com",
    "fromName": "Test",
    "type": "love",
    "body": "Hello!"
  }'
```

### Firestore Console
Va sur Firebase Console → Firestore Database pour voir les données.

---

## ✨ Fonctionnalités Complètes

### Flux Utilisateur 1: Envoyer un message
1. **Compose** → remplis email, message
2. Click "Send" → `sendMessage()` API
3. Backend: chiffre + stocke + envoie email via Resend
4. Destinataire reçoit email avec lien token

### Flux Utilisateur 2: Ouvrir inbox
1. Click lien email `/#/inbox?t=abc123`
2. App détecte token → `InboxLinkHandler`
3. `openLink()` → retourne `inboxId` + `pinRequired`
4. Si PIN requis → écran PIN
5. Sinon → charge messages via `listInbox()`

### Flux Utilisateur 3: Répondre à un message
1. Ouvre message → `getMessage()`
2. Click "Reply" → `ReplyToLetterView`
3. Écrit réponse → `sendReply()`
4. Backend: chiffre + stocke dans 2 inbox + notif email

### Flux Utilisateur 4: Sécurité PIN
1. Settings → "Set PIN"
2. `setPin()` → hash PBKDF2 + stocke
3. Prochaine ouverture → écran PIN
4. `verifyPin()` → vérifie hash + crée session 7 jours

---

## 📚 Architecture Récap

```
┌─────────────────────────────────────────┐
│         REACT APP (Frontend)            │
│  SessionContext + Toaster + Routes      │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴───────┐
        │  services/    │
        │   api.ts      │
        └───────┬───────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
┌─────────────┐   ┌─────────────────┐
│  NETLIFY    │   │   FIRESTORE     │
│  FUNCTIONS  │◄─►│  (encrypted)    │
│             │   │                 │
│ • openLink  │   │ • inboxes       │
│ • listInbox │   │ • messages      │
│ • getMessage│   │ • tokens        │
│ • sendMsg   │   │ • sessions      │
│ • sendReply │   │                 │
│ • verifyPin │   └─────────────────┘
│ • setPin    │
│ • claimPend │          │
└──────┬──────┘          │
       │                 │
       └────►┌───────────▼────┐
             │  RESEND API    │
             │  (emails)      │
             └────────────────┘
```

---

## ✅ Checklist Final

- [ ] Variables ENV configurées dans Netlify
- [ ] Firebase projet créé + Service Account
- [ ] Firestore Security Rules déployées
- [ ] Resend API key configurée
- [ ] ComposePage utilise `sendMessage()`
- [ ] LettersPage utilise `listInbox()`
- [ ] LetterDetailView utilise `getMessage()`
- [ ] ReplyToLetterView utilise `sendReply()`
- [ ] PinEntryScreen utilise `verifyPin()`
- [ ] SettingsPage utilise `setPin()`
- [ ] Testé localement avec `netlify dev`
- [ ] Déployé sur Netlify
- [ ] Test E2E complet

---

**Besoin d'aide?** Vérifie les logs Netlify Functions et Firebase Console! 🚀
