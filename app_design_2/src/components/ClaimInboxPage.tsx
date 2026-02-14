import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import AppFrame from "./ui/AppFrame";
import { requestLoginLink, requestPinReset, unlockInboxWithPin, createInboxAccount } from "../services/api";
import { useSession } from "../contexts/SessionContext";

type Mode = "login" | "create";

interface ClaimInboxPageProps {
  onBack: () => void;
  language: "en" | "fr";
  mode?: Mode;

  // ✅ when create succeeds, we go to first-pin with these temps
  onCreated?: (inboxId: string, sessionToken: string, needsEmailAssociation: boolean) => void;

  onNavigate?: (page: "home" | "letters" | "compose" | "settings" | "credits" | "claim") => void;
}

export default function ClaimInboxPage({
  onBack,
  language,
  onNavigate,
  mode = "login",
  onCreated,
}: ClaimInboxPageProps) {
  const { setInboxId, setSessionToken, setIsLocked, setIsPinRequired, setMustCreatePin } = useSession();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  // login flow
  const [step, setStep] = useState<"email" | "pin" | "sent">("email");
  const [inboxId, setLocalInboxId] = useState<string | null>(null);

  // create flow only
  const [creating, setCreating] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = useMemo(
    () =>
      ({
        en: {
          back: "Back",
          titleLogin: "Access Your Inbox",
          subtitleLogin: "Enter your email to access your inbox.",

          titleCreate: "Create Your Inbox",
          subtitleCreate: "Enter your email and choose a 4-digit PIN.",

          emailLabel: "Email",
          emailPlaceholder: "your.email@example.com",

          continueButton: "Continue",
          sending: "Sending…",
          successTitle: "Email Sent!",
          successMessage: "Check your inbox for the access link.",
          invalidEmail: "Please enter a valid email address",

          pinTitle: "Enter your PIN",
          pinLabel: "PIN (4 digits)",
          pinPlaceholder: "••••",
          login: "Log in",
          forgot: "Forgot PIN?",
          loginByLink: "Log in by link instead",
          resetSent: "Reset link sent ✅",
          wrongPin: "Wrong PIN",

          createBtn: "Create inbox",
          creating: "Creating…",
          created: "Inbox created ✅",
          pinFormat: "PIN must be 4 digits",

          footer: "made by D&F with",
        },
        fr: {
          back: "Retour",
          titleLogin: "Accéder à ta boîte",
          subtitleLogin: "Entre ton email pour accéder à ta boîte.",

          titleCreate: "Créer ta boîte",
          subtitleCreate: "Entre ton email et choisis un PIN à 4 chiffres.",

          emailLabel: "Email",
          emailPlaceholder: "ton.email@exemple.com",

          continueButton: "Continuer",
          sending: "Envoi…",
          successTitle: "Email envoyé !",
          successMessage: "Regarde ta boîte mail pour le lien d’accès.",
          invalidEmail: "Veuillez entrer une adresse email valide",

          pinTitle: "Entre ton PIN",
          pinLabel: "PIN (4 chiffres)",
          pinPlaceholder: "••••",
          login: "Se connecter",
          forgot: "Mot de passe oublié ?",
          loginByLink: "Me connecter par lien à la place",
          resetSent: "Lien de reset envoyé ✅",
          wrongPin: "PIN incorrect",

          createBtn: "Créer la boîte",
          creating: "Création…",
          created: "Boîte créée ✅",
          pinFormat: "Le PIN doit faire 4 chiffres",

          footer: "créé par D&F avec",
        },
      }[language]),
    [language]
  );

  const validateEmail = (v: string) => v.includes("@") && v.includes(".");
  const validatePin = (v: string) => /^\d{4}$/.test(v);

  // -------- LOGIN FLOW (existing) --------
  const handleEmailContinue = async () => {
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestLoginLink(email.trim().toLowerCase());

      if (res.action === "LINK_SENT") {
        setStep("sent");
        toast.success(t.successTitle);
        return;
      }

      if (res.action === "PIN_REQUIRED") {
        setLocalInboxId(res.inboxId);
        setStep("pin");
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
    if (!validatePin(pin)) {
      toast.error(t.pinFormat);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await unlockInboxWithPin({ inboxId, pin });

      setInboxId(inboxId);
      setSessionToken(res.sessionToken);
      setIsPinRequired(true);
      setMustCreatePin(false);
      setIsLocked(false);

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

  // -------- CREATE FLOW (new) --------
  const handleCreate = async () => {
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }
    if (!validatePin(pin)) {
      toast.error(t.pinFormat);
      return;
    }

    setCreating(true);
    try {
      // ✅ must return { inboxId, sessionToken, needsEmailAssociation? }
      const res = await createInboxAccount({
        email: email.trim().toLowerCase(),
        pin,
      });

      // Store minimal session — but MUST create PIN still => FirstPinSetup flow
      // We route to FirstPinSetup with inboxId+sessionToken (backend should create session)
      toast.success(t.created);

      // we set session so FirstPinSetup can work smoothly if it relies on context
      setInboxId(res.inboxId);
      setSessionToken(res.sessionToken);
      setIsPinRequired(false);
      setMustCreatePin(true);
      setIsLocked(false);

      onCreated?.(res.inboxId, res.sessionToken, !!res.needsEmailAssociation);
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  // SENT screen (login mode only)
  if (mode === "login" && step === "sent") {
    return (
      <AppFrame>
        <div className="text-center py-10">
          <motion.div className="text-7xl" animate={{ y: [0, -8, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
            💌
          </motion.div>

          <h1 className="mt-6 font-['Playfair_Display',serif] italic font-bold text-[28px] text-[color:var(--rose-deep)]">{t.successTitle}</h1>
          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">{t.successMessage}</p>

          <button
            onClick={onBack}
            className="mt-10 w-full rounded-[22px] px-7 py-6 text-left shadow-[0_14px_40px_rgba(155,45,90,.28)]
                       bg-gradient-to-br from-[#e8a0b4] to-[#d4789c] transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-5">
              <div className="size-16 rounded-[22px] bg-white/25 backdrop-blur flex items-center justify-center text-[30px]">←</div>
              <div className="flex-1 min-w-0">
                <div className="font-['Playfair_Display',serif] text-[22px] font-bold text-white leading-tight">{t.back}</div>
                <div className="text-[16px] italic text-white/80 truncate mt-0.5">{language === "fr" ? "Revenir à l’accueil" : "Back to home"}</div>
              </div>
              <div className="text-white/70 text-2xl">→</div>
            </div>
          </button>

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

  const title = mode === "create" ? t.titleCreate : t.titleLogin;
  const subtitle = mode === "create" ? t.subtitleCreate : t.subtitleLogin;

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
          <h1 className="mt-3 font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)] drop-shadow-[0_2px_12px_rgba(200,90,130,.18)]">
            {title}
          </h1>
          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">{subtitle}</p>

          <div className="mt-5 mb-4 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            <div className="text-[13px] text-[color:var(--rose-deep)]">♥️</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          </div>
        </div>

        <div className="mt-4 space-y-4">
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
            />
          </div>

          {/* CREATE MODE: ask pin directly */}
          {mode === "create" && (
            <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
              <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
                {language === "fr" ? "Choisis ton PIN" : "Choose your PIN"}
              </div>

              <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">{t.pinLabel}</p>

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder={t.pinPlaceholder}
                className="mt-2 w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow
                           font-['Cormorant_Garamond',serif] italic text-[20px] text-[#5a2d42] text-center tracking-widest
                           outline-none focus:ring-2 focus:ring-[#e8a0b4]"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />

              <button
                onClick={handleCreate}
                disabled={creating}
                className="mt-4 w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                           bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] transition
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-white leading-tight">
                  {creating ? t.creating : t.createBtn}
                </div>
              </button>
            </div>
          )}

          {/* LOGIN MODE: existing steps */}
          {mode === "login" && step === "email" && (
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
                  <div className="text-[14px] italic text-white/80 truncate">
                    {language === "fr" ? "On vérifie si un PIN existe" : "We check if a PIN exists"}
                  </div>
                </div>
              </div>
            </button>
          )}

          {mode === "login" && step === "pin" && (
            <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
              <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
                {t.pinTitle}
              </div>

              <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)]">{t.pinLabel}</p>

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
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