# ⚡ Quick Start - Backend Intégration

## 📦 Ce qui existe déjà ✅

### Services (`/services/`)
- ✅ `api.ts` - Tous les endpoints (claimPending, openLink, verifyPin, setPin, listInbox, getMessage, sendMessage, sendReply)
- ✅ `crypto.ts` - Déchiffrement AES-GCM client-side
- ✅ `firestore.ts` - Listeners Firestore temps réel

### Context & Hooks (`/contexts/`, `/hooks/`)
- ✅ `SessionContext.tsx` - Gère inboxId, sessionToken, locked state (localStorage)
- ✅ `useInboxLink.ts` - Hook pour ouverture token

### Composants (`/components/`)
- ✅ `InboxLinkHandler.tsx` - Écran ouverture lien email
- ✅ `ClaimInboxPage.tsx` - Page "Access my inbox" via email

### App Principal
- ✅ `App.tsx` - SessionProvider + Toaster + routing token (détection `?t=`)
- ✅ `HomePage.tsx` - Bouton "Access my inbox" ajouté

### Documentation
- ✅ `INTEGRATION.md` - Guide complet 500+ lignes
- ✅ `BACKEND_FUNCTIONS_REFERENCE.md` - Référence détaillée de chaque function
- ✅ `CODE_SNIPPETS_INTEGRATION.md` - Snippets prêts à coller
- ✅ `BACKEND_INTEGRATION_GUIDE.md` - Checklist et steps

---

## 🚧 À faire maintenant (5 fichiers)

### 1. **ComposePage.tsx** - Envoyer via API
**Temps**: ~10 min

```tsx
// Ajouter états
const [toEmail, setToEmail] = useState('');
const [fromEmail, setFromEmail] = useState('');
const [replyAllowed, setReplyAllowed] = useState(false);

// Remplacer handleSubmit par appel sendMessage()
// Voir CODE_SNIPPETS_INTEGRATION.md section ComposePage
```

**Checklist**:
- [ ] Import `sendMessage` depuis `../services/api`
- [ ] Ajouter champ email destinataire (UI)
- [ ] Ajouter checkbox "Allow replies"
- [ ] Si replyAllowed, afficher input fromEmail
- [ ] Appeler `sendMessage()` au submit
- [ ] Gérer erreurs (429, block, quarantine)
- [ ] Toast success/error

---

### 2. **LettersPage.tsx** - Charger via listInbox
**Temps**: ~8 min

```tsx
// useEffect pour charger messages
useEffect(() => {
  const loadMessages = async () => {
    const response = await listInbox(session.inboxId!, session.sessionToken!);
    setMessages(response.messages);
  };
  loadMessages();
}, []);
```

**Checklist**:
- [ ] Import `listInbox` et `useSession`
- [ ] Supprimer prop `letters: Letter[]`
- [ ] État local `messages: InboxMessage[]`
- [ ] useEffect: appelle `listInbox()`
- [ ] Loading state (animation 💌)
- [ ] Mapper `InboxMessage` → `Letter` pour compatibilité
- [ ] Gestion erreurs 401, 429

---

### 3. **LetterDetailView.tsx** - Charger via getMessage
**Temps**: ~10 min

```tsx
// Remplacer prop `letter` par `messageId`
interface Props {
  messageId: string;
  onClose: () => void;
  // ...
}

// useEffect pour charger message + replies
useEffect(() => {
  const load = async () => {
    const response = await getMessage(inboxId, messageId, sessionToken);
    setMessage(response.message);
    setReplies(response.replies);
  };
  load();
}, [messageId]);
```

**Checklist**:
- [ ] Import `getMessage` et `useSession`
- [ ] Props: `messageId` (remplace `letter`)
- [ ] États: `message`, `replies`, `loading`
- [ ] useEffect: appelle `getMessage()`
- [ ] Affiche replies (thread)
- [ ] Bouton Reply si `message.replyEnabled`

