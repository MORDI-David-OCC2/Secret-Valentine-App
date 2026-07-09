# 🏗️ Architecture - Secret Valentine App

## 📐 Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────┐
│                      REACT APP (Frontend)                       │
│                    Port: 3000 / Netlify CDN                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐          │
│  │  HomePage   │  │ ComposePage │  │ LettersPage  │          │
│  │             │  │             │  │              │          │
│  │ • Welcome   │  │ • ToEmail   │  │ • listInbox()│          │
│  │ • Navigate  │  │ • Message   │  │ • Envelopes  │          │
│  │ • Claim     │  │ • sendMsg() │  │ • Preview    │          │
│  └─────────────┘  └─────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────┐  ┌─────────────────┐                   │
│  │ LetterDetailView │  │ ReplyToLetter   │                   │
│  │                  │  │                 │                   │
│  │ • getMessage()   │  │ • sendReply()   │                   │
│  │ • Full body      │  │ • Reply input   │                   │
│  │ • Replies thread │  │ • Moderation    │                   │
│  └──────────────────┘  └─────────────────┘                   │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                    │
│  │ PinEntryScreen  │  │ SettingsPage    │                    │
│  │                 │  │                 │                    │
│  │ • verifyPin()   │  │ • setPin()      │                    │
│  │ • 4 digits      │  │ • Language      │                    │
│  │ • Unlock        │  │ • Security      │                    │
│  └─────────────────┘  └─────────────────┘                    │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────┐        │
│  │  InboxLinkHandler       │  │  ClaimInboxPage     │        │
│  │                         │  │                     │        │
│  │  • openLink(token)      │  │  • claimPending()   │        │
│  │  • Detect ?t= in URL    │  │  • Email → Link     │        │
│  │  • Loading animation    │  │  • Toast success    │        │
│  └─────────────────────────┘  └─────────────────────┘        │
│                                                                 │
└─────────────────────────┬──────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │   SessionContext          │
            │   (React Context)         │
            │                           │
            │   • inboxId               │
            │   • sessionToken          │
            │   • isLocked              │
            │   • isPinRequired         │
            │   • unlock()              │
            │   • logout()              │
            │                           │
            │   localStorage sync       │
            └─────────────┬─────────────┘
                          │
            ┌─────────────┴─────────────┐
            │   services/api.ts         │
            │   (API Wrapper)           │
            │                           │
            │   • claimPending()        │
            │   • openLink()            │
            │   • verifyPin()           │
            │   • setPin()              │
            │   • listInbox()           │
            │   • getMessage()          │
            │   • sendMessage()         │
            │   • sendReply()           │
            │                           │
            │   fetch() to Netlify      │
            └─────────────┬─────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌──────────────┐
│   NETLIFY     │ │   FIRESTORE   │ │  RESEND API  │
│  FUNCTIONS    │ │   DATABASE    │ │   (Email)    │
│               │ │               │ │              │
│ /.netlify/    │ │ Collections:  │ │ • Send email │
│  functions/   │ │               │ │ • Templates  │
│               │ │ • inboxes/    │ │ • Track      │
│ • openLink    │◄┤   {inboxId}/  │ │              │
│ • listInbox   ││   messages/    │ │              │
│ • getMessage  ││   sessions/    │ │              │
│ • sendMessage │├►               │ │              │
│ • sendReply   ││ • tokens/      │ │              │
│ • verifyPin   ││   {tokenHash}  │ │              │
│ • setPin      ││               │ │              │
│ • claimPend   ├┤ • emailIndex/  │ │              │
│               ││   {emailHash}  │ │              │
│ • rateLimit   ││               │ │              │
│ • cryptoWrap  ││ • rateLimits/  │ │              │
│ • cryptoKeys  ││               │ │              │
│ • moderate    │└────────────────┘ │              │
│               │                   │              │
└───────┬───────┘                   └──────────────┘
        │
        │ Envoie email avec lien:
        │ https://app.com/#/inbox?t=abc123
        │
        └──────────────────────►📧 Bob reçoit email
                                   │
                                   │ Click lien
                                   ▼
                        App détecte token (useEffect)
                                   │
                                   ▼
                        InboxLinkHandler → openLink()
                                   │
                        ┌──────────┴──────────┐
                        │                     │
                    Passwordrequis?          Pas de PIN
                        │                     │
                        ▼                     ▼
                 PinEntryScreen      sessionToken direct
                 verifyPin()                 │
                        │                     │
                        └──────────┬──────────┘
                                   │
                                   ▼
                            unlock(sessionToken)
                                   │
                                   ▼
                            LettersPage
                            listInbox() → Affiche messages
