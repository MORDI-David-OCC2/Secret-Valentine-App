// src/components/InboxLinkHandler.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
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
    needsEmailAssociation: boolean,
    openMessageId: string | null,
  ) => void;
  onError: () => void;
  onGoToLogin: () => void;
  onGoToCreate: () => void;
  language: "en" | "fr";
}

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
    inboxId,
    needsPin,
    sessionToken,
    pinMustBeCreated,
    needsEmailAssociation,
    deliveryMode,
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
          loading: "Opening…",
          errorTitle: "Invalid or expired link",
          back: "Back",

          title: "What do you want to do?",
          subtitle: "Choose how you'd like to open this letter.",

          importToMine: "Add to my current inbox",
          importHint: "Keep everything in one place (recommended).",
          importing: "Adding…",
          importDone: "Added to your inbox ✅",
          importFailed: "Import failed",
          noActiveSession: "No active inbox on this device.",

          login: "Log in to my inbox",
          loginHint: "Use my email / Passwordto access my inbox.",

          create: "Create my inbox",
          createHint: "Create an inbox with email + password.",
        },
        fr: {
          loading: "Ouverture…",
          errorTitle: "Lien invalide ou expiré",
          back: "Retour",

          title: "Que veux-tu faire ?",
          subtitle: "Choisis comment tu veux ouvrir ce message.",

          importToMine: "Ajouter à ma boîte actuelle",
          importHint: "Tout garder au même endroit (recommandé).",
          importing: "Ajout…",
          importDone: "Ajouté à ta boîte ✅",
          importFailed: "Échec de l’import",
          noActiveSession: "Aucune boîte active sur cet appareil.",

          login: "Me connecter à ma boîte",
          loginHint: "Accéder via email / PIN.",

          create: "Créer ma boîte",
          createHint: "Créer une boîte avec email + mot de passe.",
        },
      }[language]),
    [language]
  );

  // ✅ "connected session" = we can identify the inbox and we have a session token
  // (even if Passwordsetup is pending, that's fine for import)
  const hasConnectedSession = !!(session.inboxId && session.sessionToken);
  const sameInboxAsCurrent = !!(hasConnectedSession && inboxId && session.inboxId === inboxId);

  // HUB rules:
  // - share/instagram => HUB always
  // - email => HUB only if user has a connected session AND link inbox is different
  const shouldShowHub =
    !loading &&
    !!inboxId &&
    (deliveryMode !== "email" || (hasConnectedSession && !sameInboxAsCurrent));

  const canImport = !!(hasConnectedSession && inboxId && session.inboxId && session.inboxId !== inboxId);

  const applyLinkedInboxToSession = useCallback(() => {
    if (!inboxId) return;

    setInboxId(inboxId);
    setIsPinRequired(!!needsPin);
    setMustCreatePin(!!pinMustBeCreated);

    if (pinMustBeCreated) {
      setSessionToken(sessionToken || null);
      setIsLocked(false);
      return;
    }

    if (needsPin) {
      setSessionToken(null);
      setIsLocked(true);
      return;
    }

    setSessionToken(sessionToken || null);
    setIsLocked(false);
  }, [
    inboxId,
    needsPin,
    pinMustBeCreated,
    sessionToken,
    setInboxId,
    setIsPinRequired,
    setMustCreatePin,
    setSessionToken,
    setIsLocked,
  ]);

  // AUTO-OPEN only when no hub is needed
  useEffect(() => {
    if (!inboxId) return;
    if (loading || error) return;
    if (shouldShowHub) return;

    applyLinkedInboxToSession();
    onSuccess(inboxId, needsPin, sessionToken, pinMustBeCreated, needsEmailAssociation, null);
  }, [
    inboxId,
    loading,
    error,
    shouldShowHub,
    applyLinkedInboxToSession,
    onSuccess,
    needsPin,
    sessionToken,
    pinMustBeCreated,
    needsEmailAssociation,
  ]);

  const handleImport = useCallback(async () => {
    if (!canImport) {
      toast.error(hasConnectedSession ? t.importFailed : t.noActiveSession);
      return;
    }

    setIsImporting(true);
    try {
      const res = await importLinkToInbox({token, destInboxId: session.inboxId!, destSessionToken: session.sessionToken!});
      toast.success(t.importDone);
      onSuccess(session.inboxId!, false, session.sessionToken!, false, false, res?.importedMessageId ?? null);
    } catch (e: any) {
      toast.error(e?.message || t.importFailed);
    } finally {
      setIsImporting(false);
    }
  }, [
    canImport,
    hasConnectedSession,
    session.inboxId,
    session.sessionToken,
    token,
    onSuccess,
    t.importDone,
    t.importFailed,
    t.noActiveSession,
  ]);

  if (error) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px] text-center">
          <div className="text-6xl mb-5">💔</div>
          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
            {t.errorTitle}
          </h1>
          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {String(error)}
          </p>
          <button
            onClick={onError}
            className="mt-7 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                       bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] transition active:scale-[0.99] text-white"
          >
            <div className="font-['Playfair_Display',serif] text-[18px] font-bold leading-tight">{t.back}</div>
          </button>
        </motion.div>
      </div>
    );
  }

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
      </div>
    );
  }

  if (shouldShowHub) {
    return (
      <AppFrame>
        <div className="relative">
          <motion.button
            onClick={onError}
            className="inline-flex items-center gap-3 text-[24px] italic text-[color:var(--text-light)]
                      font-['Cormorant_Garamond',serif] px-3 py-2 rounded-[14px] bg-white/35 backdrop-blur
                      border border-white/50 shadow-[0_10px_30px_rgba(180,90,130,.10)] hover:bg-white/45
                      active:scale-[0.99] transition"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-[30px] leading-none">←</span>
            <span className="leading-none">{language === "fr" ? "Retour" : "Back"}</span>
          </motion.button>

          <div className="mt-4 flex flex-col items-center text-center">
            <div className="text-6xl mb-3">💌</div>
            <h1 className="font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
              {t.title}
            </h1>
            <p className="mt-2 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
              {t.subtitle}
            </p>

            <div className="mt-5 mb-2 flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
              <div className="text-[13px] text-[color:var(--rose-deep)]">♥️</div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={handleImport}
              disabled={!canImport || isImporting}
              className="w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                        bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] text-white transition
                        disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <div className="font-['Playfair_Display',serif] text-[18px] font-bold leading-tight">
                {isImporting ? t.importing : t.importToMine}
              </div>
              <div className="mt-1 text-[13px] italic text-white/80">{t.importHint}</div>
              {!canImport && (
                <div className="mt-2 text-[12px] italic text-white/70">
                  {hasConnectedSession ? "" : t.noActiveSession}
                </div>
              )}
            </button>

            <button
              onClick={onGoToLogin}
              className="w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                        bg-white/60 backdrop-blur border border-white/70 transition active:scale-[0.99]"
            >
              <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
                {t.login}
              </div>
              <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.loginHint}</div>
            </button>

            <button
              onClick={onGoToCreate}
              className="w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.18)]
                        bg-white/60 backdrop-blur border border-white/70 transition active:scale-[0.99]"
            >
              <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-[color:var(--rose-deep)] leading-tight">
                {t.create}
              </div>
              <div className="mt-1 text-[13px] italic text-[color:var(--text-light)]">{t.createHint}</div>
            </button>
          </div>
        </div>
      </AppFrame>
    );
  }

  return null;
}