---

### 4. **ReplyToLetterView.tsx** - Envoyer via sendReply
**Temps**: ~5 min

```tsx
const handleSend = async () => {
  await sendReply({
    inboxId: session.inboxId!,
    messageId,
    body: replyText,
    sessionToken: session.sessionToken!
  });
  toast.success('Reply sent! 💌');
  onClose();
};
```

**Checklist**:
- [ ] Import `sendReply` et `useSession`
- [ ] handleSend appelle `sendReply()`
- [ ] Validation longueur (max 2000)
- [ ] Gestion erreurs 403, 429, block
- [ ] Toast success/error

---

### 5. **PinEntryScreen.tsx** - Vérifier via verifyPin
**Temps**: ~8 min

```tsx
// Supprimer prop correctPin
// Appeler API
const handleVerify = async () => {
  const response = await verifyPin(session.inboxId!, pin);
  if (response.sessionToken) {
    unlock(response.sessionToken);
    onSuccess();
  }
};
```

**Checklist**:
- [ ] Import `verifyPin` et `useSession`
- [ ] Supprimer prop `correctPin: string`
- [ ] handleVerify appelle `verifyPin()`
- [ ] Appelle `unlock(sessionToken)` au succès
- [ ] Gestion erreurs 401, 429
- [ ] Clear Passwordsi incorrect

---

### 6. **SettingsPage.tsx** (OPTIONNEL) - Gérer PIN
**Temps**: ~10 min

```tsx
const handleSetPin = async () => {
  await setPin(session.inboxId!, newPin, session.sessionToken!);
  toast.success('Passwordset! 🔒');
};
```

**Checklist**:
- [ ] Import `setPin` et `useSession`
- [ ] UI: inputs Password+ confirm + boutons
- [ ] handleSetPin / handleRemovePin
- [ ] Validation 4-8 digits
- [ ] Gestion erreurs 401

---

## 🔧 Configuration Backend

### 1. Netlify Environment Variables

Dans **Netlify Dashboard → Site Settings → Environment Variables**:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
API_EMAIL_KEY=re_xxxxxxxxxxxxx
EMAIL_VALENTINE=noreply@yourdomaine.com
EMAIL_BASE_URL=https://votre-site.netlify.app
RECOVERY_KEY_B64=base64_string_32_bytes
PIN_PEPPER=random_secret_string
```

### 2. Firebase Setup

1. Créer projet sur https://console.firebase.google.com/
2. Activer Firestore Database (mode production)
3. Project Settings → Service Accounts → Generate New Private Key
4. Copier le JSON dans `FIREBASE_SERVICE_ACCOUNT_JSON`

### 3. Resend Setup

1. Créer compte sur https://resend.com/
2. Obtenir API key
3. Copier dans `API_EMAIL_KEY`

### 4. Netlify Functions

Créer dossier `/netlify/functions/` et y mettre tous les fichiers `.js` backend (ou déjà fait si tu as les functions).

---

## 🧪 Test Local

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Créer .env local
cat > .env << EOF
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
API_EMAIL_KEY=re_test_key
EMAIL_VALENTINE=test@test.com
EMAIL_BASE_URL=http://localhost:8888
RECOVERY_KEY_B64=test_key_base64
PIN_PEPPER=test_pepper
EOF

# Lancer dev server
netlify dev
```

App sur: http://localhost:8888

---

## 📊 Flux Complet

### Scénario: Alice envoie un message à Bob