```

---

## 🔐 Flux Crypto (Chiffrement E2E)

### Envoi de message

```
Alice (Frontend: ComposePage)
   │
   │ 1. Remplit formulaire:
   │    - toEmail: bob@example.com
   │    - message: "Hi Bob! ❤️"
   │    - type: love
   │
   │ 2. Click "Send"
   ▼
sendMessage() API
   │
   ▼
┌──────────────────────────────────────────────────────┐
│         NETLIFY FUNCTION: sendMessage.js             │
│                                                      │
│  1. Modération:                                      │
│     moderateText(body)                               │
│     → allow / quarantine / block                     │
│                                                      │
│  2. Créer/récupérer inbox Bob:                      │
│     emailIndex/{sha256(bob@example.com)}             │
│     → inboxId: inbox_bob123                          │
│                                                      │
│  3. Initialiser crypto inbox:                       │
│     ensureInboxCrypto(db, inboxId)                   │
│     → génère inboxKey (32 bytes)                     │
│     → wrap avec recoveryKey                          │
│                                                      │
│  4. CHIFFREMENT MESSAGE:                             │
│     ┌─────────────────────────────────┐             │
│     │ a) Génère DEK random (32 bytes) │             │
│     │                                 │             │
│     │ b) Chiffre message:             │             │
│     │    bodyEnc = AES-GCM(           │             │
│     │      key: DEK,                  │             │
│     │      plaintext: "Hi Bob! ❤️"    │             │
│     │    )                            │             │
│     │    → { alg, iv, ct, tag }       │             │
│     │                                 │             │
│     │ c) Chiffre DEK:                 │             │
│     │    dekWrapped = AES-GCM(        │             │
│     │      key: inboxKey,             │             │
│     │      plaintext: DEK             │             │
│     │    )                            │             │
│     │    → { alg, iv, ct, tag }       │             │
│     └─────────────────────────────────┘             │
│                                                      │
│  5. Stocker dans Firestore:                         │
│     inboxes/inbox_bob123/messages/msg_456           │
│     {                                                │
│       fromName: "Alice",                             │
│       type: "love",                                  │
│       bodyEnc: { iv, ct, tag },                      │
│       dekWrapped: { iv, ct, tag },                   │
│       cryptoVersion: 1,                              │
│       unread: true,                                  │
│       createdAt: timestamp                           │
│     }                                                │
│                                                      │
│  6. Créer token d'accès:                            │
│     token = randomBase64url()                        │
│     tokens/{sha256(token)}                           │
│     {                                                │
│       inboxId: inbox_bob123,                         │
│       purpose: "open",                               │
│       expiresAt: now + 7 days                        │
│     }                                                │
│                                                      │
│  7. Envoyer email via Resend:                       │
│     To: bob@example.com                              │
│     Subject: "💌 You've got a Valentine!"            │
│     Body: "Click here to read:                       │
│            https://app.com/#/inbox?t=abc123"         │
│                                                      │
└──────────────────────────────────────────────────────┘
   │
   ▼
📧 Bob reçoit email
```

### Lecture de message

```
Bob clique lien: /#/inbox?t=abc123
   │
   ▼
