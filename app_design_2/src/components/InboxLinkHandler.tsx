// src/components/InboxLinkHandler.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useInboxLink } from "../hooks/useInboxLink";
import { useSession } from "../contexts/SessionContext";
import { importLinkToInbox } from "../services/api";

interface InboxLinkHandlerProps {
  token: string;
  onSuccess: (
    inboxId: string,
    needsPin: boolean,
    sessionToken: string | null,
    pinMustBeCreated: boolean,
    needsEmailAssociation: boolean
  ) => void;
  onError: () => void;
  language: "en" | "fr";
}

/**
 * IMPORTANT:
 * - Cet écran s'affiche TOUJOURS après résolution du lien.
 * - Il ne dépend plus de isAuthenticated.
 * - Il propose des actions selon l'état session actuel.
 */
export default function InboxLinkHandler({ token, onSuccess, onError, language }: InboxLinkHandlerProps) {
  const {
    loading,
    error,
    inboxId,
    needsPin,
    sessionToken,
    pinMustBeCreated,
    needsEmailAssociation,
  } = useInboxLink(token);

  const {
    session,
    setInboxId,
    setSessionToken,
    setIsLocked,
    setIsPinRequired,
    setMustCreatePin,
  } = useSession();

  const [isImporting, setIsImporting] = useState(false);

  const t = useMemo(
    () =>
      ({
        en: {
          loading: "Opening your link…",
          error: "Invalid or expired link",
          tryAgain: "Return to home",

          hubTitle: "What do you want to do?",
          hubSubtitle: "Choose how you’d like to open this letter.",

          openLinkInbox: "Open the inbox from this link",
          openLinkInboxHint: "Use the inbox attached to the shared link.",

          importToMine: "Add this letter to my current inbox",
          importToMineHint: "Keep everything in one place (recommended).",
          importing: "Adding…",
          importDone: "Added to your inbox ✅",

          loginToMine: "Log in to my inbox",
          loginToMineHint: "Access your existing inbox (PIN / email).",

          createNew: "Create a new inbox",
          createNewHint: "Start fresh with a new inbox.",

          noActiveSession: "No active inbox found on this device.",
        },
        fr: {
          loading: "Ouverture du lien…",
          error: "Lien invalide ou expiré",
          tryAgain: "Retour à l'accueil",

          hubTitle: "Que veux-tu faire ?",
          hubSubtitle: "Choisis comment tu veux ouvrir ce message.",

          openLinkInbox: "Ouvrir la boîte du lien",
          openLinkInboxHint: "Utiliser la boîte attachée à ce lien.",

          importToMine: "Ajouter à ma boîte actuelle",
          importToMineHint: "Tout garder au même endroit (recommandé).",
          importing: "Ajout…",
          importDone: "Ajouté à ta boîte ✅",

          loginToMine: "Me connecter à ma boîte",
          loginToMineHint: "Accéder à ta boîte existante (PIN / email).",

          createNew: "Créer une nouvelle boîte",
          createNewHint: "Repartir de zéro avec une nouvelle boîte.",

          noActiveSession: "Aucune boîte active trouvée sur cet appareil.",
        },
      }[language]),
    [language]
  );

  const hasActiveSession = !!(session.inboxId && session.sessionToken);
  const canImport = !!(hasActiveSession && inboxId && session.inboxId && session.inboxId !== inboxId);

  /** Appliquer l'inbox du lien dans la session + naviguer via onSuccess */
  const openLinkedInbox = useCallback(() => {
    if (!inboxId) return;

    // 1) on met la session sur l'inbox du lien
    setInboxId(inboxId);

    // 2) pin flags cohérents
    setIsPinRequired(!!needsPin);
    setMustCreatePin(!!pinMustBeCreated);

    if (pinMustBeCreated) {
      setSessionToken(sessionToken || null);
      setIsLocked(false);
    } else if (needsPin) {
      setSessionToken(null);
      setIsLocked(true);
    } else {
      setSessionToken(sessionToken || null);
      setIsLocked(false);
    }

    // 3) continue le flow app
    onSuccess(inboxId, needsPin, sessionToken, pinMustBeCreated, needsEmailAssociation);
  }, [
    inboxId,
    needsPin,
    pinMustBeCreated,
    sessionToken,
    needsEmailAssociation,
    onSuccess,
    setInboxId,
    setIsPinRequired,
    setMustCreatePin,
    setSessionToken,
    setIsLocked,
  ]);

  /** Importer la lettre vers la session courante */
  const handleImport = useCallback(async () => {
    if (!session.inboxId || !session.sessionToken) {
      toast.error(t.noActiveSession);
      return;
    }
    if (!inboxId) return;

    setIsImporting(true);
    try {
      await importLinkToInbox({
        token,
        destInboxId: session.inboxId,
        destSessionToken: session.sessionToken,
      });
      toast.success(t.importDone);

      // rester sur l'inbox du user
      onSuccess(session.inboxId, false, session.sessionToken, false, false);
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [session.inboxId, session.sessionToken, inboxId, token, onSuccess, t.noActiveSession, t.importDone]);

  /** "Me connecter à ma boîte" ou "Créer une nouvelle boîte" :
   *  -> c’est ton flow existant (HomePage / ClaimInboxPage / RequestLoginLink).
   *  -> Ici on ne peut que renvoyer l’utilisateur via onError() ou un callback dédié si tu en as un.
   *
   *  Si tu veux un routing propre: ajoute `onGoToLogin` et `onGoToCreate`.
   *  Pour l’instant, onError() ramène au home où tu as ces options.
   */
  const goHomeToLoginOrCreate = () => {
    onError();
  };

  if (error) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-6xl mb-6">💔</div>
          <h1 className="font-['Kaushan_Script',sans-serif] text-[32px] text-[#a31e46] mb-4">{t.error}</h1>
          <p className="font-['Inter',sans-serif] text-[16px] text-[#2d1b1b] mb-8">{error}</p>
          <motion.button
            onClick={onError}
            className="bg-[#a31e46] text-white px-8 py-3 rounded-full font-['Inter',sans-serif] font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t.tryAgain}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Loading
  if (loading || !inboxId) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-8xl mb-8"
        >
          💌
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-['Inter',sans-serif] text-[20px] text-[#2d1b1b]">
          {t.loading}
        </motion.p>
        <motion.div className="flex gap-2 mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-[#a31e46] rounded-full"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  // ✅ HUB: toujours affiché
  return (
    <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] text-center"
      >
        <div className="text-6xl mb-5">💌</div>

        <h1 className="font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
          {t.hubTitle}
        </h1>

        <p className="mt-2 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
          {t.hubSubtitle}
        </p>

        {/* Option 1: Open link inbox */}
        <button
          onClick={openLinkedInbox}
          className="mt-6 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                     bg-white/70 backdrop-blur border border-white/60 transition active:scale-[0.99]"
        >
          <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
            {t.openLinkInbox}
          </div>
          <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.openLinkInboxHint}</div>
        </button>

        {/* Option 2: Import (only if possible) */}
        <button
          onClick={handleImport}
          disabled={!canImport || isImporting}
          className="mt-3 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                     bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] text-white transition
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          <div className="font-['Playfair_Display',serif] text-[18px] font-bold leading-tight">
            {isImporting ? t.importing : t.importToMine}
          </div>
          <div className="mt-1 text-[13px] italic text-white/80">{t.importToMineHint}</div>
          {!canImport && (
            <div className="mt-2 text-[12px] italic text-white/70">
              {hasActiveSession ? "" : t.noActiveSession}
            </div>
          )}
        </button>

        {/* Option 3: Login */}
        <button
          onClick={goHomeToLoginOrCreate}
          className="mt-3 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                     bg-white/55 backdrop-blur border border-white/60 transition active:scale-[0.99]"
        >
          <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
            {t.loginToMine}
          </div>
          <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.loginToMineHint}</div>
        </button>

        {/* Option 4: Create new */}
        <button
          onClick={goHomeToLoginOrCreate}
          className="mt-3 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                     bg-white/55 backdrop-blur border border-white/60 transition active:scale-[0.99]"
        >
          <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
            {t.createNew}
          </div>
          <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.createNewHint}</div>
        </button>

        {/* Back */}
        <button
          onClick={onError}
          className="mt-5 w-full text-[13px] italic underline underline-offset-4 decoration-dotted text-[color:var(--rose-deep)]"
        >
          {t.tryAgain}
        </button>
      </motion.div>
    </div>
  );
}