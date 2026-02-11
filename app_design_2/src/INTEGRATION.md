# 🔐 Guide d'Intégration Backend - Secret Valentine

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Configuration Firebase](#configuration-firebase)
4. [Netlify Functions](#netlify-functions)
5. [Flux utilisateur](#flux-utilisateur)
6. [Intégration frontend](#intégration-frontend)
7. [Sécurité et chiffrement](#sécurité-et-chiffrement)

---

## Vue d'ensemble

L'application Secret Valentine utilise une architecture backend **Netlify Functions + Firestore** avec **chiffrement end-to-end** des messages et **envoi d'emails via Resend**.

### Technologies

- **Frontend**: React + TypeScript
- **Backend**: Netlify Functions (Node.js)
- **Database**: Firebase Firestore
- **Email**: Resend API
- **Crypto**: AES-256-GCM (Web Crypto API côté client)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REACT APP (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   HomePage   │  │  ComposePage │  │  LettersPage │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                │                 │           │
│           └────────────────┴─────────────────┘           │
│                            │                             │
└────────────────────────────┼─────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │   SessionContext        │
                │   (auth state)          │
                └────────────┬────────────┘
                             │
                ┌────────────┴────────────┐
                │    services/api.ts      │
                │  (API wrapper)          │
                └────────────┬────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ NETLIFY        │  │   FIRESTORE    │  │   RESEND API   │
│ FUNCTIONS      │  │   (encrypted   │  │   (emails)     │
│ (/.netlify/    │◄─┤    messages)   │  │                │
│  functions/)   ├─►│                │  │                │
│                ├─►│                ├─►│                │
└────────────────┘  └────────────────┘  └────────────────┘
```

---

## Configuration Firebase

### 1. Créer un projet Firebase

1. Va sur [Firebase Console](https://console.firebase.google.com/)
2. Crée un nouveau projet "secret-valentine"
3. Active Firestore Database (mode production)
4. Télécharge le Service Account JSON

### 2. Configuration Netlify

Ajoute ces variables d'environnement dans Netlify:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
API_EMAIL_KEY=re_xxxxx  # Resend API key
EMAIL_VALENTINE=noreply@yourdo main.com
EMAIL_BASE_URL=https://yoursite.netlify.app
```

### 3. Structure Firestore

Collections:

```
inboxes/{inboxId}
  ├── activatedAt: timestamp
  ├── pinHash: string (optional)
  ├── pinSalt: string (optional)
  ├── pinIter: number (optional)
  ├── cryptoVersion: 1
  ├── recoveryKeyPublic: string
  ├── recoveryKeyPrivate: { ct, iv, tag }
  │
  ├── messages/{messageId}
  │   ├── fromName: string
  │   ├── type: "love"|"friendship"|"family"|"crush"
  │   ├── bodyEnc: { alg, iv, ct, tag }
  │   ├── dekWrapped: { alg, iv, ct, tag }
  │   ├── cryptoVersion: 1
  │   ├── replyEnabled: boolean
  │   ├── replyToInboxId: string (if replyEnabled)
  │   ├── unread: boolean
  │   ├── hasReplies: boolean
  │   ├── createdAt: timestamp
  │   └── replies/{replyId}
  │       ├── bodyEnc: { ... }
  │       └── createdAt: timestamp
  │
  └── sessions/{sessionTokenHash}
      ├── expiresAt: timestamp
      ├── inboxKeyEnc: { ct, iv, tag } (optional)
      └── createdAt: timestamp

tokens/{tokenHash}
  ├── inboxId: string
  ├── purpose: "open"|"reply"
  ├── expiresAt: timestamp
  └── createdAt: timestamp

rateLimits/{docId}
  ├── action: string
  ├── keyHash: string
  ├── windowId: number
  ├── count: number
  └── expiresAt: timestamp
```

---

## Netlify Functions

### 📁 `/netlify/functions/`

#### 1. **cryptoWrap.js** - Chiffrement AES-GCM

**Rôle**: Wrapper pour chiffrer/déchiffrer avec AES-256-GCM

```javascript
// seal(key32, plaintextBuf) → { alg, iv, ct, tag }
// open(key32, wrapped) → plaintextBuf
```

**Usage**: Serveur-only, utilisé par toutes les functions

---

#### 2. **openLink.js** - Ouvrir un lien inbox

**Endpoint**: `POST /.netlify/functions/openLink`

**Input**:
```json
{ "token": "base64url..." }
```

**Output**:
```json
{
  "ok": true,
  "inboxId": "inbox_xxx",
  "pinRequired": true,
  "sessionToken": null  // ou string si pas de PIN
}
```

**Cas d'usage**:
1. Utilisateur clique sur lien email
2. Frontend extrait `?t=token` de l'URL
3. Appelle `openLink(token)`
4. Si `pinRequired=true` → affiche écran PIN
5. Si `pinRequired=false` → stocke `sessionToken` et affiche inbox

**Erreurs**:
- `401`: Token invalide/expiré
- `404`: Inbox introuvable
- `429`: Rate limit

---

#### 3. **verifyPin.js** - Vérifier PIN et créer session

**Endpoint**: `POST /.netlify/functions/verifyPin`

**Input**:
```json
{
  "inboxId": "inbox_xxx",
  "pin": "1234",
  "mode": "verify"
}
```

**Output**:
```json
{
  "ok": true,
  "verified": true,
  "pinRequired": true,
  "sessionToken": "base64url..."
}
```

**Cas d'usage**:
1. Utilisateur entre son PIN
2. Backend vérifie avec PBKDF2 (120k iterations)
3. Si correct → crée session valable 7 jours
4. Stocke `inboxKeyEnc` dans la session (pour déchiffrement)

**Rate limit**: 15 tentatives / 60s

---

#### 4. **setPin.js** - Définir/supprimer PIN

**Endpoint**: `POST /.netlify/functions/setPin`

**Input**:
```json
{
  "inboxId": "inbox_xxx",
  "pin": "1234",  // ou null pour supprimer
  "sessionToken": "..."  // requis si PIN déjà existant
}
```

**Output**:
```json
{
  "ok": true,
  "updated": true  // ou "removed": true
}
```

**Sécurité**:
- Si PIN existe déjà → exige `sessionToken` valide
- Suppression du PIN → révoque toutes les sessions

---

#### 5. **sendMessage.js** - Envoyer un message

**Endpoint**: `POST /.netlify/functions/sendMessage`

**Input**:
```json
{
  "toEmail": "dest@example.com",
  "fromName": "Alice",
  "fromEmail": "alice@example.com",  // optionnel
  "replyAllowed": true,
  "type": "love",  // "love"|"friendship"|"family"|"crush"
  "stickerId": "heart_01",
  "body": "Happy Valentine's Day! 💕"
}
```

**Output**:
```json
{
  "ok": true,
  "inboxId": "inbox_xxx",
  "messageId": "msg_xxx",
  "emailed": true,
  "quarantined": false,
  "moderationStatus": "allow"
}
```

**Flux**:
1. Crée/récupère inbox pour `toEmail`
2. **Chiffre** le message:
   - Génère DEK (Data Encryption Key) random 32 bytes
   - Chiffre `body` avec DEK → `bodyEnc`
   - Chiffre DEK avec `inboxKey` → `dekWrapped`
3. Stocke dans Firestore `inboxes/{inboxId}/messages/{messageId}`
4. Si `replyAllowed=true` → crée copie dans inbox expéditeur
5. Crée token d'accès (`purpose:"open"`)
6. Envoie email via Resend avec lien

**Modération**:
- Si `moderateText()` retourne `block` → 400 erreur
- Si `quarantine` → stocke mais n'envoie pas l'email

**Rate limit**: 10 messages / 60s par IP

---

#### 6. **sendReply.js** - Répondre à un message

**Endpoint**: `POST /.netlify/functions/sendReply`

**Input**:
```json
{
  "inboxId": "inbox_xxx",
  "messageId": "msg_xxx",
  "body": "Thank you for your message!",
  "sessionToken": "..."
}
```

**Output**:
```json
{
  "ok": true,
  "replyId": "reply_xxx"
}
```

**Flux**:
1. Vérifie `sessionToken` valide
2. Charge message original → récupère `replyToInboxId`
3. **Chiffre** la réponse pour les 2 inbox (expéditeur + destinataire)
4. Stocke les 2 copies dans Firestore
5. Met à jour `lastPreviewEnc` du thread
6. Si l'autre n'a jamais activé son inbox → envoie email "first reply"

**Rate limit**: 20 réponses / 60s

---

#### 7. **rateLimit.js** - Helper rate limiting

**Usage interne** par les autres functions:

```javascript
await rateLimit(db, {
  action: 'sendMessage',
  key: ipAddress,
  limit: 10,
  windowSec: 60
});
```

Stocke compteurs dans Firestore `rateLimits/{docId}`

---

## Flux utilisateur

### 📮 Scénario 1: Envoyer un message (Alice → Bob)

```
1. Alice ouvre /compose
2. Remplit: toEmail=bob@x.com, fromName="Alice", body="Hi Bob!"
3. Click "Send Letter"
   │
   ├─► POST /sendMessage
   │   ├─► Crée inbox pour bob@x.com si n'existe pas
   │   ├─► Génère DEK random
   │   ├─► Chiffre message: bodyEnc = AES(DEK, "Hi Bob!")
   │   ├─► Chiffre DEK: dekWrapped = AES(inboxKey, DEK)
   │   ├─► Stocke dans Firestore
   │   ├─► Crée token: t=abc123
   │   └─► Envoie email à bob@x.com avec lien: /#/inbox?t=abc123
   │
4. Alice voit "Message sent! ✅"
```

### 📬 Scénario 2: Bob ouvre son inbox

```
1. Bob clique sur lien: /#/inbox?t=abc123
2. Frontend extrait token
3. POST /openLink { token: "abc123" }
   │
   ├─► Vérifie token existe et pas expiré
   ├─► Charge inbox: pinRequired = false
   └─► Retourne { inboxId, pinRequired: false, sessionToken: "xyz" }
   │
4. Frontend stocke sessionToken dans localStorage
5. Charge messages depuis Firestore en temps réel
6. Pour chaque message:
   ├─► Récupère inboxKey depuis session (ou recovery)
   ├─► Déchiffre DEK: DEK = decrypt(inboxKey, dekWrapped)
   ├─► Déchiffre body: plaintext = decrypt(DEK, bodyEnc)
   └─► Affiche "Hi Bob!"
```

### 🔐 Scénario 3: Bob définit un PIN

```
1. Bob va dans Settings
2. Entre PIN: "1234"
3. POST /setPin { inboxId, pin: "1234", sessionToken }
   │
   ├─► Génère salt random
   ├─► Hash: pinHash = PBKDF2("1234", salt, 120k iterations)
   ├─► Stocke pinHash, pinSalt, pinIter
   └─► Révoque toutes les sessions
   │
4. Bob fermé l'onglet
5. Ré-ouvre lien → openLink retourne pinRequired=true
6. Affiche écran PIN
7. Bob entre "1234"
8. POST /verifyPin { inboxId, pin: "1234" }
   │
   ├─► Vérifie PBKDF2(pin, salt) == pinHash
   ├─► Crée nouvelle session valable 7 jours
   └─► Retourne sessionToken
   │
9. Frontend stocke sessionToken → accès inbox
```

### 💬 Scénario 4: Bob répond à Alice

```
1. Bob clique "Reply" sur le message d'Alice
2. Écrit: "Thank you Alice!"
3. POST /sendReply { inboxId, messageId, body, sessionToken }
   │
   ├─► Vérifie session valide
   ├─► Charge message original → récupère replyToInboxId (Alice)
   ├─► Chiffre réponse pour inbox Bob
   ├─► Chiffre réponse pour inbox Alice
   ├─�� Stocke les 2 dans Firestore
   └─► Si Alice n'a jamais activé → envoie email "first reply"
   │
4. Alice reçoit email + peut voir la réponse dans son inbox
```

---

## Intégration frontend

### 1. Setup SessionContext

Enveloppe l'app dans `App.tsx`:

```tsx
import { SessionProvider } from './contexts/SessionContext';
import { Toaster } from 'sonner@2.0.3';

export default function App() {
  return (
    <SessionProvider>
      <Toaster position="top-center" richColors />
      {/* ... ton app ... */}
    </SessionProvider>
  );
}
```

### 2. Route d'ouverture de lien

Dans `App.tsx`, détecte `?t=token`:

```tsx
import { useEffect, useState } from 'react';
import InboxLinkHandler from './components/InboxLinkHandler';
import { useSession } from './contexts/SessionContext';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const { session } = useSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const t = params.get('t');
    if (t) {
      setToken(t);
    }
  }, []);

  if (token && !session.inboxId) {
    return (
      <InboxLinkHandler
        token={token}
        onSuccess={(inboxId, needsPin) => {
          if (!needsPin) {
            // Redirige vers inbox
            setCurrentPage('letters');
          } else {
            // Affiche écran PIN
            setCurrentPage('pin');
          }
          setToken(null);
        }}
        onError={() => {
          setToken(null);
          setCurrentPage('home');
        }}
        language={language}
      />
    );
  }

  // ... reste de ton app
}
```

### 3. Envoyer un message

Dans `ComposePage.tsx`:

```tsx
import { sendMessage } from '../services/api';
import { toast } from 'sonner@2.0.3';

const handleSubmit = async () => {
  if (!toEmail || !message || !selectedType) {
    toast.error('Remplis tous les champs!');
    return;
  }

  setIsSending(true);

  try {
    const response = await sendMessage({
      toEmail,
      fromName: isAnonymous ? 'Secret Admirer' : fromName,
      fromEmail: replyAllowed ? fromEmail : undefined,
      replyAllowed,
      type: selectedType === 'friend' ? 'friendship' : selectedType,
      body: message
    });

    if (response.quarantined) {
      toast.warning('Message en attente de modération');
    } else if (response.emailed) {
      toast.success('Message envoyé! 💌');
    }

    onBack(); // Retour home
  } catch (error: any) {
    toast.error(error.message || 'Erreur lors de l\'envoi');
  } finally {
    setIsSending(false);
  }
};
```

### 4. Charger les messages (LettersPage)

```tsx
import { useEffect, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { subscribeToMessages } from '../services/firestore';
import { decryptMessage } from '../services/crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Init Firebase (à faire une seule fois)
const firebaseConfig = { /* ton config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function LettersPage() {
  const { session } = useSession();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.inboxId || !session.sessionToken) return;

    const unsubscribe = subscribeToMessages(
      db,
      session.inboxId,
      async (encryptedMessages) => {
        // Déchiffrer chaque message
        const decrypted = await Promise.all(
          encryptedMessages.map(async (msg) => {
            try {
              const plaintext = await decryptMessage(
                session.inboxKey, // récupéré de la session
                msg.dekWrapped,
                msg.bodyEnc
              );
              return {
                id: msg.id,
                from: msg.fromName,
                type: msg.type,
                message: plaintext,
                date: msg.createdAt.toDate().toLocaleDateString()
              };
            } catch (error) {
              console.error('Decrypt error:', error);
              return null;
            }
          })
        );

        setLetters(decrypted.filter(Boolean));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session.inboxId, session.sessionToken]);

  // ... render
}
```

### 5. Écran PIN

Dans `PinEntryScreen.tsx`:

```tsx
import { verifyPin } from '../services/api';
import { useSession } from '../contexts/SessionContext';

const handleVerify = async () => {
  try {
    const response = await verifyPin(session.inboxId!, pin);
    
    if (response.verified && response.sessionToken) {
      // Succès!
      unlock(response.sessionToken);
      onSuccess();
    }
  } catch (error: any) {
    if (error.message.includes('429')) {
      setError('Trop de tentatives. Réessaye plus tard.');
    } else {
      setError('PIN incorrect');
    }
  }
};
```

---

## Sécurité et chiffrement

### 🔐 Modèle de sécurité

1. **Chiffrement serveur-side** (Netlify Functions):
   - Messages chiffrés avec AES-256-GCM
   - Clé unique par inbox (`inboxKey`)
   - DEK (Data Encryption Key) unique par message

2. **Déchiffrement client-side** (Web Crypto API):
   - Le serveur ne peut jamais lire les messages
   - Seul le destinataire peut déchiffrer (avec `inboxKey`)

3. **Recovery mechanism**:
   - `recoveryKeyPrivate` chiffré avec `recoveryKeyPublic`
   - Permet au serveur de recréer `inboxKey` pour nouvelles sessions

4. **PIN protection** (optionnel):
   - PBKDF2 avec 120,000 iterations
   - Salt unique par inbox
   - Rate limiting: 15 tentatives / 60s

### 🛡️ Bonnes pratiques

- ✅ Toujours vérifier `sessionToken` côté backend
- ✅ Utiliser rate limiting pour éviter les abus
- ✅ Valider tous les inputs (longueur, format email, etc.)
- ✅ Ne jamais exposer `inboxKey` en clair
- ✅ Configurer Firestore Rules pour limiter l'accès
- ✅ Utiliser HTTPS uniquement

### 📝 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tokens: lecture seule pour le backend
    match /tokens/{tokenHash} {
      allow read, write: if false;
    }

    // Inboxes: pas d'accès direct client
    match /inboxes/{inboxId} {
      allow read, write: if false;
      
      // Messages: lecture si session valide (à implémenter avec custom claims)
      match /messages/{messageId} {
        allow read: if false; // Backend seulement
      }
    }

    // Rate limits: backend seulement
    match /rateLimits/{docId} {
      allow read, write: if false;
    }
  }
}
```

**Note**: Pour un accès client sécurisé, utilise Firebase Authentication + Custom Claims pour valider les sessions.

---

## 📦 Checklist de déploiement

### Backend (Netlify)

- [ ] Créer projet Netlify
- [ ] Ajouter variables d'environnement:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - `API_EMAIL_KEY`
  - `EMAIL_VALENTINE`
  - `EMAIL_BASE_URL`
- [ ] Déployer functions dans `/netlify/functions/`
- [ ] Tester chaque endpoint avec curl/Postman

### Firebase

- [ ] Créer projet Firebase
- [ ] Activer Firestore
- [ ] Télécharger Service Account JSON
- [ ] Configurer Security Rules
- [ ] Créer indexes si nécessaire:
  ```
  inboxes/{inboxId}/messages
    - createdAt (DESC)
  ```

### Resend

- [ ] Créer compte Resend
- [ ] Obtenir API key
- [ ] Vérifier domaine d'envoi (ou utiliser sandbox)
- [ ] Tester envoi d'email

### Frontend

- [ ] Installer dépendances:
  ```bash
  npm install firebase sonner motion
  ```
- [ ] Configurer Firebase config dans `firebase/config.ts`
- [ ] Tester localement avec Netlify Dev:
  ```bash
  netlify dev
  ```
- [ ] Build et déployer

---

## 🐛 Debug et logs

### Logs Netlify Functions

```bash
netlify functions:log openLink
```

### Logs Firestore

Dans Firebase Console → Firestore → Usage

### Tester API localement

```bash
curl -X POST http://localhost:8888/.netlify/functions/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "toEmail": "test@example.com",
    "fromName": "Test",
    "type": "love",
    "body": "Test message"
  }'
```

---

## 📚 Ressources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Resend Docs](https://resend.com/docs)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**Besoin d'aide?** Vérifie les logs Netlify et Firebase pour identifier les erreurs! 🔍
