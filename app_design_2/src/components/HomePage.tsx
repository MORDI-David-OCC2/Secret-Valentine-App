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
    <div
      className="
        relative w-full
        min-h-[100dvh]
        overflow-hidden
        text-[#5a2d42]
      "
      style={{
        paddingTop: "max(14px, env(safe-area-inset-top))",
        paddingBottom: "max(18px, env(safe-area-inset-bottom))",
      }}
    >
      {/* FULLSCREEN UI1 background */}
      <div className="absolute inset-0 -z-10 bg-[#fff5f8]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#fce8ef] via-[#f7dde6] to-[#ead5ee]" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.22]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c96080' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Settings */}
      <button
        onClick={() => onNavigate("settings")}
        className="
          absolute right-4
          top-[max(14px,env(safe-area-inset-top))]
          size-10 rounded-full
          bg-white/55 backdrop-blur-md
          shadow-md
          flex items-center justify-center
          z-20
        "
        aria-label="Settings"
      >
        <span className="text-xl">⚙️</span>
      </button>

      {/* CONTENT wrapper (keeps things readable on large screens) */}
      <div className="mx-auto w-full max-w-[480px] px-5 pt-10 pb-8 flex flex-col min-h-[100dvh]">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-base">🤍</span>
            <span className="text-base">🌸</span>
            <span className="text-base">🤍</span>
          </div>

          <h1
            className="
              font-['Playfair_Display',serif]
              italic font-bold
              text-[#c9667a]
              drop-shadow-[0_2px_12px_rgba(200,90,130,.2)]
              leading-none
            "
            style={{ fontSize: "clamp(30px, 7vw, 40px)" }}
          >
            {t.title}
          </h1>

          <p className="mt-5 text-[15px] italic text-[#9e6b80] leading-relaxed">
            {t.tagline1}
            <br />
            <span className="text-[#c9667a]">{t.tagline2}</span>
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          className="mt-6 mb-7 flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#e8a0b4] to-transparent" />
          <div className="text-[13px] text-[#c9667a]">♥</div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#e8a0b4] to-transparent" />
        </motion.div>

        {/* Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => onNavigate("compose")}
            className="
              w-full flex items-center gap-4
              rounded-[18px] px-5 py-4
              text-left
              shadow-[0_8px_28px_rgba(200,100,140,.35)]
              bg-gradient-to-br from-[#e8a0b4] to-[#d4789c]
              transition
              active:scale-[0.99]
            "
          >
            <div className="size-12 rounded-[18px] bg-white/25 backdrop-blur flex items-center justify-center text-[22px]">
              ✍️
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-['Playfair_Display',serif] text-[16px] font-bold text-white leading-tight">
                {t.writeTitle}
              </div>
              <div className="text-[16px] italic text-white/80 truncate">{t.writeSub}</div>
            </div>
            <div className="text-white/70 text-lg">→</div>
          </button>

          <button
            onClick={() => onNavigate(isAuthenticated ? "letters" : "claim")}
            className="
              w-full flex items-center gap-4
              rounded-[18px] px-5 py-4
              text-left
              shadow-[0_8px_28px_rgba(160,110,200,.35)]
              bg-gradient-to-br from-[#c9a8e0] to-[#a87cc8]
              transition
              active:scale-[0.99]
            "
          >
            <div className="size-12 rounded-[18px] bg-white/25 backdrop-blur flex items-center justify-center text-[22px]">
              💌
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-['Playfair_Display',serif] text-[16px] font-bold text-white leading-tight">
                {t.inboxTitle}
              </div>
              <div className="text-[16px] italic text-white/80 truncate">{t.inboxSub}</div>
            </div>
            <div className="text-white/70 text-lg">→</div>
          </button>
        </div>

        {/* Footer pinned at bottom of screen */}
        <button
          onClick={() => onNavigate("credits")}
          className="mt-auto pt-8 text-center text-[12px] italic text-[#9e6b80] opacity-80"
        >
          {t.footer} ♥
        </button>
      </div>
    </div>
  );
}