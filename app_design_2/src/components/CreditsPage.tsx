import { motion } from "motion/react";
import AppFrame from "./ui/AppFrame";

interface CreditsPageProps {
  onBack: () => void;
  language: "en" | "fr";
}

export default function CreditsPage({ onBack, language }: CreditsPageProps) {
  const translations = {
    en: {
      title: "Credits",
      subtitle: "Built with love, mystery, and a bit of magic.",
      teamTitle: "Team",
      team: "D & F",
      techTitle: "Tech",
      tech: "Vite · React · Netlify Functions · Firebase",
      thanksTitle: "Thanks",
      thanks: "To everyone who tried the app and gave feedback.",
      back: "Back",
      footer: "made by D&F with",
    },
    fr: {
      title: "Crédits",
      subtitle: "Créé avec amour, mystère, et un peu de magie.",
      teamTitle: "Équipe",
      team: "D & F",
      techTitle: "Tech",
      tech: "Vite · React · Netlify Functions · Firebase",
      thanksTitle: "Merci",
      thanks: "À tous ceux qui ont testé l’app et donné des retours.",
      back: "Retour",
      footer: "créé par D&F avec",
    },
  };

  const t = translations[language];

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
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            ✨
          </motion.div>

          <h1 className="mt-2 font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)] drop-shadow-[0_2px_12px_rgba(200,90,130,.18)]">
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

        {/* Content cards */}
        <div className="mt-2 space-y-4">
          <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
              {t.teamTitle}
            </div>
            <div className="mt-1 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
              {t.team}
            </div>
          </div>

          <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
              {t.techTitle}
            </div>
            <div className="mt-1 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
              {t.tech}
            </div>
          </div>

          <div className="rounded-[18px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.12)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
              {t.thanksTitle}
            </div>
            <div className="mt-1 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
              {t.thanks}
            </div>
          </div>
        </div>

        {/* Footer */}
        <button className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80 underline decoration-[color:var(--rose)] decoration-dotted underline-offset-4 hover:opacity-100 transition">
          {t.footer} ♥
        </button>
      </div>
    </AppFrame>
  );
}