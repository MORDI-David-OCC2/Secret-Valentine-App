import { useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useInboxLink } from "../hooks/useInboxLink";
import { useSession } from "../contexts/SessionContext";
import { importLinkToInbox } from "../services/api";
import AppFrame from "./ui/AppFrame";

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

  // ✅ new: go to login/create directly (not Home)
  onGoToLogin: () => void;
  onGoToCreate: () => void;

  language: "en" | "fr";
}

/**
 * HUB du lien:
 * - Toujours affiché après résolution du token
 * - 3 actions:
 *   - Add to my current inbox (si session active)
 *   - Log in
 *   - Create my inbox
 */
export default function InboxLinkHandler({
  token,
  onSuccess,
  onError,
  onGoToLogin,
  onGoToCreate,
  language,
}: InboxLinkHandlerProps) {
  const { loading, error, inboxId } = useInboxLink(token);

  const { session } = useSession();
  const [isImporting, setIsImporting] = useState(false);

  const t = useMemo(
    () =>
      ({
        en: {
          loading: "Opening your link…",
          errorTitle: "Invalid or expired link",
          tryAgain: "Return to home",

          hubTitle: "What do you want to do?",
          hubSubtitle: "Choose how you’d like to handle this letter.",

          importToMine: "Add this letter to my current inbox",
          importToMineHint: "Keep everything in one place (recommended).",
          importing: "Adding…",
          importDone: "Added to your inbox ✅",
          noActiveSession: "No active inbox found on this device.",
          sameInbox: "This link already targets your current inbox.",

          login: "Log in to my inbox",
          loginHint: "Access your existing inbox (PIN / link).",

          create: "Create my inbox",
          createHint: "Create an inbox and set up your PIN.",
        },
        fr: {
          loading: "Ouverture du lien…",
          errorTitle: "Lien invalide ou expiré",
          tryAgain: "Retour à l'accueil",

          hubTitle: "Que veux-tu faire ?",
          hubSubtitle: "Choisis comment tu veux gérer ce message.",

          importToMine: "Ajouter ce message à ma boîte actuelle",
          importToMineHint: "Tout garder au même endroit (recommandé).",
          importing: "Ajout…",
          importDone: "Ajouté à ta boîte ✅",
          noActiveSession: "Aucune boîte active trouvée sur cet appareil.",
          sameInbox: "Ce lien pointe déjà vers ta boîte actuelle.",

          login: "Me connecter à ma boîte",
          loginHint: "Accéder à ta boîte existante (PIN / lien).",

          create: "Créer ma boîte",
          createHint: "Créer une boîte et configurer ton PIN.",
        },
      }[language]),
    [language]
  );

  const hasActiveSession = !!(session.inboxId && session.sessionToken);
  const canImport = !!(hasActiveSession && inboxId && session.inboxId && session.inboxId !== inboxId);

  const handleImport = useCallback(async () => {
    if (!session.inboxId || !session.sessionToken) {
      toast.error(t.noActiveSession);
      return;
    }
    if (!inboxId) return;

    if (session.inboxId === inboxId) {
      toast.message(t.sameInbox);
      // si tu veux: open letters directly
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
      onSuccess(session.inboxId, false, session.sessionToken, false, false);
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [session.inboxId, session.sessionToken, inboxId, token, onSuccess, t.noActiveSession, t.importDone, t.sameInbox]);

  // Error screen
  if (error) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-8">
        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-[420px]">
          <div className="text-6xl mb-6">💔</div>
          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[28px] text-[#a31e46] mb-3">
            {t.errorTitle}
          </h1>
          <p className="font-['Inter',sans-serif] text-[15px] text-[#2d1b1b] mb-8">{String(error)}</p>
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
          animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-8xl mb-8"
        >
          💌
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-['Inter',sans-serif] text-[20px] text-[#2d1b1b]">
          {t.loading}
        </motion.p>
      </div>
    );
  }

  // HUB (styled like other pages)
  return (
    <AppFrame>
      <div className="flex min-h-[70vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] text-center"
        >
          <div className="text-6xl mb-4">💌</div>

          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
            {t.hubTitle}
          </h1>

          <p className="mt-2 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {t.hubSubtitle}
          </p>

          <div className="mt-5 mb-4 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            <div className="text-[13px] text-[color:var(--rose-deep)]">♥️</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          </div>

          {/* Add to current inbox */}
          <button
            onClick={handleImport}
            disabled={!canImport || isImporting}
            className="mt-2 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                       bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] text-white transition
                       disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <div className="font-['Playfair_Display',serif] text-[18px] font-bold leading-tight">
              {isImporting ? t.importing : t.importToMine}
            </div>
            <div className="mt-1 text-[13px] italic text-white/80">{t.importToMineHint}</div>
            {!hasActiveSession && <div className="mt-2 text-[12px] italic text-white/70">{t.noActiveSession}</div>}
          </button>

          {/* Login */}
          <button
            onClick={onGoToLogin}
            className="mt-3 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                       bg-white/60 backdrop-blur border border-white/70 transition active:scale-[0.99]"
          >
            <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
              {t.login}
            </div>
            <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.loginHint}</div>
          </button>

          {/* Create */}
          <button
            onClick={onGoToCreate}
            className="mt-3 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                       bg-white/60 backdrop-blur border border-white/70 transition active:scale-[0.99]"
          >
            <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
              {t.create}
            </div>
            <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.createHint}</div>
          </button>

          <button
            onClick={onError}
            className="mt-5 w-full text-[13px] italic underline underline-offset-4 decoration-dotted text-[color:var(--rose-deep)]"
          >
            {t.tryAgain}
          </button>
        </motion.div>
      </div>
    </AppFrame>
  );
}