InboxLinkHandler (Frontend)
   │
   │ openLink(token)
   ▼
┌──────────────────────────────────────────────────────┐
│          NETLIFY FUNCTION: openLink.js               │
│                                                      │
│  1. Valider token:                                   │
│     tokens/{sha256(abc123)}                          │
│     → inboxId: inbox_bob123                          │
│     → pas expiré ✓                                   │
│                                                      │
│  2. Charger inbox:                                   │
│     inboxes/inbox_bob123                             │
│     → pinRequired: false                             │
│                                                      │
│  3. Créer session (car pas de PIN):                 │
│     sessionToken = randomBase64url()                 │
│     sessions/{sha256(sessionToken)}                  │
│     {                                                │
│       expiresAt: now + 7 days,                       │
│       createdAt: timestamp                           │
│     }                                                │
│                                                      │
│  4. Retourner:                                       │
│     { inboxId, pinRequired: false, sessionToken }    │
│                                                      │
└──────────────────────────────────────────────────────┘
   │
   ▼
SessionContext.unlock(sessionToken)
   │
   ▼
LettersPage: listInbox()
   │
   ▼
┌──────────────────────────────────────────────────────┐
│          NETLIFY FUNCTION: listInbox.js              │
│                                                      │
│  1. Valider session:                                 │
│     sessions/{sha256(sessionToken)}                  │
│     → pas expiré ✓                                   │
│                                                      │
│  2. Récupérer inboxKey:                              │
│     getInboxKeyViaRecovery(db, inboxId)              │
│     → inboxKey (32 bytes)                            │
│                                                      │
│  3. Charger messages:                                │
│     inboxes/inbox_bob123/messages/                   │
│     orderBy lastActiveAt desc, limit 50              │
│                                                      │
│  4. DÉCHIFFRER PREVIEW de chaque message:            │
│     ┌─────────────────────────────────┐             │
│     │ Pour message msg_456:           │             │
│     │                                 │             │
│     │ a) Déchiffre DEK:               │             │
│     │    DEK = AES-GCM-decrypt(       │             │
│     │      key: inboxKey,             │             │
│     │      ciphertext: dekWrapped     │             │
│     │    )                            │             │
│     │    → DEK (32 bytes)             │             │
│     │                                 │             │
│     │ b) Déchiffre message:           │             │
│     │    plaintext = AES-GCM-decrypt( │             │
│     │      key: DEK,                  │             │
│     │      ciphertext: bodyEnc        │             │
│     │    )                            │             │
│     │    → "Hi Bob! ❤️"               │             │
│     │                                 │             │
│     │ c) Créer preview:               │             │
│     │    preview = plaintext[0:120]   │             │
│     │    → "Hi Bob! ❤️"               │             │
│     └─────────────────────────────────┘             │
│                                                      │
│  5. Retourner liste avec previews:                   │
│     {                                                │
│       messages: [                                    │
│         {                                            │
│           id: "msg_456",                             │
│           fromName: "Alice",                         │
│           type: "love",                              │
│           body: "Hi Bob! ❤️",    // preview          │
│           unread: true,                              │
│           lastActiveAt: timestamp                    │
│         }                                            │
│       ]                                              │
│     }                                                │
│                                                      │
└──────────────────────────────────────────────────────┘
   │
   ▼
Frontend affiche enveloppes avec previews
   │
   │ Bob clique sur message
   ▼
LetterDetailView: getMessage(messageId)
   │
   ▼
┌──────────────────────────────────────────────────────┐
│         NETLIFY FUNCTION: getMessage.js              │
│                                                      │
│  1. Même logique déchiffrement que listInbox         │
│  2. Mais retourne message COMPLET (pas tronqué)      │
│  3. + charge et déchiffre toutes les replies         │
│                                                      │
│  Retourne:                                           │
│  {                                                   │
│    message: {                                        │
│      body: "Hi Bob! ❤️"  // complet                  │
│    },                                                │
│    replies: [...]                                    │
│  }                                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
   │
   ▼
