# 🚀 Guide de Déploiement - Secret Valentine

## 📋 Vue d'ensemble

Ce guide vous explique comment intégrer votre projet dans GitHub et le déployer sur Netlify avec toutes les fonctions backend.

---

## ✅ État Actuel du Projet

### ✔️ Ce qui est complété:
- Frontend React avec toutes les pages (Home, Compose, Letters, Settings)
- Intégration API complète avec les services backend
- SessionContext pour la gestion de l'authentification
- Chiffrement côté client (AES-256-GCM)
- Gestion des tokens et liens email
- Support multilingue (EN/FR)
- Animations et design complet

### 📝 Ce qui reste à faire:
1. Créer les 7 Netlify Functions backend
2. Configurer Firebase Firestore
3. Configurer Resend pour l'envoi d'emails
4. Déployer sur Netlify

---

## 📦 Étape 1: Préparer les Netlify Functions

Vous devez créer le dossier `/netlify/functions/` avec les 7 fichiers suivants:

### Structure à créer:
```
/netlify/
  /functions/
    - claimPending.js
    - openLink.js
    - verifyPin.js
    - setPin.js
    - listInbox.js
    - getMessage.js
    - sendMessage.js
    - sendReply.js
```

### Fichiers helper partagés (à placer aussi dans `/netlify/functions/`):
- `moderateText.js` - Modération de contenu
- `cryptageInbox.js` - Chiffrement serveur
- `cryptoKeys.js` - Gestion des clés
- `cryptoWrap.js` - Wrapper de chiffrement
- `rateLimit.js` - Limitation de débit

**📖 Référence**: Consultez `/BACKEND_FUNCTIONS_REFERENCE.md` pour le code complet de chaque fonction.

---

## 🔥 Étape 2: Configurer Firebase

### 2.1 Créer le projet Firebase

1. Allez sur https://console.firebase.google.com/
2. Cliquez sur "Ajouter un projet"
3. Nom du projet: `secret-valentine` (ou autre nom)
4. Suivez les étapes (désactivez Google Analytics si vous voulez)

### 2.2 Activer Firestore

1. Dans le menu à gauche, cliquez sur "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez le mode **"Production"**
4. Sélectionnez une région proche (ex: `europe-west1`)

### 2.3 Configurer les règles Firestore

Dans l'onglet "Règles", remplacez par:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public: lecture seule des index email
    match /emailIndex/{emailHash} {
      allow read: if true;
      allow write: if false;
    }
    
    // Public: lecture seule des tokens
    match /tokens/{token} {
      allow read: if true;
      allow write: if false;
    }
    
    // Les inboxes sont gérées uniquement par le backend
    match /inboxes/{inboxId} {
      allow read, write: if false;
    }
    
    // Tout le reste est géré par le backend (service account)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.4 Obtenir le Service Account JSON

1. Dans Firebase Console: ⚙️ **Settings** → **Project Settings**
2. Onglet **"Service Accounts"**
3. Cliquez sur **"Generate New Private Key"**
4. Téléchargez le fichier JSON
5. **GARDEZ CE FICHIER EN SÉCURITÉ** (ne jamais le commit dans Git)

---

## 📧 Étape 3: Configurer Resend

### 3.1 Créer un compte Resend

1. Allez sur https://resend.com/
2. Créez un compte gratuit
3. Vérifiez votre email

### 3.2 Obtenir l'API Key

1. Dans le dashboard Resend, allez dans "API Keys"
2. Cliquez sur "Create API Key"
3. Nom: `secret-valentine-prod`
4. Permissions: **Full access** (ou "Sending access" minimum)
5. Copiez la clé (format: `re_xxxxxxxxxxxxx`)

### 3.3 Configurer le domaine d'envoi

**Option 1: Utiliser le domaine de test**
- Email par défaut: `onboarding@resend.dev`
- Limite: 100 emails/jour
- OK pour tester

**Option 2: Ajouter votre domaine** (recommandé pour production)
1. Allez dans "Domains" → "Add Domain"
2. Entrez votre domaine (ex: `votredomaine.com`)
3. Ajoutez les enregistrements DNS demandés
4. Attendez la vérification
5. Utilisez `noreply@votredomaine.com`

---

## 🔐 Étape 4: Générer les clés secrètes

### 4.1 RECOVERY_KEY_B64

Ouvrez un terminal et exécutez:

```bash
# Générer 32 bytes aléatoires en base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copiez le résultat (ex: `K7X9mP2nQ4vW8yZ1aB5cD6eF7gH8iJ9k...`)

### 4.2 PIN_PEPPER

```bash
# Générer un pepper aléatoire
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiez le résultat (ex: `a1b2c3d4e5f6...`)

---

## 🐙 Étape 5: Intégrer dans GitHub

### 5.1 Préparer le dépôt local

Dans le dossier de votre projet:

```bash
# Initialiser Git si ce n'est pas déjà fait
git init

# Créer .gitignore
cat > .gitignore << EOF
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.netlify/
EOF

# Ajouter tous les fichiers
git add .
git commit -m "Initial commit - Secret Valentine app"
```

### 5.2 Créer le dépôt GitHub

1. Allez sur https://github.com/new
2. Nom du dépôt: `secret-valentine` (ou autre)
3. **IMPORTANT**: Laissez "Private" si vous avez des données sensibles
4. Ne cochez aucune option (README, .gitignore, license)
5. Cliquez sur "Create repository"

### 5.3 Pousser votre code

Copiez les commandes affichées par GitHub:

```bash
git remote add origin https://github.com/VOTRE_USERNAME/secret-valentine.git
git branch -M main
git push -u origin main
```

---

## 🌐 Étape 6: Déployer sur Netlify

### 6.1 Créer le site Netlify

1. Allez sur https://app.netlify.com/
2. Cliquez sur "Add new site" → "Import an existing project"
3. Choisissez "GitHub"
4. Autorisez Netlify à accéder à vos dépôts
5. Sélectionnez `secret-valentine`

### 6.2 Configurer le build

Dans l'interface Netlify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

Cliquez sur "Deploy site"

### 6.3 Configurer les variables d'environnement

1. Dans votre site Netlify: **Site settings** → **Environment variables**
2. Cliquez sur "Add a variable" pour chaque variable suivante:

#### Variables requises:

| Variable | Valeur | Source |
|----------|--------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Contenu complet du JSON Firebase | Étape 2.4 |
| `API_EMAIL_KEY` | `re_xxxxxxxxxxxxx` | Étape 3.2 |
| `EMAIL_VALENTINE` | `noreply@votredomaine.com` | Étape 3.3 |
| `EMAIL_BASE_URL` | `https://votre-site.netlify.app` | URL de votre site Netlify |
| `RECOVERY_KEY_B64` | Base64 32 bytes | Étape 4.1 |
| `PIN_PEPPER` | Hex 64 caractères | Étape 4.2 |

#### ⚠️ Important pour FIREBASE_SERVICE_ACCOUNT_JSON:

Copiez **tout le contenu** du JSON Firebase sur **une seule ligne**:

```json
{"type":"service_account","project_id":"secret-valentine-xxx","private_key_id":"xxx","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0B...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxx@secret-valentine-xxx.iam.gserviceaccount.com","client_id":"xxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"xxx"}
```

### 6.4 Mettre à jour EMAIL_BASE_URL

Après le premier déploiement:

1. Notez l'URL de votre site (ex: `https://charming-valentine-xyz.netlify.app`)
2. Retournez dans **Environment variables**
3. Modifiez `EMAIL_BASE_URL` avec cette URL
4. Redéployez: **Deploys** → **Trigger deploy** → **Deploy site**

---

## ✅ Étape 7: Vérifier le déploiement

### 7.1 Vérifier les Functions

Dans Netlify: **Functions** → Vous devriez voir:
- ✅ claimPending
- ✅ openLink
- ✅ verifyPin
- ✅ setPin
- ✅ listInbox
- ✅ getMessage
- ✅ sendMessage
- ✅ sendReply

### 7.2 Test rapide

Ouvrez votre site et testez:

1. **Page d'accueil** charge correctement
2. Cliquez sur **"Compose Letter"**
3. Remplissez le formulaire avec votre email
4. Cliquez sur **"Send Letter"**
5. Vérifiez votre boîte email → vous devriez recevoir un email avec un lien
6. Cliquez sur le lien → vous devriez voir votre message

---

## 🐛 Dépannage

### Erreur "Function not found"

**Cause**: Les functions ne sont pas déployées correctement

**Solution**:
1. Vérifiez que le dossier est bien `netlify/functions` (pas `netlify-functions`)
2. Dans `netlify.toml`, vérifiez: `functions = "netlify/functions"`
3. Redéployez

### Erreur "Firebase connection failed"

**Cause**: Variable `FIREBASE_SERVICE_ACCOUNT_JSON` incorrecte

