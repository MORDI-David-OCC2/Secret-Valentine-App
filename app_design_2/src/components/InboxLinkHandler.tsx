// src/components/InboxLinkHandler.tsx
import { useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useInboxLink } from "../hooks/useInboxLink";
import { useSession } from "../contexts/SessionContext";
import { importLinkToInbox } from "../services/api";

interface InboxLinkHandlerProps {
  token: string;

  // appelé quand on doit aller vers l'inbox courante (après import)
  // ou quand tu veux continuer ton flow principal
  onSuccess: (
    inboxId: string,
    needsPin: boolean,
    sessionToken: string | null,
    pinMustBeCreated: boolean,
    needsEmailAssociation: boolean
  ) => void;

  // fallback/back (souvent = retour home)
  onError: () => void;

  // ✅ NEW: navigation directe
  onGoToLogin: () => void;
  onGoToCreate: () => void;

  language: "en" | "fr";
}

/**
 * HUB qui s'affiche TOUJOURS une fois que le lien est résolu.
 * - On retire l'option "Open link inbox" (tu as dit que tu peux l'enlever).
 * - Create => va sur la page création (email + PIN etc)
 * - Login => va sur la page login
 * - Import => ajoute à la boîte déjà connectée
 */
export default function InboxLinkHandler({
  token,
  onSuccess,
  onError,
  onGoToLogin,
  onGoToCreate,
  language,
}: InboxLinkHandlerProps) {
  const {
    loading,
    error,
    inboxId, // inbox visée par le lien (source)
    needsPin,
    sessionToken,
    pinMustBeCreated,
    needsEmailAssociation,
  } = useInboxLink(token);

  const { session } = useSession();

  const [isImporting, setIsImporting] = useState(false);

  const t = useMemo(
    () =>
      ({
        en: {
          loading: "Opening your link…",
          errorTitle: "Invalid or expired link",
          backHome: "Return",

          hubTitle: "What do you want to do?",
          hubSubtitle: "Choose how you’d like to use this letter.",

          importToMine: "Add this to my current inbox",
          importToMineHint: "Keep everything in one place (recommended).",
          importing: "Adding…",
          importDone: "Added to your inbox ✅",
          importFailed: "Import failed",
          noActiveSession: "You are not logged in on this device.",
          sameInbox: "This letter already belongs to your current inbox.",

          loginToMine: "Log in to my inbox",
          loginToMineHint: "Access an existing inbox (PIN / email).",

          createNew: "Create my inbox",
          createNewHint: "Create a new inbox (email + PIN) and use this letter.",
        },
        fr: {
          loading: "Ouverture du lien…",
          errorTitle: "Lien invalide ou expiré",
          backHome: "Retour",

          hubTitle: "Que veux-tu faire ?",
          hubSubtitle: "Choisis comment tu veux utiliser ce message.",

          importToMine: "Ajouter à ma boîte actuelle",
          importToMineHint: "Tout garder au même endroit (recommandé).",
          importing: "Ajout…",
          importDone: "Ajouté à ta boîte ✅",
          importFailed: "Échec de l’import",
          noActiveSession: "Tu n’es pas connecté(e) sur cet appareil.",
          sameInbox: "Ce message appartient déjà à ta boîte actuelle.",

          loginToMine: "Me connecter à ma boîte",
          loginToMineHint: "Accéder à une boîte existante (PIN / email).",

          createNew: "Créer ma boîte",
          createNewHint: "Créer une nouvelle boîte (email + PIN) et utiliser ce message.",
        },
      }[language]),
    [language]
  );

  const hasActiveSession = !!(session.inboxId && session.sessionToken);
  const linkInboxResolved = !!inboxId;

  // Import possible seulement si:
  // - session locale existe
  // - inbox du lien existe
  // - inbox du lien != inbox courante
  const canImport =
    hasActiveSession &&
    linkInboxResolved &&
    !!session.inboxId &&
    !!inboxId &&
    session.inboxId !== inboxId;

  const importDisabledReason = useMemo(() => {
    if (!hasActiveSession) return t.noActiveSession;
    if (hasActiveSession && inboxId && session.inboxId === inboxId) return t.sameInbox;
    return "";
  }, [hasActiveSession, inboxId, session.inboxId, t.noActiveSession, t.sameInbox]);

  const handleImport = useCallback(async () => {
    if (!session.inboxId || !session.sessionToken) {
      toast.error(t.noActiveSession);
      return;
    }
    if (!inboxId) return;

    // si même inbox, pas besoin d'import
    if (session.inboxId === inboxId) {
      toast.success(t.sameInbox);
      onSuccess(session.inboxId, false, session.sessionToken, false, false);
      return;
    }

    setIsImporting(true);
    try {
      await importLinkToInbox({
        token,
        destInboxId: session.inboxId,
        destSessionToken: session.sessionToken,
      });

      toast.success(t.importDone);

      // ✅ rester sur la boîte déjà connectée
      onSuccess(session.inboxId, false, session.sessionToken, false, false);
    } catch (e: any) {
      toast.error(e?.message || t.importFailed);
    } finally {
      setIsImporting(false);
    }
  }, [
    session.inboxId,
    session.sessionToken,
    inboxId,
    token,
    onSuccess,
    t.noActiveSession,
    t.importDone,
    t.importFailed,
    t.sameInbox,
  ]);

  const goLogin = () => {
    if (onGoToLogin) onGoToLogin();
    else onError(); // fallback
  };

  const goCreate = () => {
    if (onGoToCreate) onGoToCreate();
    else onError(); // fallback
  };

  // Error screen
  if (error) {
    return (
      <div
        className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex items-center justify-center px-6"
        style={{
          paddingTop: "max(14px, env(safe-area-inset-top))",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
        }}
      >
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px] text-center">
          <div className="text-6xl mb-5">💔</div>
          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
            {t.errorTitle}
          </h1>
          <p className="mt-3 font-['Inter',sans-serif] text-[14px] text-[#2d1b1b] opacity-80">{error}</p>

          <motion.button
            onClick={onError}
            className="mt-6 w-full rounded-[18px] px-5 py-4 bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] text-white font-['Playfair_Display',serif] italic font-bold text-[16px] shadow-[0_10px_30px_rgba(155,45,90,.25)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
          >
            {t.backHome}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Loading
  if (loading || !inboxId) {
    return (
      <div
        className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-6"
        style={{
          paddingTop: "max(14px, env(safe-area-inset-top))",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl mb-6"
        >
          💌
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-['Inter',sans-serif] text-[18px] text-[#2d1b1b]">
          {t.loading}
        </motion.p>
      </div>
    );
  }

  // HUB (toujours)
  return (
    <div
      className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex items-center justify-center px-6"
      style={{
        paddingTop: "max(14px, env(safe-area-inset-top))",
        paddingBottom: "max(14px, env(safe-area-inset-bottom))",
      }}
    >
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px]">
        {/* Back (même vibe que tes autres pages) */}
        <motion.button
          onClick={onError}
          className="
            inline-flex items-center gap-3
            text-[22px] italic
            text-[color:var(--text-light)]
            font-['Cormorant_Garamond',serif]
            px-3 py-2
            rounded-[14px]
            bg-white/35 backdrop-blur
            border border-white/50
            shadow-[0_10px_30px_rgba(180,90,130,.10)]
            hover:bg-white/45
            active:scale-[0.99]
            transition
          "
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-[28px] leading-none">←</span>
          <span className="leading-none">{t.backHome}</span>
        </motion.button>

        <div className="text-center mt-5">
          <div className="text-6xl mb-4">💌</div>
          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
            {t.hubTitle}
          </h1>
          <p className="mt-2 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {t.hubSubtitle}
          </p>
        </div>

        {/* Import */}
        <button
          onClick={handleImport}
          disabled={!canImport || isImporting}
          className="mt-6 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                     bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] text-white transition
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          <div className="font-['Playfair_Display',serif] text-[18px] font-bold leading-tight">
            {isImporting ? t.importing : t.importToMine}
          </div>
          <div className="mt-1 text-[13px] italic text-white/80">{t.importToMineHint}</div>
          {!canImport && !!importDisabledReason && (
            <div className="mt-2 text-[12px] italic text-white/70">{importDisabledReason}</div>
          )}
        </button>

        {/* Login */}
        <button
          onClick={goLogin}
          className="mt-3 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                     bg-white/65 backdrop-blur border border-white/60 transition active:scale-[0.99]"
        >
          <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
            {t.loginToMine}
          </div>
          <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.loginToMineHint}</div>
        </button>

        {/* Create */}
        <button
          onClick={goCreate}
          className="mt-3 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                     bg-white/65 backdrop-blur border border-white/60 transition active:scale-[0.99]"
        >
          <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
            {t.createNew}
          </div>
          <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.createNewHint}</div>
        </button>
      </motion.div>
    </div>
  );
}