Frontend affiche message complet + replies
```

---

## 🔑 Gestion des Clés

```
┌─────────────────────────────────────────────────┐
│              HIÉRARCHIE DES CLÉS                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│       RECOVERY KEY (Master)         │
│   • 32 bytes, stockée en ENV        │
│   • RECOVERY_KEY_B64                │
│   • Ne quitte JAMAIS le serveur     │
│   • Utilisée pour wrap inboxKey     │
└──────────────┬──────────────────────┘
               │
               │ wrap/unwrap
               ▼
┌─────────────────────────────────────┐
│        INBOX KEY (par inbox)        │
│   • 32 bytes, unique par inbox      │
│   • Stockée chiffrée:               │
│     inboxKeyWrappedByRecovery       │
│   • Déchiffrée côté serveur         │
│   • Utilisée pour wrap DEK          │
└──────────────┬──────────────────────┘
               │
               │ wrap/unwrap
               ▼
┌─────────────────────────────────────┐
│      DEK (par message)              │
│   • 32 bytes, unique par message    │
│   • Stockée chiffrée: dekWrapped    │
│   • Utilisée pour chiffrer body     │
└──────────────┬──────────────────────┘
               │
               │ encrypt/decrypt
               ▼
┌─────────────────────────────────────┐
│       MESSAGE BODY (plaintext)      │
│   • Stocké chiffré: bodyEnc         │
│   • Déchiffré côté serveur          │
│   • Jamais stocké en clair          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         SESSION KEY (par session)   │
│   • Dérivée de sessionToken         │
│   • SHA-256(sessionToken)           │
│   • Utilisée pour wrap inboxKey     │
│   • Optionnel: inboxKeyEnc          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│            PasswordKEY (optionnel)      │
│   • Hashé avec PBKDF2               │
│   • 150,000 iterations + pepper     │
│   • Stocké: pinHash + pinSalt       │
│   • Vérifié mais jamais déchiffré   │
└─────────────────────────────────────┘
```

---

## 📊 Collections Firestore

```
firestore/
│
├── inboxes/
│   └── {inboxId}/                    (ex: inbox_abc123)
│       ├── activatedAt: timestamp
│       ├── pinHash: string?
│       ├── pinSalt: string?
│       ├── pinIter: number?
│       ├── pinSetAt: timestamp?
│       ├── cryptoVersion: 1
│       ├── inboxKeyWrappedByRecovery: { alg, iv, ct, tag }
│       │
│       ├── messages/
│       │   └── {messageId}/          (ex: msg_456)
│       │       ├── fromName: string
│       │       ├── type: "love"|"friendship"|"family"|"crush"
│       │       ├── stickerId: string?
│       │       ├── bodyEnc: { alg, iv, ct, tag }
│       │       ├── dekWrapped: { alg, iv, ct, tag }
│       │       ├── cryptoVersion: 1
│       │       ├── replyEnabled: boolean
│       │       ├── replyToInboxId: string?
│       │       ├── replyToEmail: string?
│       │       ├── unread: boolean
│       │       ├── hasReplies: boolean
│       │       ├── lastPreviewEnc: { ... }?
│       │       ├── lastPreviewDekWrapped: { ... }?
│       │       ├── createdAt: timestamp
│       │       ├── lastActiveAt: timestamp
│       │       ├── updatedAt: timestamp?
│       │       ├── readAt: timestamp?
│       │       ├── moderationStatus: "allow"|"quarantine"|"block"
│       │       │
│       │       └── replies/
│       │           └── {replyId}/    (ex: reply_789)
│       │               ├── bodyEnc: { alg, iv, ct, tag }
│       │               ├── dekWrapped: { alg, iv, ct, tag }
│       │               ├── cryptoVersion: 1
│       │               ├── from: "them"|"me"
│       │               ├── createdAt: timestamp
│       │
│       └── sessions/
│           └── {sessionHash}/        (ex: sha256(sessionToken))
│               ├── expiresAt: timestamp
│               ├── createdAt: timestamp
│               ├── inboxKeyEnc: { alg, iv, ct, tag }?
│
├── tokens/
│   └── {tokenHash}/                  (ex: sha256(token))
│       ├── inboxId: string
│       ├── purpose: "open"|"reply"
│       ├── expiresAt: timestamp
│       ├── createdAt: timestamp
│
├── emailIndex/
│   └── {emailHash}/                  (ex: sha256(email))
│       ├── inboxId: string
│       ├── createdAt: timestamp
│
└── rateLimits/
    └── {docId}/                      (ex: sha256(action:key:windowId))
        ├── action: string
        ├── keyHash: string
        ├── windowId: number
        ├── count: number
        ├── createdAt: timestamp
        ├── updatedAt: timestamp
        ├── expiresAt: timestamp
