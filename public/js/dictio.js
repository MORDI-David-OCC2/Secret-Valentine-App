export const dictionaries = {
    en: {
        lockedInbox: "🔒 Inbox locked",
        unlock: "Unlock",
        sendReply: "Send Reply",
        UnlockedInbox: "Unlocked",
        Inbox: "📥 Inbox",
        compose: "✍️ Compose",
        settings: "⚙️ Settings",
        pinLock: "PIN lock",
        setPin: "Set a 4-8 digit PIN.",
        newPin: "New Pin (4-8 digits)",
        confirmPin: "Confirm PIN",
        setPin2: "Set/Change PIN",
        removePin: "Remove PIN",
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
        replyAllowed: "Allow replies (optional)",
        writeMessage: "Write your message...",
        send: "Send",
        recipientNotif: "The recipient will be notified by email.",
        refresh: "Refresh",
        logout: "Log out",
        savingPin: "Saving PIN...",
        removedPin: "Pin removed",
        removedPinFailed: "Failed to remove PIN",
        confirmedPin: "Pin confirmed",
        confirmedPinFailed: "Failed to set PIN",
        incPinFormat: "Incorrect Pin Format (4-8 digits)",
        incPinMatch: "PINs do not match",
        anonymity: "Your email is not shown to the recipient. It’s only used to receive replies.",
        answerEmail: "Insert an email to receive answers",
        sending: "Sending…",
        sent: "Email sent",
        sessionCleared: "Session disconnected",
        replyEmpty: "Write a message before replying",
        emptyInbox: "No messages yet",
        notConntected: "Not connected",
        loading: "Loading...",
        back: "Back",
        open: "Open",
        language: "Language",
    },
    fr: {
        lockedInbox: "🔒 Boîte verrouillée",
        unlock: "Déverrouiller",
        sendReply: "Envoyer une réponse",
        UnlockedInbox: "Déverrouillée",
        Inbox: "📥 Boîte de réception",
        compose: "✍️ Ecrire",
        settings: "⚙️ Paramètres",
        pinLock: "Verr. PIN",
        setPin: "Configurer un PIN à  4-8 chiffres",
        newPin: "Nouveau Pin (4-8 chiffres)",
        confirmPin: "Confirmer PIN",
        setPin2: "Changer PIN",
        removePin: "Retirer le PIN",
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
        replyAllowed: "Autoriser les réponses (facultatif)",
        writeMessage: "Ecris ton message...",
        send: "Envoyer",
        recipientNotif: "Le destinataire sera notifié par mail.",
        refresh: "Rafraîchir",
        logout: "Déconnecter",
        savingPin: "Sauvegarde du PIN...",
        removedPin: "Pin retiré",
        removedPinFailed: "Le PIN n'a pas pu être supprimé",
        confirmedPin: "Pin confirmé",
        confirmedPinFailed: "PIN non configuré",
        incPinFormat: "Format du PIN incorrect (4-8 chiffres)",
        incPinMatch: "Les Pins ne correspondent pas",
        anonymity: "Ton mail ne sert que pour les réponses, le destinataire n'en sait rien.",
        answerEmail: "Vous devez mettre votre Email pour obtenir une réponse",
        sending: "Envoi en cours",
        sent: "Email envoyé",
        sessionCleared: "Session déconnectée",
        replyEmpty: "Ecris un message avant de répondre",
        emptyInbox: "Pas encore de messages",
        notConntected: "Pas connecté",
        loading: "Chargement...",
        back: "Retour",
        open: "Ouvrir",
        language: "Langue",
    }
}

const LANG_KEY = "sv.lang";
const DEFAULT_LANG = "en";

export function getLang() {
    const saved = localStorage.getitem(LANG_KEY);
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