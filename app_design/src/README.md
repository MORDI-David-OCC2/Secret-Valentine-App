# 💌 Secret Valentine - Application de Messages Anonymes

Une application web moderne et amusante pour envoyer des messages de Saint-Valentin anonymes (ou non) avec chiffrement end-to-end, animations fluides et support multilingue.

![Secret Valentine](https://img.shields.io/badge/Status-Ready%20to%20Deploy-brightgreen)
![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4)

---

## ✨ Fonctionnalités

### 💕 Pour les utilisateurs
- **Envoi de messages** anonymes ou signés
- **4 types de messages**: Amour, Amitié, Famille, Crush
- **Chiffrement end-to-end** (AES-256-GCM)
- **Protection par PIN** optionnelle
- **Réponses en fil** (si autorisé par l'expéditeur)
- **Notifications email** avec liens sécurisés
- **Interface multilingue** (EN/FR)
- **Design vivant** avec animations partout
- **Responsive** (optimisé mobile et desktop)

### 🔒 Sécurité
- Chiffrement AES-256-GCM côté client
- Tokens à usage unique pour les liens
- Hashing des PINs avec PBKDF2
- Rate limiting sur toutes les APIs
- Modération automatique du contenu
- Protection contre le spam

### 🎨 Design
- Interface inspirée de designs Figma
- Animations fluides avec Motion (Framer Motion)
- Couleurs contrastées et amusantes
- Cartes enveloppes pour les messages
- Transitions de page élégantes

---

## 🚀 Déploiement

### Prérequis
- Compte GitHub
- Compte Netlify (gratuit)
- Compte Firebase (gratuit)
- Compte Resend (gratuit)

### Guide Complet

**👉 Consultez [`DEPLOYMENT_GUIDE.md`](/DEPLOYMENT_GUIDE.md) pour les instructions détaillées étape par étape.**

Le guide couvre:
1. Configuration Firebase Firestore
2. Configuration Resend (emails)
3. Création des Netlify Functions
4. Intégration GitHub
5. Déploiement sur Netlify
6. Configuration des variables d'environnement
7. Tests et dépannage

---

## 📁 Structure du Projet

```
secret-valentine/
├── components/              # Composants React
│   ├── HomePage.tsx         # Page d'accueil
│   ├── ComposePage.tsx      # Composition de messages
│   ├── LettersPage.tsx      # Boîte de réception
│   ├── LetterDetailView.tsx # Vue détaillée d'un message
│   ├── ReplyToLetterView.tsx # Réponse à un message
│   ├── PinEntryScreen.tsx   # Écran de saisie du PIN
│   ├── SettingsPage.tsx     # Paramètres
│   ├── ClaimInboxPage.tsx   # Réclamation d'inbox
│   ├── InboxLinkHandler.tsx # Gestion des liens email
│   └── ui/                  # Composants UI réutilisables
│
├── services/                # Services API
│   ├── api.ts              # Wrapper des endpoints backend
│   ├── crypto.ts           # Chiffrement/déchiffrement client
│   └── firestore.ts        # Listeners Firestore temps réel
│
├── contexts/               # Contextes React
│   └── SessionContext.tsx  # Gestion session (inboxId, token, PIN)
│
├── hooks/                  # Hooks personnalisés
│   └── useInboxLink.ts    # Hook pour ouverture de liens
│
├── netlify/               # Backend Netlify Functions
│   └── functions/         # Fonctions serverless
│       ├── sendMessage.js    # Envoi de message
│       ├── listInbox.js      # Liste des messages
│       ├── getMessage.js     # Lecture message complet
│       ├── sendReply.js      # Envoi de réponse
│       ├── openLink.js       # Ouverture lien email
│       ├── verifyPin.js      # Vérification PIN
│       ├── setPin.js         # Définition/suppression PIN
│       └── claimPending.js   # Réclamation inbox par email
│
├── styles/                # Styles globaux
│   └── globals.css        # CSS global + Tailwind
│
├── imports/               # Assets Figma importés
│   ├── svg-*.ts          # SVG icons
│   └── iPhone*.tsx       # Composants design Figma
│
├── App.tsx                # Composant principal
├── netlify.toml          # Configuration Netlify
├── package.json          # Dépendances
├── tsconfig.json         # Configuration TypeScript
├── vite.config.ts        # Configuration Vite
└── .gitignore            # Fichiers à ignorer

docs/                      # Documentation
├── DEPLOYMENT_GUIDE.md    # 📖 Guide de déploiement complet
├── INTEGRATION.md         # Documentation intégration backend
├── BACKEND_FUNCTIONS_REFERENCE.md # Référence des fonctions
├── QUICK_START.md         # Démarrage rapide
└── CODE_SNIPPETS_INTEGRATION.md # Snippets de code
```

---

## 🛠️ Développement Local

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/VOTRE_USERNAME/secret-valentine.git
cd secret-valentine

# Installer les dépendances
npm install
```

### Configuration locale

Créez un fichier `.env` à la racine:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
API_EMAIL_KEY=re_xxxxxxxxxxxxx
EMAIL_VALENTINE=noreply@votredomaine.com
EMAIL_BASE_URL=http://localhost:8888
RECOVERY_KEY_B64=your_base64_key
PIN_PEPPER=your_pepper_secret
```

### Lancer en développement

```bash
# Avec Netlify Dev (pour tester les functions)
npm install -g netlify-cli
netlify dev

# Ou juste le frontend
npm run dev
```

L'app sera disponible sur `http://localhost:8888` (ou `http://localhost:5173` avec Vite seul)

---

## 🏗️ Technologies Utilisées

### Frontend
- **React 18.3** - Framework UI
- **TypeScript 5.4** - Typage statique
- **Tailwind CSS 4.0** - Styles utilitaires
- **Motion (Framer Motion)** - Animations
- **Vite 5.2** - Build tool ultra-rapide

### Backend
- **Netlify Functions** - Serverless functions
- **Firebase Firestore** - Base de données NoSQL
- **Resend** - Service d'envoi d'emails
- **Web Crypto API** - Chiffrement natif

### Sécurité
- **AES-256-GCM** - Chiffrement messages
- **PBKDF2** - Hashing PINs
- **Rate Limiting** - Protection DDoS
- **Content Moderation** - Filtrage automatique

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [`DEPLOYMENT_GUIDE.md`](/DEPLOYMENT_GUIDE.md) | 🚀 Guide complet de déploiement (COMMENCEZ ICI) |
| [`INTEGRATION.md`](/INTEGRATION.md) | 🔌 Documentation technique d'intégration backend |
| [`BACKEND_FUNCTIONS_REFERENCE.md`](/BACKEND_FUNCTIONS_REFERENCE.md) | 📚 Référence des 7 Netlify Functions |
| [`QUICK_START.md`](/QUICK_START.md) | ⚡ Démarrage rapide pour les développeurs |
| [`CODE_SNIPPETS_INTEGRATION.md`](/CODE_SNIPPETS_INTEGRATION.md) | 💻 Snippets de code réutilisables |

---

## 🔄 Workflow Utilisateur

### 1. Alice envoie un message à Bob

```
Alice (ComposePage)
  ↓ Remplit formulaire (email bob@example.com, message, type)
  ↓ Clique "Send Letter"
  ↓
sendMessage() API
  ↓ Backend chiffre le message (AES-256-GCM)
  ↓ Stocke dans Firestore
  ↓ Crée un token unique
  ↓ Envoie email à Bob avec lien
```

### 2. Bob reçoit et lit le message

```
Bob clique sur le lien email
  ↓ URL: /#/inbox?t=abc123
  ↓
InboxLinkHandler
  ↓ Appelle openLink(token)
  ↓ Récupère inboxId + sessionToken
  ↓ Si PIN requis → PinEntryScreen
  ↓
LettersPage
  ↓ Appelle listInbox()
  ↓ Affiche preview des messages
  ↓ Bob clique sur le message d'Alice
  ↓
LetterDetailView
  ↓ Appelle getMessage()
  ↓ Déchiffre et affiche le message complet
```

### 3. Bob répond (si autorisé)

```
ReplyToLetterView
  ↓ Bob tape sa réponse
  ↓ Clique "Send Reply"
  ↓
sendReply() API
  ↓ Backend chiffre la réponse
  ↓ Stocke dans Firestore (thread)
  ↓ Envoie notification email à Alice
```

---

## 🔐 Sécurité et Chiffrement

### Architecture de chiffrement

```
Message d'Alice → [AES-256-GCM encryption] → Firestore
                        ↑
                 Recovery Key (serveur)
                        ↓
Firestore → [AES-256-GCM decryption] → Message pour Bob
```

### Points clés:
- **Messages chiffrés au repos** (Firestore)
- **Clés de chiffrement uniques** par inbox
- **Recovery key** stockée de manière sécurisée côté serveur
- **Pas de clés côté client** (pas de localStorage)
- **Tokens à usage unique** pour les liens email
- **PINs hashés** avec PBKDF2 (jamais en clair)

---

## 🧪 Tests

### Tests manuels recommandés

1. **Envoi de message**
   - Formulaire complet → email reçu
   - Message anonyme → nom "Secret Admirer"
   - Message avec réponse autorisée

2. **Réception et lecture**
   - Lien email → ouverture inbox
   - Avec PIN → demande de code
   - Sans PIN → accès direct
   - Preview dans liste
   - Message complet

3. **Réponses**
   - Réponse si autorisé
   - Pas de bouton si non autorisé
   - Thread de conversation

4. **Sécurité**
   - Rate limiting (trop de requêtes)
   - Modération (mots bloqués)
   - PIN incorrect → refus accès

---

## 🌍 Support Multilingue

L'application supporte:
- 🇬🇧 **Anglais** (EN)
- 🇫🇷 **Français** (FR)

Les traductions sont intégrées dans chaque composant avec un système de clés.

---

## 📊 Quotas et Limites (Plan Gratuit)

### Netlify
- ✅ 100 GB bandwidth/mois
- ✅ 300 minutes build/mois
- ✅ 125K function invocations/mois

### Firebase Firestore
- ✅ 50K lectures/jour
- ✅ 20K écritures/jour
- ✅ 1 GB stockage

### Resend
- ✅ 100 emails/jour (domaine test)
- ✅ 3000 emails/mois (domaine vérifié)

**💡 Ces quotas sont largement suffisants pour démarrer!**

---

## 🐛 Dépannage Courant

### "Function not found"
- Vérifiez que `/netlify/functions/` existe
- Vérifiez `netlify.toml`: `functions = "netlify/functions"`
- Redéployez

### "Firebase connection failed"
- Vérifiez `FIREBASE_SERVICE_ACCOUNT_JSON` (une seule ligne)
- Vérifiez que Firestore est activé
- Vérifiez les logs Netlify

### "Email not sent"
- Vérifiez `API_EMAIL_KEY` dans Netlify
- Vérifiez votre quota Resend
- Vérifiez les logs Resend

### Plus de détails
👉 Consultez la section "Dépannage" dans [`DEPLOYMENT_GUIDE.md`](/DEPLOYMENT_GUIDE.md)

---

## 🤝 Contribution

Ce projet est en développement actif. Pour contribuer:

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add: Amazing feature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📝 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 👥 Auteurs

Créé avec ❤️ par **D&F**

- Design: Basé sur des frames Figma personnalisés
- Développement: React + TypeScript + Netlify Functions
- Backend: Firebase Firestore + Resend

---

## 🙏 Remerciements

- **Figma** pour les outils de design
- **Netlify** pour l'hébergement et les functions
- **Firebase** pour Firestore
- **Resend** pour l'envoi d'emails
- **Motion (Framer Motion)** pour les animations
- **Tailwind CSS** pour le styling
- **Lucide Icons** pour les icônes

---

## 📞 Support

Besoin d'aide?
1. 📖 Lisez [`DEPLOYMENT_GUIDE.md`](/DEPLOYMENT_GUIDE.md)
2. 🔍 Consultez [`INTEGRATION.md`](/INTEGRATION.md)
3. 💬 Ouvrez une issue sur GitHub

---

## 🎉 Let's Spread Love!

**URL du site**: https://votre-site.netlify.app

Partagez l'amour, envoyez des messages! 💌✨

---

**Made with 💖 by D&F**