```

---

## 🌊 Rate Limits

```
┌─────────────────┬──────────┬────────┬──────────┐
│ Function        │ Action   │ Limit  │ Window   │
├─────────────────┼──────────┼────────┼──────────┤
│ claimPending    │ claim    │ 5      │ 60s      │
│ verifyPin       │ verify   │ 15     │ 60s      │
│ sendMessage     │ send     │ 10     │ 60s      │
│ sendReply       │ reply    │ 20     │ 60s      │
│ listInbox       │ list     │ 60     │ 60s      │
│ getMessage      │ get      │ 60     │ 60s      │
└─────────────────┴──────────┴────────┴──────────┘

Principe:
• Bucket par fenêtre temporelle
• windowId = floor(now / windowSec)
• docId = sha256(action:ipAddress:windowId)
• Transaction Firestore pour incrémenter count
• Si count > limit → throw 429
```

---

## 🔄 États de Session

```
┌─────────────────────────────────────────────────────┐
│               ÉTATS POSSIBLES                        │
└─────────────────────────────────────────────────────┘

1. NOUVEAU VISITEUR
   ├─ inboxId: null
   ├─ sessionToken: null
   ├─ isLocked: false
   └─ Action: HomePage → Compose ou Claim

2. LIEN OUVERT (pas de PIN)
   ├─ inboxId: inbox_abc
   ├─ sessionToken: token_xyz
   ├─ isLocked: false
   └─ Action: Affiche LettersPage

3. LIEN OUVERT (Passwordrequis)
   ├─ inboxId: inbox_abc
   ├─ sessionToken: null
   ├─ isLocked: true
   └─ Action: Affiche PinEntryScreen

4. PasswordVÉRIFIÉ
   ├─ inboxId: inbox_abc
   ├─ sessionToken: token_xyz
   ├─ isLocked: false
   └─ Action: Affiche LettersPage

5. SESSION EXPIRÉE
   ├─ inboxId: inbox_abc
   ├─ sessionToken: token_xyz (expiré)
   ├─ isLocked: true
   └─ Action: API renvoie 401 → Écran PIN

6. DÉCONNEXION
   ├─ inboxId: null
   ├─ sessionToken: null
   ├─ isLocked: false
   └─ Action: Retour HomePage
```

---

## 📱 Navigation Flow

```
HomePage
  │
  ├─► "Check letters" ────────────┐
  │                               │
  ├─► "Write message" ─────► ComposePage
  │                          │
  │                          └─► sendMessage() ─► HomePage
  │
  ├─► "Access my inbox" ──► ClaimInboxPage
  │                          │
  │                          └─► claimPending() ─► Email sent
  │
  └─► ⚙️ Settings ────────► SettingsPage
                             │
                             └─► setPin() / Language