**Solution**:
1. Vérifiez que le JSON est sur **une seule ligne**
2. Vérifiez qu'il n'y a pas d'espaces ou de retours à la ligne
3. Redéployez après modification

### Erreur "Email not sent"

**Cause**: API Resend incorrecte ou limite atteinte

**Solution**:
1. Vérifiez `API_EMAIL_KEY` dans les variables
2. Vérifiez votre quota sur Resend
3. Vérifiez les logs dans Resend Dashboard

### Messages de logs dans Netlify

1. Allez dans **Functions**
2. Cliquez sur une function (ex: `sendMessage`)
3. Cliquez sur un déploiement
4. Consultez les logs

---

## 📊 Monitoring et Maintenance

### Quotas gratuits

**Netlify Free Tier:**
- 100 GB bandwidth/mois
- 300 minutes build/mois
- 125K function invocations/mois
- Largement suffisant pour démarrer

**Resend Free Tier:**
- 100 emails/jour (domaine test)
- 3000 emails/mois (domaine vérifié)

**Firebase Firestore:**
- 50K lectures/jour
- 20K écritures/jour
- 1GB stockage

### Monitoring

**Netlify Analytics**:
- Activez dans Site settings → Analytics

**Firebase Monitoring**:
- Firebase Console → Usage

**Resend Logs**:
- Dashboard → Logs → Voir tous les emails envoyés

---

## 🔒 Sécurité

### ✅ Bonnes pratiques appliquées:

- ✅ Chiffrement AES-256-GCM des messages
- ✅ Tokens à usage unique pour les liens
- ✅ Hashing des PINs avec PBKDF2
- ✅ Rate limiting sur toutes les endpoints
- ✅ Modération automatique du contenu
- ✅ Variables d'environnement sécurisées
- ✅ Service Account Firebase (pas de clés côté client)

### ⚠️ À ne jamais faire:

- ❌ Commit `.env` ou le JSON Firebase dans Git
- ❌ Partager votre API Resend
- ❌ Exposer les variables d'environnement côté client

---

## 🔄 Mises à jour futures

### Pour mettre à jour le code:

```bash
# Faire vos modifications localement
git add .
git commit -m "Description des changements"
git push origin main
```

Netlify redéploiera automatiquement!

### Pour mettre à jour une function:

1. Modifiez le fichier dans `/netlify/functions/`
2. Commit et push
3. Netlify redéploie automatiquement

---

## 🎯 Checklist Finale

### Configuration Backend
- [ ] Firebase projet créé
- [ ] Firestore activé avec les bonnes règles
- [ ] Service Account JSON téléchargé
- [ ] Resend compte créé
- [ ] API Key Resend obtenue
- [ ] Clés RECOVERY_KEY_B64 et PIN_PEPPER générées

### GitHub
- [ ] Dépôt GitHub créé
- [ ] Code poussé sur `main`
- [ ] `.gitignore` configuré (pas de secrets dans Git)

### Netlify
- [ ] Site créé et connecté à GitHub
- [ ] Build settings corrects
- [ ] Toutes les variables d'environnement configurées
- [ ] Functions déployées (8 functions visibles)
- [ ] Premier déploiement réussi

### Tests
- [ ] Page d'accueil charge
- [ ] Envoi d'un message fonctionne
- [ ] Réception email fonctionne
- [ ] Lien email ouvre l'inbox
- [ ] Lecture de message fonctionne
- [ ] Réponse fonctionne (si activée)

---

## 📚 Ressources

- **Documentation complète**: `/INTEGRATION.md`
- **Référence des Functions**: `/BACKEND_FUNCTIONS_REFERENCE.md`
- **Quick Start**: `/QUICK_START.md`
- **Netlify Docs**: https://docs.netlify.com/
- **Firebase Docs**: https://firebase.google.com/docs/firestore
- **Resend Docs**: https://resend.com/docs

---

## 🆘 Besoin d'aide?

Si vous rencontrez des problèmes:

1. **Vérifiez les logs Netlify** (Functions → Logs)
2. **Vérifiez Firestore** (Firebase Console)
3. **Vérifiez Resend logs** (Dashboard)
4. **Consultez** `/INTEGRATION.md` pour plus de détails

---

## 🎉 Félicitations!

Votre application Secret Valentine est maintenant déployée et prête à envoyer des messages d'amour! 💌

**URL de votre site**: https://votre-site.netlify.app

Partagez le lien et laissez la magie opérer! ✨
