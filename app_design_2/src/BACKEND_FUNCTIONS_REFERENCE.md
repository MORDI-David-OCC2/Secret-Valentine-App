# 📖 Référence Rapide - Netlify Functions Backend

## Table des Matières
1. [moderateText.js](#1-moderatetextjs)
2. [claimPending.js](#2-claimpendingjs)
3. [cryptageInbox.js](#3-cryptageinboxjs)
4. [cryptoKeys.js](#4-cryptokeysjs)
5. [cryptoWrap.js](#5-cryptowrapjs)
6. [openLink.js](#6-openlinkjs)
7. [verifyPin.js](#7-verifypinjs)
8. [setPin.js](#8-setpinjs)
9. [listInbox.js](#9-listinboxjs)
10. [getMessage.js](#10-getmessagejs)
11. [sendMessage.js](#11-sendmessagejs)
12. [sendReply.js](#12-sendreplyjs)
13. [rateLimit.js](#13-ratelimitjs)

---

## 1) moderateText.js

### 🎯 Rôle
Filtre serveur-side pour modérer les messages (allow/quarantine/block).

### 📥 Input
```javascript
moderateText(text: string)
```

### 📤 Output
```javascript
{
  status: "allow" | "quarantine" | "block",
  reason?: "empty" | "too_long" | "blocked_terms" | "too_many_links" | "repetition_spam" | "suspicious_terms"
}
```

### 🔍 Règles
- **block** si:
  - Vide
  - > 2000 chars
  - Contient termes bloqués (liste noire)
  
- **quarantine** si:
  - ≥ 2 liens (http/www)
  - Répétitions suspectes (aaa..., !!!...)
  - Termes suspects (nude, crypto, etc.)

### 🎨 UI/React
Aucun composant direct. Utilisé en interne par `sendMessage` et `sendReply`.

---

## 2) claimPending.js

### 🎯 Rôle
Permet à un utilisateur de réclamer sa boîte via email (crée inbox + envoie lien).

### 🌐 Endpoint
`POST /.netlify/functions/claimPending`

### 📥 Input JSON
```json
{
  "email": "user@example.com"
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "inboxId": "inbox_abc123",
  "emailed": true
}
```

### 🔥 Firestore
**Écrit**:
- `emailIndex/{sha256(email)}` → `{ inboxId, createdAt }`
- `inboxes/{inboxId}` → `{ createdAt, pinHash: null }`
- `tokens/{sha256(token)}` → `{ inboxId, purpose: "open", expiresAt }`

### 🚦 Rate Limit
- **5 requêtes / 60s** par IP

### 🌍 ENV
- `FIREBASE_SERVICE_ACCOUNT_JSON` (requis)
- `API_EMAIL_KEY` (Resend)
- `EMAIL_VALENTINE` (sender)
- `EMAIL_BASE_URL`

### 🎨 UI/React
**Composant**: `ClaimInboxPage.tsx`
- Input email
- Bouton "Send Link"
- États: loading, success (email envoyé), error (429)

---

## 3) cryptageInbox.js

### 🎯 Rôle
Gère la clé principale d'une inbox (inboxKey) et sa persistance.

### 📦 Fonctions

#### `ensureInboxCrypto(db, inboxId)`
Crée inboxKey si absente, wrap via recovery key.

**Écrit dans Firestore**:
- `inboxes/{inboxId}`:
  - `inboxKeyWrappedByRecovery`
  - `cryptoVersion: 1`

#### `storeInboxKeyInSession(db, inboxId, sessionToken, inboxKeyBuf)`
Stocke inboxKey chiffrée dans la session.

**Écrit dans Firestore**:
- `inboxes/{inboxId}/sessions/{sha256(sessionToken)}`:
  - `inboxKeyEnc: { alg, iv, ct, tag }`

#### `getInboxKeyViaRecovery(db, inboxId)`
Récupère inboxKey en la déchiffrant via recovery key.

**Lit dans Firestore**:
- `inboxes/{inboxId}.inboxKeyWrappedByRecovery`

### 🌍 ENV
- `RECOVERY_KEY_B64` (32 bytes base64)

### 🎨 UI/React
Aucun. Module serveur-only utilisé par autres functions.

---

## 4) cryptoKeys.js

### 🎯 Rôle
Primitives de génération/dérivation des clés.

### 📦 Fonctions

#### `pbkdf2Key(pin, saltB64)`
Dérive clé PIN avec PBKDF2.
- **Iterations**: 150,000
- **Hash**: SHA-256
- **Output**: 32 bytes

#### `recoveryKey()`
Retourne la recovery key depuis ENV.

#### `sessionKey(sessionToken)`
Dérive clé session via SHA-256(sessionToken).

#### `randomKey32()`
Génère 32 bytes aléatoires.

#### `randomSaltB64()`
Génère 16 bytes salt (base64).

### 🌍 ENV
- `PIN_PEPPER` (obligatoire)
- `RECOVERY_KEY_B64` (obligatoire)

### 🎨 UI/React
Aucun. Module serveur-only.

---

## 5) cryptoWrap.js

### 🎯 Rôle
Wrapper AES-256-GCM pour chiffrer/déchiffrer des buffers.

### 📦 Fonctions

#### `seal(key32, plaintextBuf)`
Chiffre avec AES-256-GCM.

**Input**:
- `key32`: Buffer 32 bytes
- `plaintextBuf`: Buffer

**Output**:
```javascript
{
  alg: "aes-256-gcm",
  iv: "base64",
  ct: "base64",
  tag: "base64"
}
```

#### `open(key32, wrapped)`
Déchiffre avec AES-256-GCM.

**Input**:
- `key32`: Buffer 32 bytes
- `wrapped`: `{ alg, iv, ct, tag }`

**Output**: Buffer plaintext

### 🎨 UI/React
Aucun. Serveur-only.

---

## 6) openLink.js

### 🎯 Rôle
Ouvre un lien token → retourne inboxId + pinRequired + sessionToken (si pas de PIN).

### 🌐 Endpoint
`POST /.netlify/functions/openLink`

### 📥 Input JSON
```json
{
  "token": "base64url_token"
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "inboxId": "inbox_abc123",
  "pinRequired": true,
  "sessionToken": "base64url..." // null si PIN requis
}
```

### 🔍 Validation
- Token existe dans `tokens/{sha256(token)}`
- Purpose === "open"
- Pas expiré (`expiresAt`)

### 🔥 Firestore
**Lit**:
- `tokens/{sha256(token)}`
- `inboxes/{inboxId}`

**Écrit**:
- `inboxes/{inboxId}`:
  - `activatedAt` (si première activation)
- `inboxes/{inboxId}/sessions/{sha256(sessionToken)}` (si pas de PIN)

### 🚦 Rate Limit
Aucun (mais protection via token unique).

### ❌ Erreurs
- `400`: Token manquant
- `401`: Token invalide/expiré
- `403`: Mauvais purpose
- `404`: Inbox introuvable

### 🎨 UI/React
**Composant**: `InboxLinkHandler.tsx`
- Affiche loading (💌 animé)
- Si erreur → message + bouton retour
- Si succès → redirige vers inbox ou écran PIN

**Hook**: `useInboxLink.ts`
- Appelle `openLink(token)`
- Gère états: loading, error, needsPin, inboxId

---

## 7) verifyPin.js

### 🎯 Rôle
Vérifie le PIN et crée une session valable 7 jours.

### 🌐 Endpoint
`POST /.netlify/functions/verifyPin`

### 📥 Input JSON
```json
{
  "inboxId": "inbox_abc123",
  "pin": "1234",
  "mode": "verify"
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "verified": true,
  "pinRequired": true,
  "sessionToken": "base64url..."
}
```

### 🔍 Validation
- PIN: 4-8 digits
- Vérifie `PBKDF2(pin, salt, 120k iter)` === `pinHash`

### 🔥 Firestore
**Lit**:
- `inboxes/{inboxId}`: `pinHash`, `pinSalt`, `pinIter`

**Écrit**:
- `inboxes/{inboxId}/sessions/{sha256(sessionToken)}`:
  - `expiresAt` (+7 jours)
  - `inboxKeyEnc` (clé déchiffrée stockée)

### 🚦 Rate Limit
- **15 tentatives / 60s** par IP

### ❌ Erreurs
- `400`: Validation
- `401`: PIN incorrect
- `404`: Inbox introuvable
- `429`: Trop de tentatives

### 🎨 UI/React
**Composant**: `PinEntryScreen.tsx`
- Input 4 digits
- Bouton "Unlock"
- États: verifying, error, success
- Appelle `verifyPin()` → stocke `sessionToken`

---

## 8) setPin.js

### 🎯 Rôle
Définir/modifier/supprimer le PIN d'une inbox.

### 🌐 Endpoint
`POST /.netlify/functions/setPin`

### 📥 Input JSON
```json
{
  "inboxId": "inbox_abc123",
  "pin": "1234", // ou null pour supprimer
  "sessionToken": "..."
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "updated": true // ou "removed": true
}
```

### 🔍 Sécurité
- Si PIN existe déjà → exige `sessionToken` valide

### 🔥 Firestore
**Écrit**:
- `inboxes/{inboxId}`:
  - `pinHash` (PBKDF2, 120k iter)
  - `pinSalt`
  - `pinIter: 120000`
  - `pinSetAt`
  
**Supprime** (si pin=null):
- Tous les champs pin*
- Toutes les sessions (`inboxes/{inboxId}/sessions/*`)

### ❌ Erreurs
- `400`: Format PIN invalide
- `401`: Session requise si PIN déjà existant
- `404`: Inbox introuvable

### 🎨 UI/React
**Composant**: `SettingsPage.tsx`
- Section "Security"
- Input PIN (4-8 digits) + confirmer
- Bouton "Set PIN" / "Remove PIN"
- Appelle `setPin()` avec `sessionToken`

---

## 9) listInbox.js

### 🎯 Rôle
Liste les threads/messages (max 50) avec preview déchiffré.

### 🌐 Endpoint
`POST /.netlify/functions/listInbox`

### 📥 Input JSON
```json
{
  "inboxId": "inbox_abc123",
  "sessionToken": "..."
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "pinRequired": false,
  "messages": [
    {
      "id": "msg_123",
      "createdAt": 1707654321000,
      "fromName": "Someone",
      "type": "love",
      "stickerId": "heart_01",
      "body": "Preview text (120 chars max)...",
      "unread": true,
      "lastActiveAt": 1707654321000,
      "replyEnabled": true
    }
  ]
}
```

### 🔍 Déchiffrement
- Charge `inboxKey` depuis session ou recovery
- Pour chaque message:
  - Si `hasReplies` → lit dernière reply
  - Déchiffre DEK puis body
  - Tronque à 120 chars pour preview

### 🔥 Firestore
**Lit**:
- `inboxes/{inboxId}/sessions/{sessionHash}` (validation)
- `inboxes/{inboxId}/messages` (orderBy `lastActiveAt desc`, limit 50)
- `inboxes/{inboxId}/messages/{id}/replies` (si hasReplies, last 1)

### 🚦 Rate Limit
- **60 requêtes / 60s** par IP

### ❌ Erreurs
- `400`: Validation
- `401`: Session invalide/expirée
- `404`: Inbox introuvable
- `429`: Rate limit

### 🎨 UI/React
**Composant**: `LettersPage.tsx`
- useEffect: charge via `listInbox()`
- Affiche liste de cards enveloppes
- Click → ouvre `LetterDetailView` (appelle `getMessage`)

**États**:
- `loading`: affiche skeleton/loader
- `messages`: array InboxMessage[]
- `error`: toast + retour home

---

## 10) getMessage.js

### 🎯 Rôle
Récupère un message complet + replies, marque comme lu.

### 🌐 Endpoint
`POST /.netlify/functions/getMessage`

### 📥 Input JSON
```json
{
  "inboxId": "inbox_abc123",
  "messageId": "msg_456",
  "sessionToken": "..."
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "message": {
    "id": "msg_456",
    "fromName": "Someone",
    "type": "love",
    "stickerId": "heart_01",
    "body": "Message complet déchiffré...",
    "unread": false,
    "replyEnabled": true,
    "createdAt": 1707654321000
  },
  "replies": [
    {
      "id": "reply_789",
      "body": "Réponse déchiffrée...",
      "from": "them", // ou "me"
      "createdAt": 1707654400000
    }
  ]
}
```

### 🔍 Déchiffrement
- Charge `inboxKey` depuis session ou recovery
- Déchiffre message principal (DEK → body)
- Déchiffre chaque reply

### 🔥 Firestore
**Lit**:
- `inboxes/{inboxId}/messages/{messageId}`
- `inboxes/{inboxId}/messages/{messageId}/replies` (orderBy `createdAt asc`, limit 200)

**Écrit**:
- `inboxes/{inboxId}/messages/{messageId}`:
  - `unread: false`
  - `readAt: serverTimestamp()`

### 🚦 Rate Limit
- **60 requêtes / 60s** par IP

### ❌ Erreurs
- `401`: Session invalide
- `404`: Message introuvable
- `429`: Rate limit

### 🎨 UI/React
**Composant**: `LetterDetailView.tsx`
- useEffect: charge via `getMessage(messageId)`
- Affiche:
  - Entête (fromName, type, sticker)
  - Body complet
  - Liste replies
  - Input "Reply" (si replyEnabled)
- Click "Reply" → ouvre `ReplyToLetterView`

---

## 11) sendMessage.js

### 🎯 Rôle
Envoyer un message chiffré + email notification via Resend.

### 🌐 Endpoint
`POST /.netlify/functions/sendMessage`

### 📥 Input JSON
```json
{
  "toEmail": "dest@example.com",
  "fromName": "Alice",
  "fromEmail": "alice@example.com", // optionnel
  "replyAllowed": true, // optionnel
  "type": "love", // "love"|"friendship"|"family"|"crush"
  "stickerId": "heart_01", // optionnel
  "body": "Your message here..."
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "inboxId": "inbox_dest",
  "messageId": "msg_abc",
  "emailed": true,
  "quarantined": false,
  "moderationStatus": "allow"
}
```

### 🔍 Modération
- Appelle `moderateText(body)`:
  - **block** → erreur 400
  - **quarantine** → stocke mais n'envoie pas l'email
  - **allow** → OK

### 🔐 Chiffrement
1. Crée/récupère inbox destinataire
2. `ensureInboxCrypto(db, inboxId)`
3. Génère DEK (Data Encryption Key) random 32 bytes
4. Chiffre body: `bodyEnc = seal(dek, utf8(body))`
5. Chiffre DEK: `dekWrapped = seal(inboxKey, dek)`
6. Stocke dans Firestore

### 🔥 Firestore
**Écrit**:
- `emailIndex/{sha256(toEmail)}` → `{ inboxId }`
- `inboxes/{inboxId}/messages/{messageId}`:
  - `fromName`, `type`, `stickerId`
  - `bodyEnc`, `dekWrapped`
  - `cryptoVersion: 1`
  - `replyEnabled`, `replyToInboxId`, `replyToEmail`
  - `unread: true`
  - `createdAt`, `lastActiveAt`
  - `moderationStatus`
  
- Si `replyAllowed`:
  - Copie dans inbox expéditeur aussi

- `tokens/{sha256(token)}` → `{ inboxId, purpose: "open", expiresAt }`

### 📧 Email (Resend)
- Envoie email à `toEmail` avec lien: `/#/inbox?t={token}`
- Sujet selon `type` (Love Letter, Friendship Note, etc.)

### 🚦 Rate Limit
- **10 messages / 60s** par IP

### ❌ Erreurs
- `400`: Validation / modération block
- `429`: Rate limit
- `500`: Erreur serveur

### 🎨 UI/React
**Composant**: `ComposePage.tsx`
- Formulaire:
  - Input `toEmail` (email destinataire)
  - Input `fromName`
  - Input `fromEmail` (si reply allowed)
  - Checkbox "Allow replies"
  - Radio type (love/friendship/family/crush)
  - Textarea `body`
- Appelle `sendMessage()` au submit
- États:
  - `sending`: affiche loader
  - `success`: toast "Message envoyé! 💌"
  - `quarantined`: toast "En attente de modération"
  - `error`: toast erreur

---

## 12) sendReply.js

### 🎯 Rôle
Répondre à un message (réplique dans 2 inbox: expéditeur + destinataire).

### 🌐 Endpoint
`POST /.netlify/functions/sendReply`

### 📥 Input JSON
```json
{
  "inboxId": "inbox_abc",
  "messageId": "msg_456",
  "body": "Reply text...",
  "sessionToken": "..."
}
```

### 📤 Output JSON (200)
```json
{
  "ok": true,
  "replyId": "reply_789"
}
```

### 🔍 Modération
- Appelle `moderateText(body)`:
  - **block** → erreur 400
  - **quarantine** → stocke mais limite notifs

### 🔐 Chiffrement
1. Vérifie session valide
2. Charge message original → récupère `replyToInboxId`
3. Charge clés des 2 inbox (moi + eux)
4. Chiffre body pour chaque inbox (2 copies)
5. Crée aussi preview chiffré (80 chars)

### 🔥 Firestore
**Lit**:
- `inboxes/{inboxId}/messages/{messageId}`:
  - `replyEnabled` (vérifie)
  - `replyToInboxId`, `replyToEmail`

**Écrit**:
- Update `messages/{messageId}` dans les 2 inbox:
  - `hasReplies: true`
  - `unread: true` (côté eux)
  - `lastActiveAt`, `updatedAt`
  - `lastPreviewEnc`, `lastPreviewDekWrapped`
  
- Crée `inboxes/{inboxId}/messages/{messageId}/replies/{replyId}`:
  - `bodyEnc`, `dekWrapped`
  - `from: "them"` ou `"me"`
  - `createdAt`

### 📧 Email "first reply"
Si l'autre inbox n'a jamais `activatedAt`:
- Crée token "open"
- Envoie email "You got a reply!"

### 🚦 Rate Limit
- **20 replies / 60s** par IP

### ❌ Erreurs
- `400`: Validation / modération
- `401`: Session invalide
- `403`: Replies disabled
- `404`: Message introuvable
- `429`: Rate limit

### 🎨 UI/React
**Composant**: `ReplyToLetterView.tsx`
- Affiche message original
- Input reply (textarea)
- Bouton "Send Reply"
- Appelle `sendReply()`
- États:
  - `sending`: loader
  - `success`: toast + ferme modal
  - `error`: toast erreur

---

## 13) rateLimit.js

### 🎯 Rôle
Helper interne pour limiter les abus (rate limiting via Firestore).

### 📦 Fonction

#### `rateLimit(db, { action, key, limit, windowSec })`

**Input**:
```javascript
{
  action: string,      // ex: "sendMessage"
  key: string,         // ex: ipAddress
  limit: number,       // ex: 10
  windowSec: number    // ex: 60
}
```

**Output**:
```javascript
{
  allowed: boolean,
  remaining: number,
  resetAt: number
}
```

**Throw**: Si `!allowed` → erreur avec code 429

### 🔍 Principe
- Bucket par fenêtre temporelle
- `windowId = floor(now / (windowSec * 1000))`
- `docId = sha256(action:key:windowId)`
- Transaction Firestore:
  - Lit `count`
  - Incrémente
  - `allowed = count <= limit`

### 🔥 Firestore
**Écrit**:
- `rateLimits/{docId}`:
  - `action`, `keyHash`, `windowId`
  - `count`, `timestamps`
  - `expiresAt` (TTL optionnel)

### 🎨 UI/React
Si erreur 429:
- Toast: "Trop de tentatives. Réessayez dans X secondes."
- Affiche `resetAt` si dispo

---

## 📊 Récap Rate Limits

| Function | Action | Limit | Window |
|----------|--------|-------|--------|
| claimPending | `claimPending` | 5 | 60s |
| verifyPin | `verifyPin` | 15 | 60s |
| sendMessage | `sendMessage` | 10 | 60s |
| sendReply | `sendReply` | 20 | 60s |
| listInbox | `listInbox` | 60 | 60s |
| getMessage | `getMessage` | 60 | 60s |

---

## 🔐 Flux Crypto Complet

### Envoi de message (sendMessage)
```
1. Backend génère DEK (32 bytes random)
2. Backend chiffre body: bodyEnc = AES-GCM(DEK, body)
3. Backend chiffre DEK: dekWrapped = AES-GCM(inboxKey, DEK)
4. Stocke { bodyEnc, dekWrapped } dans Firestore
```

### Lecture de message (getMessage)
```
1. Backend récupère inboxKey (depuis session ou recovery)
2. Backend déchiffre DEK: DEK = decrypt(inboxKey, dekWrapped)
3. Backend déchiffre body: plaintext = decrypt(DEK, bodyEnc)
4. Retourne plaintext au frontend
```

### Sécurité
- ✅ **Chiffrement** serveur-side (backend)
- ✅ **Déchiffrement** serveur-side (backend)
- ✅ Frontend ne manipule jamais les clés
- ✅ InboxKey wrappée par recovery key
- ✅ Sessions limitées à 7 jours
- ✅ PIN hashé avec PBKDF2 150k iterations

---

## 🎯 Quick Reference: Quel endpoint pour quel besoin?

| Besoin | Endpoint | Composant |
|--------|----------|-----------|
| Réclamer ma boîte | `claimPending` | ClaimInboxPage |
| Ouvrir lien email | `openLink` | InboxLinkHandler |
| Déverrouiller avec PIN | `verifyPin` | PinEntryScreen |
| Définir/changer PIN | `setPin` | SettingsPage |
| Liste mes messages | `listInbox` | LettersPage |
| Lire message complet | `getMessage` | LetterDetailView |
| Envoyer message | `sendMessage` | ComposePage |
| Répondre à message | `sendReply` | ReplyToLetterView |

---

**Need help?** Check Netlify Functions logs and Firestore Console! 🚀