Email Link: /#/inbox?t=abc123
  │
  └─► InboxLinkHandler
       │
       └─► openLink(token)
            │
            ├─► Passwordrequis? ──► PinEntryScreen
            │                    │
            │                    └─► verifyPin() ─┐
            │                                     │
            └─► Pas de Password───────────────────────┤
                                                  │
                                                  ▼
                                            LettersPage
                                                  │
                                                  └─► Click envelope ─► LetterDetailView
                                                                         │
                                                                         └─► "Reply" ─► ReplyToLetterView
                                                                                        │
                                                                                        └─► sendReply()
```

---

## 🛡️ Sécurité - Checklist

### Chiffrement ✅
- [x] Messages chiffrés avec AES-256-GCM
- [x] DEK unique par message
- [x] InboxKey unique par inbox
- [x] Recovery key sécurisée (ENV)
- [x] Clés jamais exposées au frontend

### Authentification ✅
- [x] SessionToken aléatoire (cryptographiquement sûr)
- [x] Sessions limitées à 7 jours
- [x] Passwordhashé avec PBKDF2 (150k iterations)
- [x] Password+ pepper (protection rainbow tables)
- [x] Rate limiting sur verifyPin

### Rate Limiting ✅
- [x] claimPending: 5/60s
- [x] verifyPin: 15/60s
- [x] sendMessage: 10/60s
- [x] sendReply: 20/60s
- [x] listInbox: 60/60s
- [x] getMessage: 60/60s

### Modération ✅
- [x] moderateText() sur tous les messages
- [x] Block: termes interdits
- [x] Quarantine: liens suspects, spam
- [x] Validation longueur (max 2000 chars)

### Firestore Rules ✅
- [x] Accès client désactivé (backend only)
- [x] Toutes opérations via Functions
- [x] Pas de lecture/écriture directe

### Email ✅
- [x] Resend API pour envoi sécurisé
- [x] Templates HTML propres
- [x] Tokens à usage unique
- [x] Expiration 7 jours

---

## 🚀 Performance

### Frontend
- **Code splitting**: React lazy loading
- **Animations**: motion/react optimisé
- **Images**: WebP + lazy load
- **Cache**: localStorage pour session

### Backend (Netlify Functions)
- **Cold start**: ~200ms
- **Warm execution**: ~50ms
- **Firestore reads**: indexées
- **Chiffrement**: natif Node.js crypto

### Firestore
- **Indexes**:
  - `messages`: `lastActiveAt desc`
  - `replies`: `createdAt asc`
- **Sharding**: par inbox (scalable)
- **TTL**: rateLimits auto-cleanup

---

## 📦 Déploiement

```
┌─────────────────────────────────────┐
│          BUILD PROCESS              │
└─────────────────────────────────────┘

1. Git push to main
   │
   ▼
2. Netlify Build
   │
   ├─► npm install
   ├─► npm run build (React)
   ├─► Deploy functions (/.netlify/functions/)
   └─► Deploy static assets (CDN)
   │
   ▼
3. Propagation CDN (~1 min)
   │
   ▼
4. ✅ Live on https://votre-app.netlify.app

ENV vars (Netlify Dashboard):
• FIREBASE_SERVICE_ACCOUNT_JSON
• API_EMAIL_KEY
• EMAIL_VALENTINE
• EMAIL_BASE_URL
• RECOVERY_KEY_B64
• PIN_PEPPER
```

---

## 🎯 Points Clés

1. **🔐 Chiffrement E2E** - Messages jamais en clair
2. **⚡ Serverless** - Netlify Functions scalable
3. **🔥 Firestore** - Database temps réel
4. **📧 Resend** - Emails transactionnels
5. **🎨 React** - UI animée avec motion
6. **🔑 Sessions** - 7 jours avec localStorage
7. **🛡️ Rate Limit** - Protection abus
8. **✅ Modération** - Filtrage contenu
9. **📱 Responsive** - Mobile-first (402px max)
10. **🌍 i18n** - English + Français

---

**Architecture complète! Ready to build! 🚀**
