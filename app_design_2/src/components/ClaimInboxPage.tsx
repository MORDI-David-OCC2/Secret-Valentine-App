import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { claimPending } from "../services/api";
import AppFrame from "./ui/AppFrame";

interface ClaimInboxPageProps {
  onBack: () => void;
  language: "en" | "fr";
}

export default function ClaimInboxPage({ onBack, language }: ClaimInboxPageProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const translations = {
    en: {
      back: "Back",
      title: "Access Your Inbox",
      subtitle: "Enter your email to receive your private inbox link.",
      emailLabel: "Email",
      emailPlaceholder: "your.email@example.com",
      sendButton: "Send my link",
      sending: "Sending…",
      successTitle: "Email Sent!",
      successMessage: "Check your inbox for the access link.",
      footer: "made by D&F with",
      invalidEmail: "Please enter a valid email address",
    },
    fr: {
      back: "Retour",
      title: "Accéder à ta boîte",
      subtitle: "Entre ton email pour recevoir ton lien privé.",
      emailLabel: "Email",
      emailPlaceholder: "ton.email@exemple.com",
      sendButton: "Recevoir mon lien",
      sending: "Envoi…",
      successTitle: "Email envoyé !",
      successMessage: "Regarde ta boîte mail pour le lien d’accès.",
      footer: "créé par D&F avec",
      invalidEmail: "Veuillez entrer une adresse email valide",
    },
  };

  const t = translations[language];

  const validateEmail = (v: string) => v.includes("@") && v.includes(".");

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      await claimPending(email);
      setEmailSent(true);
      toast.success(t.successTitle);
    } catch (error: any) {
      const msg = String(error?.message || "");
      if (msg.includes("429")) {
        toast.error(language === "fr" ? "Trop de tentatives. Réessaie plus tard." : "Too many attempts. Try again later.");
      } else {
        toast.error(error?.message || (language === "fr" ? "Erreur lors de l’envoi" : "Failed to send"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
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
  className="
    mt-10 w-full
    rounded-[22px]
    px-7 py-6
    text-left
    shadow-[0_14px_40px_rgba(155,45,90,.28)]
    bg-gradient-to-br from-[#e8a0b4] to-[#d4789c]
    transition
    active:scale-[0.99]
  "
>
  <div className="flex items-center gap-5">
    <div className="size-16 rounded-[22px] bg-white/25 backdrop-blur flex items-center justify-center text-[30px]">
      ←
    </div>

    <div className="flex-1 min-w-0">
      <div className="font-['Playfair_Display',serif] text-[22px] font-bold text-white leading-tight">
        {t.back}
      </div>
      <div className="text-[16px] italic text-white/80 truncate mt-0.5">
        {language === "fr" ? "Revenir à l’accueil" : "Back to home"}
      </div>
    </div>

    <div className="text-white/70 text-2xl">→</div>
  </div>
</button>

          <button className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80">
            {t.footer} ♥
          </button>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <div className="relative">
        {/* Back */}
        <motion.button
  onClick={onBack}
  className="
    inline-flex items-center gap-3
    text-[24px] italic
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
  initial={{ opacity: 0, x: -12 }}
  animate={{ opacity: 1, x: 0 }}
  whileHover={{ x: -3 }}
  whileTap={{ scale: 0.98 }}
>
  <span className="text-[30px] leading-none">←</span>
  <span className="leading-none">{t.back}</span>
</motion.button>


        {/* Header */}
        <div className="mt-4 text-center">
          <motion.div
            className="text-6xl"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            📬
          </motion.div>

          <h1 className="mt-3 font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)] drop-shadow-[0_2px_12px_rgba(200,90,130,.18)]">
            {t.title}
          </h1>

          <p className="mt-3 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {t.subtitle}
          </p>

          {/* Divider */}
          <div className="mt-5 mb-4 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            <div className="text-[13px] text-[color:var(--rose-deep)]">♥</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          </div>
        </div>

        {/* Form */}
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-['Cormorant_Garamond',serif] italic text-[14px] text-[color:var(--text-light)] mb-2">
              {t.emailLabel}
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full rounded-[18px] px-5 py-4 bg-white/60 border border-white/70 shadow-[0_10px_30px_rgba(180,90,130,.12)]
                         font-['Cormorant_Garamond',serif] italic text-[18px] text-[#5a2d42]
                         placeholder:text-[#9e6b80]
                         outline-none focus:ring-2 focus:ring-[#e8a0b4]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-[18px] px-5 py-4 text-left shadow-[0_10px_30px_rgba(155,45,90,.25)]
                       bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] transition
                       disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-[18px] bg-white/20 backdrop-blur flex items-center justify-center text-[24px]">
                {isSubmitting ? "…" : "✉️"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-['Playfair_Display',serif] text-[18px] font-bold text-white leading-tight">
                  {isSubmitting ? t.sending : t.sendButton}
                </div>
                <div className="text-[14px] italic text-white/80 truncate">
                  {language === "fr" ? "Lien sécurisé, valable 7 jours" : "Secure link, valid for 7 days"}
                </div>
              </div>

              {isSubmitting ? (
                <motion.div
                  className="size-6 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <div className="text-white/70 text-xl">→</div>
              )}
            </div>
          </button>
        </div>

        {/* Footer */}
        <button className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80">
          {t.footer} ♥
        </button>
      </div>
    </AppFrame>
  );
}