```
1. Alice: ComposePage
   └─► sendMessage(toEmail=bob@x.com, body="Hi Bob")
       │
       ├─► Backend: chiffre message (AES-256-GCM)
       ├─► Stocke dans Firestore inboxes/bob_inbox/messages/
       ├─► Crée token: t=abc123
       └─► Envoie email via Resend à Bob
           Email contient lien: /#/inbox?t=abc123

2. Bob clique sur lien
   └─► App détecte ?t=abc123
       └─► InboxLinkHandler
           └─► openLink(token)
               │
               ├─► Si Passwordrequis → PinEntryScreen
               │   └─► verifyPin(pin) → sessionToken
               │
               └─► Si pas de Password→ sessionToken direct
                   
3. Bob unlock + voit inbox
   └─► LettersPage
       └─► listInbox(inboxId, sessionToken)
           └─► Backend déchiffre previews
               └─► Retourne liste messages
                   
4. Bob clique sur message d'Alice
   └─► LetterDetailView
       └─► getMessage(messageId)
           └─► Backend déchiffre message complet
               └─► Affiche "Hi Bob" + bouton Reply

5. Bob répond
   └─► ReplyToLetterView
       └─► sendReply(messageId, body="Thanks Alice!")
           │
           ├─► Backend chiffre pour 2 inbox (Bob + Alice)
           ├─► Stocke dans Firestore
           └─► Email notif à Alice (first reply)
```

---

## ✅ Checklist Finale

### Code Frontend
- [ ] ComposePage utilise `sendMessage()`
- [ ] LettersPage utilise `listInbox()`
- [ ] LetterDetailView utilise `getMessage()`
- [ ] ReplyToLetterView utilise `sendReply()`
- [ ] PinEntryScreen utilise `verifyPin()`
- [ ] SettingsPage utilise `setPin()` (optionnel)

### Backend Config
- [ ] Variables ENV dans Netlify
- [ ] Firebase projet créé + Service Account
- [ ] Resend API key configurée
- [ ] Netlify Functions déployées

### Tests
- [ ] Test local avec `netlify dev`
- [ ] Test sendMessage (curl)
- [ ] Test openLink via lien email
- [ ] Test Passwordverify/set
- [ ] Test listInbox
- [ ] Test getMessage
- [ ] Test sendReply

---

## 📚 Références Rapides

| Besoin | Fichier | Fonction |
|--------|---------|----------|
| Envoyer message | ComposePage | `sendMessage()` |
| Liste inbox | LettersPage | `listInbox()` |
| Lire message | LetterDetailView | `getMessage()` |
| Répondre | ReplyToLetterView | `sendReply()` |
| Vérifier Password| PinEntryScreen | `verifyPin()` |
| Définir Password| SettingsPage | `setPin()` |
| Ouvrir lien | InboxLinkHandler | `openLink()` |
| Réclamer inbox | ClaimInboxPage | `claimPending()` |

---

## 🐛 Debugging

### Logs Netlify Functions
```bash
netlify functions:log functionName
```

### Vérifier Firestore
Firebase Console → Firestore Database

### Test endpoint local
```bash
curl -X POST http://localhost:8888/.netlify/functions/sendMessage \
  -H "Content-Type: application/json" \
  -d '{"toEmail":"test@test.com","fromName":"Test","type":"love","body":"Hi"}'
```

---

## 🎯 Temps Total Estimé

- Configuration backend: **~20 min**
- Mise à jour 5 composants: **~45 min**
- Tests: **~15 min**

**Total: ~1h20** pour intégration complète

---

## 💡 Tips

1. **Commence par ComposePage** (le plus important)
2. **Teste envoi + réception email** avant de continuer
3. **Configure le Passwordaprès** (pas prioritaire)
4. **Utilise les snippets** dans `CODE_SNIPPETS_INTEGRATION.md`
5. **Vérifie les logs Netlify** si erreur 500

---

## 🆘 Besoin d'aide?

- 📖 Docs complètes: `INTEGRATION.md`
- 🔍 Référence API: `BACKEND_FUNCTIONS_REFERENCE.md`
- 💻 Code snippets: `CODE_SNIPPETS_INTEGRATION.md`
- ✅ Checklist: `BACKEND_INTEGRATION_GUIDE.md`

---

**Ready to ship! 🚀**
