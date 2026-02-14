// src/components/InboxLinkHandler.tsx
import { useEffect, useMemo, useState } from "react";
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

export default function InboxLinkHandler({
  token,
  onSuccess,
  onError,
  language,
}: InboxLinkHandlerProps) {
  const {
    loading,
    error,
    needsPin,
    inboxId,
    sessionToken,
    pinMustBeCreated,
    needsEmailAssociation,
  } = useInboxLink(token);

  // ✅ IMPORTANT: useSession() -> { session, setInboxId, ... }
  const { session } = useSession();

  const [isImporting, setIsImporting] = useState(false);

  const t = useMemo(
    () =>
      ({
        en: {
          loading: "Opening your inbox...",
          error: "Invalid or expired link",
          tryAgain: "Return to home",
          importTitle: "You’re already logged in",
          importSubtitle: "Do you want to add this letter to your existing inbox?",
          importBtn: "Add to my inbox",
          importing: "Adding…",
          openSeparateBtn: "Open this inbox separately",
          imported: "Added to your inbox ✅",
          importFailed: "Import failed",
        },
        fr: {
          loading: "Ouverture de votre boîte...",
          error: "Lien invalide ou expiré",
          tryAgain: "Retour à l'accueil",
          importTitle: "Tu es déjà connecté(e)",
          importSubtitle: "Veux-tu ajouter ce message à ta boîte actuelle ?",
          importBtn: "Ajouter à ma boîte",
          importing: "Ajout…",
          openSeparateBtn: "Ouvrir cette boîte séparément",
          imported: "Ajouté à ta boîte ✅",
          importFailed: "Échec de l’import",
        },
      }[language]),
    [language]
  );

  // ✅ VRAIE condition "logged in"
  const isLoggedIn = !!(session.inboxId && session.sessionToken && !session.isLocked);

  // ✅ On propose l'import si:
  // - user est loggé
  // - le lien ouvre une autre inbox
  const shouldOfferImport = !!(isLoggedIn && inboxId && session.inboxId !== inboxId);

  // ✅ Flow normal: si on NE propose pas import -> on continue
  useEffect(() => {
    if (!inboxId) return;
    if (shouldOfferImport) return;

    onSuccess(inboxId, needsPin, sessionToken, pinMustBeCreated, needsEmailAssociation);
  }, [
    inboxId,
    shouldOfferImport,
    needsPin,
    sessionToken,
    pinMustBeCreated,
    needsEmailAssociation,
    onSuccess,
  ]);

  const handleImport = async () => {
    if (!session.inboxId || !session.sessionToken) return;

    setIsImporting(true);
    try {
      await importLinkToInbox({
        token,
        destInboxId: session.inboxId,
        destSessionToken: session.sessionToken,
      });

      toast.success(t.imported);

      // ✅ Après import => rester sur la boîte courante (celle du user loggé)
      onSuccess(session.inboxId, false, session.sessionToken, false, false);
    } catch (e: any) {
      toast.error(e?.message || t.importFailed);
    } finally {
      setIsImporting(false);
    }
  };

  // ✅ Erreur: on affiche l'écran d'erreur (on NE redirige pas tout seul)
  if (error) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-6xl mb-6">💔</div>
          <h1 className="font-['Kaushan_Script',sans-serif] text-[32px] text-[#a31e46] mb-4">
            {t.error}
          </h1>
          <p className="font-['Inter',sans-serif] text-[16px] text-[#2d1b1b] mb-8">
            {error}
          </p>
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

  // ✅ Écran de choix import (uniquement si loggé + inbox différente)
  if (!loading && shouldOfferImport && inboxId) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px]">
          <div className="text-6xl mb-5">📥</div>

          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
            {t.importTitle}
          </h1>

          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {t.importSubtitle}
          </p>

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="mt-6 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                       bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] transition
                       disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-white leading-tight">
              {isImporting ? t.importing : t.importBtn}
            </div>
          </button>

          <button
            onClick={() => onSuccess(inboxId, needsPin, sessionToken, pinMustBeCreated, needsEmailAssociation)}
            className="mt-3 w-full text-[13px] italic underline underline-offset-4 decoration-dotted text-[color:var(--rose-deep)]"
          >
            {t.openSeparateBtn}
          </button>
        </motion.div>
      </div>
    );
  }

  // ✅ Loading screen
  return (
    <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-8xl mb-8"
      >
        💌
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-['Inter',sans-serif] text-[20px] text-[#2d1b1b]"
      >
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