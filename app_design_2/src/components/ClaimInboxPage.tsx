// src/components/ClaimInboxPage.tsx
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import AppFrame from "./ui/AppFrame";
import {
  requestLoginLink,
  requestPinReset,
  unlockInboxWithPin,
  createInboxAccount,
  importLinkToInbox,
} from "../services/api";
import { useSession } from "../contexts/SessionContext";

interface ClaimInboxPageProps {
  mode: "login" | "create";
  onBack: () => void;
  language: "en" | "fr";
  onNavigate?: (page: "home" | "letters" | "compose" | "settings" | "credits" | "claim") => void;

  // if user came from a shared link, we keep it here and import after create/login
  pendingImportToken?: string | null;
  onConsumedPendingImportToken?: () => void;
}

export default function ClaimInboxPage({
  mode,
  onBack,
  language,
  onNavigate,
  pendingImportToken,
  onConsumedPendingImportToken,
}: ClaimInboxPageProps) {
  const { setInboxId, setSessionToken, setIsLocked, setIsPinRequired } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // create mode
  const [pin, setPin] = useState(""); // login mode PIN step

  const [step, setStep] = useState<"email" | "pin" | "sent">("email");
  const [inboxId, setLocalInboxId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    en: {
      back: "Back",
      titleLogin: "Access Your Inbox",
      subtitleLogin: "Enter your email to access your inbox.",
      titleCreate: "Create Your Inbox",
      subtitleCreate: "Create an inbox with email & password.",

      emailLabel: "Email",
      emailPlaceholder: "your.email@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "At least 6 characters",

      continueButton: mode === "create" ? "Create account" : "Continue",
      sending: "Sending…",

      successTitle: "Email Sent!",
      successMessage: "Check your inbox for the access link.",
      invalidEmail: "Please enter a valid email address",
      weakPassword: "Password must be at least 6 characters",

      pinTitle: "Enter your PIN",
      pinLabel: "PIN (4 digits)",
      pinPlaceholder: "••••",
      login: "Log in",
      forgot: "Forgot PIN?",
      loginByLink: "Log in by link instead",
      resetSent: "Reset link sent ✅",
      wrongPin: "Wrong PIN",
      footer: "made by D&F with",

      imported: "Letter added to your inbox ✅",
      importFailed: "Could not add the letter",
    },
    fr: {
      back: "Retour",
      titleLogin: "Accéder à ta boîte",
      subtitleLogin: "Entre ton email pour accéder à ta boîte.",
      titleCreate: "Créer ta boîte",
      subtitleCreate: "Crée une boîte avec email & mot de passe.",

      emailLabel: "Email",
      emailPlaceholder: "ton.email@exemple.com",
      passwordLabel: "Mot de passe",
      passwordPlaceholder: "Au moins 6 caractères",

      continueButton: mode === "create" ? "Créer le compte" : "Continuer",
      sending: "Envoi…",

      successTitle: "Email envoyé !",
      successMessage: "Regarde ta boîte mail pour le lien d’accès.",
      invalidEmail: "Veuillez entrer une adresse email valide",
      weakPassword: "Le mot de passe doit faire au moins 6 caractères",

      pinTitle: "Entre ton PIN",
      pinLabel: "PIN (4 chiffres)",
      pinPlaceholder: "••••",
      login: "Se connecter",
      forgot: "Mot de passe oublié ?",
      loginByLink: "Me connecter par lien à la place",
      resetSent: "Lien de reset envoyé ✅",
      wrongPin: "PIN incorrect",
      footer: "créé par D&F avec",

      imported: "Lettre ajoutée à ta boîte ✅",
      importFailed: "Impossible d’ajouter la lettre",
    },
  }[language];

  const validateEmail = (v: string) => v.includes("@") && v.includes(".");

  async function maybeImportAfterAuth(destInboxId: string, destSessionToken: string) {
    if (!pendingImportToken) return;

    try {
      await importLinkToInbox({
        token: pendingImportToken,
        destInboxId,
        destSessionToken,
      });
      toast.success(t.imported);
    } catch (e: any) {
      toast.error(e?.message || t.importFailed);
    } finally {
      onConsumedPendingImportToken?.();
    }
  }

  const handleEmailContinue = async () => {
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }

    // CREATE MODE: create account -> optional import -> go letters
    if (mode === "create") {
      if (pin.trim().length < 6) {
        toast.error(t.weakPassword);
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await createInboxAccount(email.trim().toLowerCase(), password.trim());
        if (!res?.inboxId || !res?.sessionToken) throw new Error("Create failed");

        setInboxId(res.inboxId);
        setSessionToken(res.sessionToken);
        setIsPinRequired(false);
        setIsLocked(false);

        toast.success(language === "fr" ? "Compte créé ✅" : "Account created ✅");

        await maybeImportAfterAuth(res.inboxId, res.sessionToken);

        onNavigate?.("letters");
        if (!onNavigate) onBack();
      } catch (e: any) {
        toast.error(e?.message || "Failed");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // LOGIN MODE: prefer PIN if inbox has one
    setIsSubmitting(true);
    try {
      const res = await requestLoginLink(email.trim().toLowerCase(), { preferPin: true });

      if (res.action === "PIN_REQUIRED") {
        setLocalInboxId(res.inboxId);
        setStep("pin");
        return;
      }

      if (res.action === "LINK_SENT") {
        setStep("sent");
        toast.success(t.successTitle);
        return;
      }

      toast.error("Unexpected response");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinLogin = async () => {
    if (!inboxId) {
      toast.error(language === "fr" ? "Inbox introuvable. Réessaie." : "Inbox not found. Try again.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error(language === "fr" ? "Le PIN doit faire 6 chiffres" : "PIN must be 6 digits");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await unlockInboxWithPin(inboxId, pin);

      setInboxId(inboxId);
      setSessionToken(res.sessionToken);
      setIsPinRequired(true);
      setIsLocked(false);

      await maybeImportAfterAuth(inboxId, res.sessionToken);

      toast.success(language === "fr" ? "Connecté ✅" : "Logged in ✅");
      onNavigate?.("letters") ?? onBack();
    } catch (e: any) {
      toast.error(e?.message || t.wrongPin);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPin = async () => {
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPinReset(email.trim().toLowerCase());
      toast.success(t.resetSent);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginByLink = async () => {
    await handleForgotPin();
  };

  if (step === "sent") {
    return (
      <AppFrame>
        <div className="text-center py-10">
          <motion.div
            className="text-7xl"
            animate={{ y: [0, -8, 0], rotate: [0, -6, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            💌
          </motion.div>

          <h1 className="mt-6 font-['Playfair_Display',serif] italic font-bold text-[28px] text-[color:var(--rose-deep)]">
            {t.successTitle}
          </h1>
          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {t.successMessage}
          </p>

          <button
            onClick={onBack}
            className="mt-10 w-full rounded-[22px] px-7 py-6 text-left shadow-[0_14px_40px_rgba(155,45,90,.28)]
                       bg-gradient-to-br from-[#e8a0b4] to-[#d4789c] transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-5">
              <div className="size-16 rounded-[22px] bg-white/25 backdrop-blur flex items-center justify-center text-[30px]">
                ←
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-['Playfair_Display',serif] text-[22px] font-bold text-white leading-tight">
                  {t.back}
                </div>
                <div className="text-[16px] italic text-white/80 truncate mt-0.5">{language === "fr" ? "Revenir" : "Back"}</div>
              </div>
              <div className="text-white/70 text-2xl">→</div>
            </div>
          </button>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <div className="relative">
        <motion.button
          onClick={onBack}
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
          <span className="leading-none">{t.back}</span>
        </motion.button>

        <div className="mt-4 text-center">
          <motion.div className="text-6xl" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
            📬
          </motion.div>

          <h1 className="mt-3 font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)]">
            {mode === "create" ? t.titleCreate : t.titleLogin}
          </h1>

          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {mode === "create" ? t.subtitleCreate : t.subtitleLogin}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">{t.emailLabel}</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                         font-['Cormorant_Garamond',serif] italic text-[18px] text-[#5a2d42]
                         placeholder:text-[#9e6b80] outline-none focus:ring-2 focus:ring-[#e8a0b4]"
              onKeyDown={(e) => e.key === "Enter" && step === "email" && handleEmailContinue()}
            />
          </div>

          {mode === "create" && step === "email" && (
            <div>
              <p className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">{t.passwordLabel}</p>
              <input
                type="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                         font-['Cormorant_Garamond',serif] italic text-[18px] text-[#5a2d42]
                         placeholder:text-[#9e6b80] outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
              />
            </div>
          )}

          {step === "email" && (
            <button
              onClick={handleEmailContinue}
              disabled={isSubmitting}
              className="w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                         bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] transition
                         disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-[18px] bg-white/20 backdrop-blur flex items-center justify-center text-[24px]">
                  {isSubmitting ? "…" : "→"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-white leading-tight">
                    {isSubmitting ? t.sending : t.continueButton}
                  </div>
                </div>
              </div>
            </button>
          )}

          {mode === "login" && step === "pin" && (
            <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
              <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">{t.pinTitle}</div>

              <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">{t.pinLabel}</p>

              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder={t.pinPlaceholder}
                className="mt-2 w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow
                           font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                           outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                onKeyDown={(e) => e.key === "Enter" && handlePinLogin()}
              />

              <button
                onClick={handlePinLogin}
                disabled={isSubmitting}
                className="mt-4 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                           bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] transition
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-white leading-tight">
                  {isSubmitting ? t.sending : t.login}
                </div>
              </button>

              <div className="mt-3 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleForgotPin}
                  className="text-[13px] italic underline underline-offset-4 decoration-dotted text-[color:var(--text-light)]"
                >
                  {t.forgot}
                </button>
                <button
                  type="button"
                  onClick={handleLoginByLink}
                  className="text-[13px] italic underline underline-offset-4 decoration-dotted text-[color:var(--rose-deep)]"
                >
                  {t.loginByLink}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate?.("credits")}
          className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80 underline decoration-[color:var(--rose)] decoration-dotted underline-offset-4 hover:opacity-100 transition"
        >
          {t.footer} ♥️
        </button>
      </div>
    </AppFrame>
  );
}