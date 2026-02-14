// src/components/InboxLinkHandler.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { openLink, mergeInboxFromToken } from "../services/api";
import { useSession } from "../contexts/SessionContext";

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

type LinkState =
  | { status: "loading" }
  | {
      status: "ready";
      inboxId: string;
      pinRequired: boolean;
      pinMustBeCreated: boolean;
      sessionToken: string | null;
      needsEmailAssociation: boolean;
      isPinReset?: boolean;
    }
  | { status: "error"; message: string };

export default function InboxLinkHandler({ token, onSuccess, onError, language }: InboxLinkHandlerProps) {
  const { inboxId: currentInboxId, sessionToken: currentSessionToken, isLocked } = useSession();

  const [state, setState] = useState<LinkState>({ status: "loading" });
  const [choiceVisible, setChoiceVisible] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const t = useMemo(
    () =>
      ({
        en: {
          loading: "Opening your inbox...",
          error: "Invalid or expired link",
          tryAgain: "Return to home",

          // new merge UI
          alreadyLoggedTitle: "You’re already logged in 💌",
          alreadyLoggedText: "This link points to another inbox. What do you want to do?",
          addToMyInbox: "Add messages to my inbox",
          openSeparate: "Open it separately",

          mergeOk: "Added to your inbox ✅",
          mergeFail: "Could not add to your inbox",
        },
        fr: {
          loading: "Ouverture de votre boîte...",
          error: "Lien invalide ou expiré",
          tryAgain: "Retour à l'accueil",

          alreadyLoggedTitle: "Tu es déjà connecté(e) 💌",
          alreadyLoggedText: "Ce lien pointe vers une autre boîte. Tu veux faire quoi ?",
          addToMyInbox: "Ajouter les messages à ma boîte",
          openSeparate: "Ouvrir séparément",

          mergeOk: "Ajouté à ta boîte ✅",
          mergeFail: "Impossible d’ajouter à ta boîte",
        },
      } as const)[language],
    [language]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      setChoiceVisible(false);

      try {
        const res = await openLink(token);

        if (cancelled) return;

        const ready: LinkState = {
          status: "ready",
          inboxId: res.inboxId,
          pinRequired: !!res.pinRequired,
          pinMustBeCreated: !!res.pinMustBeCreated,
          sessionToken: res.sessionToken ?? null,
          needsEmailAssociation: !!res.needsEmailAssociation,
          isPinReset: !!res.isPinReset,
        };

        setState(ready);

        // ✅ If user already logged in & unlocked and link points to another inbox => offer choice
        const isLoggedIn = !!currentInboxId && !!currentSessionToken && !isLocked;
        const isDifferentInbox = isLoggedIn && res.inboxId && res.inboxId !== currentInboxId;

        if (isDifferentInbox) {
          setChoiceVisible(true);
          return;
        }

        // Otherwise: normal flow
        onSuccess(
          res.inboxId,
          !!res.pinRequired,
          res.sessionToken ?? null,
          !!res.pinMustBeCreated,
          !!res.needsEmailAssociation
        );
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message || t.error;
        setState({ status: "error", message: msg });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, currentInboxId, currentSessionToken, isLocked, onSuccess, t.error]);

  // ---------- UI: error ----------
  if (state.status === "error") {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-6xl mb-6">💔</div>
          <h1 className="font-['Kaushan_Script',sans-serif] text-[32px] text-[#a31e46] mb-4">{t.error}</h1>
          <p className="font-['Inter',sans-serif] text-[16px] text-[#2d1b1b] mb-8">{state.message}</p>
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

  // ---------- UI: loading (default) ----------
  if (state.status !== "ready") {
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
      </div>
    );
  }

  // ---------- UI: choice to merge ----------
  if (choiceVisible) {
    const sourceInboxId = state.inboxId;

    const handleMerge = async () => {
      if (!currentInboxId || !currentSessionToken) return;

      setIsMerging(true);
      try {
        // ✅ merges the inbox behind the link INTO the currently logged inbox
        await mergeInboxFromToken({
          token,
          targetInboxId: currentInboxId,
          targetSessionToken: currentSessionToken,
        });

        toast.success(t.mergeOk);

        // after merging, just go to letters of the current inbox
        onSuccess(currentInboxId, false, currentSessionToken, false, false);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || t.mergeFail);
        // fallback: allow user to open separately
        setChoiceVisible(false);
        onSuccess(sourceInboxId, state.pinRequired, state.sessionToken, state.pinMustBeCreated, state.needsEmailAssociation);
      } finally {
        setIsMerging(false);
      }
    };

    const handleOpenSeparately = () => {
      setChoiceVisible(false);
      onSuccess(sourceInboxId, state.pinRequired, state.sessionToken, state.pinMustBeCreated, state.needsEmailAssociation);
    };

    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[420px] bg-white/70 border border-white/70 shadow-[0_10px_35px_rgba(180,90,130,.12)] rounded-[20px] p-6">
          <div className="text-center">
            <div className="text-6xl">💌</div>
            <h1 className="mt-4 font-['Playfair_Display',serif] italic font-bold text-[24px] text-[color:var(--rose-deep)]">
              {t.alreadyLoggedTitle}
            </h1>
            <p className="mt-2 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
              {t.alreadyLoggedText}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleMerge}
              disabled={isMerging}
              className="w-full rounded-[16px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                         bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] transition
                         disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-white leading-tight">
                {isMerging ? "…" : t.addToMyInbox}
              </div>
              <div className="text-[13px] italic text-white/80">
                {language === "fr" ? "Les messages seront ajoutés à ta boîte actuelle" : "Messages will be imported into your current inbox"}
              </div>
            </button>

            <button
              onClick={handleOpenSeparately}
              disabled={isMerging}
              className="w-full rounded-[16px] px-5 py-4 text-left border border-white/70 bg-white/60 transition
                         disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
                {t.openSeparate}
              </div>
              <div className="text-[13px] italic text-[color:var(--text-light)]">
                {language === "fr" ? "Tu ouvriras une autre boîte (comme avant)" : "You will open a separate inbox (old behavior)"}
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // fallback: should not happen, but keep safe
  return (
    <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center">
      <motion.p className="font-['Inter',sans-serif] text-[18px] text-[#2d1b1b]">{t.loading}</motion.p>
    </div>
  );
}