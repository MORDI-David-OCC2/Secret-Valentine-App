# ⚡ Guide Express - GitHub + Netlify

**Temps total**: ~15 minutes (sans compter la création des functions)

---

## 🚀 Partie 1: GitHub (5 minutes)

### 1. Initialiser Git localement

```bash
cd /chemin/vers/votre/projet

# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Secret Valentine app ready for deployment"
```

### 2. Créer le dépôt GitHub

1. Va sur https://github.com/new
2. **Nom**: `secret-valentine` (ou autre)
3. **Visibilité**: Private (recommandé) ou Public
4. **NE COCHEZ AUCUNE OPTION** (pas de README, gitignore, license)
5. Cliquez sur **"Create repository"**

### 3. Connecter et pousser

GitHub affichera des commandes. Utilisez celles-ci:

```bash
git remote add origin https://github.com/VOTRE_USERNAME/secret-valentine.git
git branch -M main
git push -u origin main
```

✅ **Votre code est maintenant sur GitHub!**

---

## 🌐 Partie 2: Netlify (10 minutes)

### 1. Créer le site

1. Va sur https://app.netlify.com/
2. Connecte-toi (ou crée un compte)
3. Cliquez sur **"Add new site"** → **"Import an existing project"**
4. Choisissez **"Deploy with GitHub"**
5. Autorisez Netlify (si première fois)
6. Sélectionnez votre dépôt: `secret-valentine`

### 2. Configurer le build

**Build command**: `npm run build`  
**Publish directory**: `dist`  
**Functions directory**: `netlify/functions`

Cliquez sur **"Deploy site"**

### 3. Configurer les variables d'environnement

Avant que ça fonctionne, vous DEVEZ configurer ces variables:

1. Dans votre site → **Site settings** → **Environment variables**
2. Cliquez sur **"Add a variable"**
3. Ajoutez ces 6 variables:

| Variable | Où l'obtenir | Format |
|----------|--------------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Project Settings → Service Accounts | JSON complet sur 1 ligne |
| `API_EMAIL_KEY` | Resend Dashboard → API Keys | `re_xxxxxxxxxxxxx` |
| `EMAIL_VALENTINE` | Votre choix | `noreply@votredomaine.com` |
| `EMAIL_BASE_URL` | URL Netlify de votre site | `https://votre-site.netlify.app` |
| `RECOVERY_KEY_B64` | Générer (voir ci-dessous) | Base64 32 bytes |
| `PIN_PEPPER` | Générer (voir ci-dessous) | Hex 64 chars |

### 4. Générer les clés secrètes

Dans un terminal:

```bash
# RECOVERY_KEY_B64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copiez le résultat → Variable RECOVERY_KEY_B64

# PIN_PEPPER
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiez le résultat → Variable PIN_PEPPER
```

### 5. Mettre à jour EMAIL_BASE_URL

Après le premier déploiement:

1. Notez l'URL de votre site (ex: `https://charming-valentine-123.netlify.app`)
2. Retournez dans **Environment variables**
3. Modifiez `EMAIL_BASE_URL` avec cette URL
4. **Deploys** → **Trigger deploy** → **Deploy site**

✅ **Votre site est maintenant déployé!**

---

## 📋 Checklist Express

### GitHub
- [ ] `git init` fait
- [ ] `git add .` et `git commit` faits
- [ ] Dépôt GitHub créé
- [ ] `git push` vers GitHub réussi

### Netlify
- [ ] Site Netlify créé
- [ ] Connecté au dépôt GitHub
- [ ] Build settings corrects (npm run build, dist)
- [ ] 6 variables d'environnement ajoutées
- [ ] Premier déploiement lancé

### Fonctions Backend
- [ ] Dossier `/netlify/functions/` créé
- [ ] 7 fichiers .js copiés (voir BACKEND_FUNCTIONS_REFERENCE.md)
- [ ] Fichiers helper copiés (moderateText.js, crypto*.js, rateLimit.js)

---

## ⚠️ IMPORTANT: Les Netlify Functions

**Votre app ne fonctionnera PAS** tant que vous n'avez pas créé les 7 Netlify Functions dans `/netlify/functions/`.

### Où trouver le code?

📖 **Tout le code est dans**: `/BACKEND_FUNCTIONS_REFERENCE.md`

### Liste des fichiers à créer:

```
/netlify/functions/
  ├── sendMessage.js       (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  ├── listInbox.js         (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  ├── getMessage.js        (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  ├── sendReply.js         (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  ├── openLink.js          (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  ├── verifyPin.js         (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  ├── setPin.js            (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  ├── claimPending.js      (code dans BACKEND_FUNCTIONS_REFERENCE.md)
  │
  └── Helpers:
      ├── moderateText.js
      ├── cryptageInbox.js
      ├── cryptoKeys.js
      ├── cryptoWrap.js
      └── rateLimit.js
```

