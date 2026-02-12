import { motion } from "motion/react";
import { useSession } from "../contexts/SessionContext";

interface HomePageProps {
  onNavigate: (page: "home" | "letters" | "compose" | "settings" | "credits" | "claim") => void;
  language: "en" | "fr";
}

export default function HomePage({ onNavigate, language }: HomePageProps) {
  const { isAuthenticated } = useSession();

  const translations = {
    en: {
      title: "Secret Valentine",
      tagline1: "Reveal your heart,",
      tagline2: "keep your mystery.",
      writeTitle: "Write a message",
      writeSub: "Send anonymous love",
      inboxTitle: "Check my letters",
      inboxSub: "Someone is thinking of you…",
      footer: "made by D&F with",
    },
    fr: {
      title: "Valentin Secret",
      tagline1: "Révèle ton cœur,",
      tagline2: "garde ton mystère.",
      writeTitle: "Écrire un message",
      writeSub: "Envoyer un mot anonyme",
      inboxTitle: "Voir mes lettres",
      inboxSub: "Quelqu’un pense à toi…",
      footer: "créé par D&F avec",
    },
  };

  const t = translations[language];

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4">
      {/* Settings */}
      <button
        onClick={() => onNavigate("settings")}
        className="absolute top-6 right-5 size-10 rounded-full bg-white/70 backdrop-blur-md shadow-md flex items-center justify-center z-10"
        aria-label="Settings"
      >
        <span className="text-xl">⚙️</span>
      </button>

      {/* UI1 “card” container */}
      <div className="relative z-10 w-full max-w-[360px] rounded-[28px] bg-gradient-to-br from-[#fce8ef] via-[#f7dde6] to-[#ead5ee] shadow-[0_30px_80px_rgba(180,90,130,.25)] border border-white/60 px-6 py-10 overflow-hidden">
        {/* subtle texture look */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c96080' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        {/* Header */}
        <motion.div
          className="relative text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-base">🤍</span>
            <span className="text-base">🌸</span>
            <span className="text-base">🤍</span>
          </div>

          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[34px] leading-none text-[color:var(--rose-deep)] drop-shadow-[0_2px_12px_rgba(200,90,130,.2)]">
            {t.title}
          </h1>

          <p className="mt-5 text-[15px] italic text-[color:var(--text-light)] leading-relaxed">
            {t.tagline1}
            <br />
            <span className="text-[color:var(--rose-deep)]">{t.tagline2}</span>
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          className="mt-6 mb-6 flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          <div className="text-[13px] text-[color:var(--rose-deep)]">♥</div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
        </motion.div>

        {/* Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => onNavigate("compose")}
            className="w-full flex items-center gap-4 rounded-[18px] px-5 py-4 text-left shadow-[0_8px_28px_rgba(200,100,140,.35)] bg-gradient-to-br from-[#e8a0b4] to-[#d4789c] hover:translate-y-[-2px] transition"
          >
            <div className="size-12 rounded-[14px] bg-white/25 backdrop-blur flex items-center justify-center text-[22px]">
              ✍️
            </div>
            <div className="flex-1">
              <div className="font-['Playfair_Display',serif] text-[16px] font-bold text-white leading-tight">
                {t.writeTitle}
              </div>
              <div className="text-[12px] italic text-white/80">{t.writeSub}</div>
            </div>
            <div className="text-white/70 text-lg">→</div>
          </button>

          <button
            onClick={() => onNavigate(isAuthenticated ? "letters" : "claim")}
            className="w-full flex items-center gap-4 rounded-[18px] px-5 py-4 text-left shadow-[0_8px_28px_rgba(160,110,200,.35)] bg-gradient-to-br from-[#c9a8e0] to-[#a87cc8] hover:translate-y-[-2px] transition"
          >
            <div className="size-12 rounded-[14px] bg-white/25 backdrop-blur flex items-center justify-center text-[22px]">
              💌
            </div>
            <div className="flex-1">
              <div className="font-['Playfair_Display',serif] text-[16px] font-bold text-white leading-tight">
                {t.inboxTitle}
              </div>
              <div className="text-[12px] italic text-white/80">{t.inboxSub}</div>
            </div>
            <div className="text-white/70 text-lg">→</div>
          </button>
        </div>

        {/* Footer */}
        <button
          onClick={() => onNavigate("credits")}
          className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80"
        >
          {t.footer} ♥
        </button>
      </div>
    </div>
  );
}