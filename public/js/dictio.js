export const dictionaries = {
    en: {
        Home: "Home",
        lockedInbox: "Inbox locked",
        unlock: "Unlock",
        sendReply: "Send Reply",
        UnlockedInbox: "Unlocked",
        Inbox: "Inbox",
        compose: "Compose",
        settings: "Settings",
        pinLock: "PIN lock",
        setPin: "Set a 4-8 digit PIN.",
        newPin: "New Pin (4-8 digits)",
        confirmPin: "Confirm PIN",
        setPin2: "Set/Change PIN",
        removePin: "Remove PIN",
        enterPin: "Enter your PIN",
        status: "Status",
        recipientEmail: "Recipient email",
        yourName: "Your name (optional)",
        yourEmail: "Your Email (for Answer)",
        types: {
            love: "Love",
            friendship: "Friendship",
            family: "Family",
            crush: "Crush"
        },
        allowReply: "Allow replies (optional)",
        replyNotAllowed: "Replies are not allowed here.",
        writeMessage: "Write your message...",
        send: "Send",
        recipientNotif: "The recipient will be notified by email.",
        openLinktoEnter: "Open the link received by email to log in.",
        refresh: "Refresh",
        logout: "Log out",
        savingPin: "Saving PIN...",
        removedPin: "Pin removed",
        removedPinFailed: "Failed to remove PIN",
        confirmedPin: "Pin confirmed",
        confirmedPinFailed: "Failed to set PIN",
        incPinFormat: "Incorrect Pin Format (4-8 digits)",
        incPinMatch: "PINs do not match",
        incorrectPin: "Incorrect PIN",
        invalidEmail: "The recipient's email is not valid",
        anonymity: "Your email is not shown to the recipient. It’s only used to receive replies.",
        answerEmail: "Insert an email to receive answers",
        emptyMessage: "Your message is empty !",
        sending: "Sending…",
        sent: "Email sent",
        notSent: "Email not sent.",
        replySent: "Reply sent",
        replyFailed: "Failed to send reply",
        sessionCleared: "Session disconnected",
        replyEmpty: "Write a message before replying",
        emptyInbox: "No messages yet",
        notConnected: "Not connected",
        verifying: "Verifying...",
        loading: "Loading...",
        back: "Back",
        open: "Open",
        language: "Language",
        confirmRemovePin: "Remove the PIN for the inbox ?",
    },
    fr: {
        Home: "Accueil",
        lockedInbox: "Boîte verrouillée",
        unlock: "Déverrouiller",
        sendReply: "Envoyer une réponse",
        UnlockedInbox: "Déverrouillée",
        Inbox: "Boîte de réception",
        compose: "Ecrire",
        settings: "Paramètres",
        pinLock: "Verr. PIN",
        setPin: "Configurer un PIN à  4-8 chiffres",
        newPin: "Nouveau Pin (4-8 chiffres)",
        confirmPin: "Confirmer PIN",
        setPin2: "Changer PIN",
        removePin: "Retirer le PIN",
        enterPin: "Entre ton PIN",
        status: "Statut",
        recipientEmail: "Email du destinataire",
        yourName: "Ton nom (facultatif)",
        yourEmail: "Ton email (pour les réponses)",
        types: {
            love: "Amour",
            friendship: "Amitié",
            family: "Famille",
            crush: "Crush"
        },
        allowReply: "Autoriser les réponses (facultatif)",
        replyNotAllowed: "Les réponses n'ont pas été activées ici",
        writeMessage: "Ecris ton message...",
        send: "Envoyer",
        recipientNotif: "Le destinataire sera notifié par mail.",
        openLinktoEnter: "Ouvre le lien reçu par mail pour accéder à ta boîte.",
        refresh: "Rafraîchir",
        logout: "Déconnecter",
        savingPin: "Sauvegarde du PIN...",
        removedPin: "Pin retiré",
        removedPinFailed: "Le PIN n'a pas pu être supprimé",
        confirmedPin: "Pin confirmé",
        confirmedPinFailed: "PIN non configuré",
        incPinFormat: "Format du PIN incorrect (4-8 chiffres)",
        incPinMatch: "Les Pins ne correspondent pas",
        incorrectPin: "PIN incorrect",
        invalidEmail: "Le mail du destinataire n'est pas valide",
        anonymity: "Ton mail ne sert que pour les réponses, le destinataire n'en sait rien.",
        answerEmail: "Vous devez mettre votre Email pour obtenir une réponse",
        emptyMessage: "Ton message est vide !",
        sending: "Envoi en cours",
        sent: "Email envoyé",
        notSent: "Email non envoyé",
        replySent: "Réponse envoyée",
        replyFailed: "Réponse non envoyée",
        sessionCleared: "Session déconnectée",
        replyEmpty: "Ecris un message avant de répondre",
        emptyInbox: "Pas encore de messages",
        notConnected: "Pas connecté",
        verifying: "Vérification...",
        loading: "Chargement...",
        back: "Retour",
        open: "Ouvrir",
        language: "Langue",
        confirmRemovePin: "Retirer le PINpour la boîte ?",
    }
}

const LANG_KEY = "sv.lang";
const DEFAULT_LANG = "en";

export function getLang() {
    const saved = localStorage.getItem(LANG_KEY);
    return (saved && dictionaries[saved]) ? saved: DEFAULT_LANG;
}

export function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    window.dispatchEvent(new CustomEvent("lang.change", {detail: { lang: lang}}));
}

export function t(key, vars = {}) {
    const lang = getLang();
    const dict = dictionaries[lang] || dictionaries[DEFAULT_LANG];
    const fallback = dictionaries.en || dict;
    let s = (dict[key] ?? fallback[key] ?? key);

    s = String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '{${k}}'));
    return s;
}