**Après avoir créé ces fichiers**:

```bash
git add netlify/
git commit -m "Add Netlify Functions"
git push
```

Netlify redéploiera automatiquement avec les functions! ✅

---

## 🔥 Prérequis Firebase

### Créer le projet (5 min)

1. https://console.firebase.google.com/
2. **"Add project"** → Nom: `secret-valentine`
3. Désactivez Google Analytics (optionnel)
4. **"Create project"**

### Activer Firestore (2 min)

1. Menu gauche → **"Firestore Database"**
2. **"Create database"**
3. Mode **"Production"**
4. Région: `europe-west1` (ou proche de vous)

### Télécharger Service Account (2 min)

1. ⚙️ **Settings** → **Project Settings**
2. Onglet **"Service Accounts"**
3. **"Generate New Private Key"** → Télécharger JSON
4. **GARDEZ CE FICHIER EN SÉCURITÉ** (ne jamais commit)

### Copier dans Netlify

1. Ouvrez le JSON avec un éditeur
2. Copiez **TOUT LE CONTENU** sur **UNE SEULE LIGNE**
3. Collez dans la variable `FIREBASE_SERVICE_ACCOUNT_JSON` sur Netlify

---

## 📧 Prérequis Resend

### Créer le compte (2 min)

1. https://resend.com/
2. **"Sign up"** (gratuit)
3. Vérifiez votre email

### Obtenir l'API Key (1 min)

1. Dashboard → **"API Keys"**
2. **"Create API Key"**
3. Nom: `secret-valentine`
4. Copiez la clé: `re_xxxxxxxxxxxxx`
5. Collez dans `API_EMAIL_KEY` sur Netlify

### Domaine d'envoi

**Option 1**: Utiliser `onboarding@resend.dev` (test, 100 emails/jour)  
→ Mettez `EMAIL_VALENTINE=onboarding@resend.dev`

**Option 2**: Ajouter votre domaine (production)  
→ Dashboard → **"Domains"** → Suivez les instructions DNS  
→ Mettez `EMAIL_VALENTINE=noreply@votredomaine.com`

---

## ✅ Vérification Rapide

### Après déploiement, vérifiez:

1. **Site charge**: Ouvrez l'URL Netlify
2. **Functions déployées**: Netlify → Functions → Voir les 7
3. **Test envoi**: Composez un message avec votre email
4. **Email reçu**: Vérifiez votre boîte
5. **Lien fonctionne**: Cliquez sur le lien dans l'email

---

## 🐛 Problèmes Courants

### "Function not found"
→ Créez les functions dans `/netlify/functions/`  
→ Poussez sur GitHub  
→ Netlify redéploie automatiquement

### "Firebase connection failed"
→ Vérifiez que `FIREBASE_SERVICE_ACCOUNT_JSON` est sur 1 ligne  
→ Vérifiez que Firestore est activé

### "Email not sent"
→ Vérifiez `API_EMAIL_KEY` dans Netlify  
→ Vérifiez votre quota Resend

---

## 📖 Besoin de Plus de Détails?

Ce guide est une version **ultra-rapide**. Pour le guide complet avec toutes les explications:

👉 **LISEZ**: `/DEPLOYMENT_GUIDE.md` (guide complet)

---

## 🎯 Récapitulatif

```
1. GitHub (5 min)
   ├─ git init, add, commit
   ├─ Créer dépôt GitHub
   └─ git push

2. Netlify (10 min)
   ├─ Créer site depuis GitHub
   ├─ Configurer build
   ├─ Ajouter 6 variables ENV
   └─ Deploy

3. Functions (30 min)
   ├─ Créer /netlify/functions/
   ├─ Copier les 7 functions
   └─ git push

4. Firebase (10 min)
   ├─ Créer projet
   ├─ Activer Firestore
   └─ Télécharger Service Account

5. Resend (5 min)
   ├─ Créer compte
   └─ Obtenir API Key
```

**Temps total**: ~60 minutes pour tout avoir en production! 🚀

---

## 🆘 Support

- 📖 Guide complet: `/DEPLOYMENT_GUIDE.md`
- 🔍 Référence Functions: `/BACKEND_FUNCTIONS_REFERENCE.md`
- ⚡ Démarrage rapide: `/QUICK_START.md`

---

**Prêt à déployer? Let's go! 🚀💌**
