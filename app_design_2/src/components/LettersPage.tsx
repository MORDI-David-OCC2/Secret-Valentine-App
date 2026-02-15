// src/components/LettersPage.tsx
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useSession } from "../contexts/SessionContext";
import { listInbox, InboxMessage } from "../services/api";
import svgPaths from "../imports/svg-01d0jglvrw";
import type { Letter } from "../App";
import LetterDetailView from "./LetterDetailView";
import AppFrame from "./ui/AppFrame";
import { UnreadDot } from "./ui/UnreadDot";

function EnvelopeIcon() {
  return (
    <div className="size-[42px]" data-name="roentgen:envelope">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 42 42">
        <g id="roentgen:envelope">
          <path d={svgPaths.p33e0eb00} fill="#DB8C8F" />
        </g>
      </svg>
    </div>
  );
}

function OvalLoveIcon() {
  return (
    <div className="size-[53px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 53 53">
        <g>
          <path d={svgPaths.p2a38d480} stroke="#DB8C8F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p2868bb00} stroke="#DB8C8F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p3ff4a100} stroke="#DB8C8F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

type LetterUI = Letter & { isUnread: boolean };

interface LetterCardProps {
  letter: LetterUI;
  color: string;
  index: number;
  isUnread: boolean;
  onClick: () => void;
}

function getThemeColor(type: string): string {
  switch (type) {
    case "love":
      return "bg-gradient-to-br from-pink-500 via-pink-400 to-rose-400 border-2 border-amber-400";
    case "friend":
      return "bg-gradient-to-br from-amber-200 via-lime-100 to-emerald-100 border-2 border-emerald-200";
    case "crush":
      return "bg-gradient-to-br from-pink-300 via-violet-300 to-white border-2 border-violet-300";
    case "family":
      return "bg-gradient-to-br from-amber-400 via-amber-300 to-rose-400 border-2 border-amber-500";
    default:
      return "bg-gradient-to-br from-pink-500 to-rose-400";
  }
}

function getTextColor(type: string): string {
  switch (type) {
    case "friend":
    case "crush":
      return "text-black";
    default:
      return "text-white";
  }
}

function LetterCard({ letter, color, index, isUnread, onClick }: LetterCardProps) {
  const textColor = getTextColor(letter.type);

  return (
    <motion.div
      onClick={onClick}
      className={`${color} rounded-[18px] w-full h-[172px] relative cursor-pointer shadow-lg overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.1 }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {isUnread && (
        <div className="absolute top-3 right-3 z-20">
          <UnreadDot />
        </div>
      )}

      {/* envelope flap */}
      <motion.svg
        className="absolute top-0 left-0 right-0 pointer-events-none w-full z-0"
        height="60"
        viewBox="0 0 283 60"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="0" x2="141.5" y2="50" stroke="white" strokeOpacity="0.55" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1="283" y1="0" x2="141.5" y2="50" stroke="white" strokeOpacity="0.55" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="283" y2="0" stroke="white" strokeOpacity="0.55" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </motion.svg>

      {/* center icon */}
      <div className="absolute left-1/2 top-[50px] -translate-x-1/2 -translate-y-1/2 z-10">
        <OvalLoveIcon />
      </div>

      {/* From + Date */}
      <div className="absolute top-[100px] left-0 right-0 text-center space-y-1">
        <p className={`font-['Cormorant_Garamond',serif] italic text-[14px] ${textColor} drop-shadow-md`}>
          From: <span className="not-italic font-semibold">{letter.from}</span>
        </p>
        <p className={`font-['Cormorant_Garamond',serif] italic text-[13px] ${textColor} drop-shadow-md`}>
          Date: <span className="not-italic font-semibold">{letter.date}</span>
        </p>
      </div>

      {/* type tag */}
      <div className="absolute bottom-3 right-4">
        <p className={`font-['Playfair_Display',serif] italic text-[13px] ${textColor === "text-white" ? "text-white/80" : "text-black/70"} capitalize`}>
          {letter.type}
        </p>
      </div>
    </motion.div>
  );
}

interface LettersPageProps {
  onBack: () => void;
  language: "en" | "fr";
  onNavigate?: (page: "credits") => void;
}

export default function LettersPage({ onBack, language, onNavigate }: LettersPageProps) {
  const { session } = useSession();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  console.log(messages)
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<{ letter: LetterUI; color: string } | null>(null);

  const reload = async () => {
    if (!session.inboxId || !session.sessionToken) {
      toast.error(language === "en" ? "Invalid session" : "Session invalide");
      onBack();
      return;
    }

    setLoading(true);
    try {
      const response = await listInbox(session.inboxId, session.sessionToken);
      setMessages(response.messages);
    } catch (error: any) {
      const msg = String(error?.message || "");
      if (msg.includes("401")) {
        toast.error(language === "en" ? "Session expired" : "Session expirée");
        onBack();
      } else if (msg.includes("429")) {
        toast.error(language === "en" ? "Too many requests" : "Trop de requêtes");
      } else {
        toast.error(error.message || (language === "en" ? "Failed to load" : "Échec du chargement"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.inboxId, session.sessionToken]);

  const letters: LetterUI[] = messages.map((msg) => ({
    id: msg.id,
    from: msg.fromName,
    to: "You",
    type: msg.type === "friendship" ? ("friend" as const) : (msg.type as any),
    date: new Date(msg.lastActiveAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    }),
    message: msg.body,
    isAnonymous: msg.fromName?.toLowerCase?.().includes("anonymous") || false,
    isUnread: msg.unread === true,
  }));

  const t = {
    en: {
      back: "Back",
      title: "Your Love Letters",
      youHave: "You have",
      message: "message",
      messages: "messages",
      waitingForYou: "waiting for you",
      footer: "made by D&F with",
    },
    fr: {
      back: "Retour",
      title: "Vos Lettres d'Amour",
      youHave: "Vous avez",
      message: "message",
      messages: "messages",
      waitingForYou: "qui vous attendent",
      footer: "créé par D&F avec",
    },
  }[language];

  if (loading) {
    return (
      <AppFrame>
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-5xl">
            💌
          </motion.div>
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

        {/* Header */}
        <div className="mt-4 flex flex-col items-center">
          <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <EnvelopeIcon />
          </motion.div>

          <h1 className="mt-2 font-['Playfair_Display',serif] italic font-bold text-[26px] text-[color:var(--rose-deep)] text-center drop-shadow-[0_2px_12px_rgba(200,90,130,.18)]">
            {t.title}
          </h1>

          <div className="mt-5 mb-4 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            <div className="text-[13px] text-[color:var(--rose-deep)]">♥️</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          </div>

          <p className="text-center italic text-[14px] text-[color:var(--text-light)] leading-relaxed">
            {t.youHave}{" "}
            <span className="font-['Playfair_Display',serif] text-[color:var(--rose-deep)] font-bold not-italic">
              {letters.length}
            </span>{" "}
            {letters.length === 1 ? t.message : t.messages} {t.waitingForYou}
          </p>
        </div>

        {/* List */}
        <div className="mt-6 flex flex-col gap-4">
          {letters.map((letter, index) => (
            <LetterCard
              key={letter.id}
              letter={letter}
              color={getThemeColor(letter.type)}
              index={index}
              isUnread={letter.isUnread}
              onClick={() => setSelectedLetter({ letter, color: getThemeColor(letter.type) })}
            />
          ))}
        </div>

        {/* Footer */}
        <button
          onClick={() => onNavigate?.("credits")}
          className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80 underline decoration-[color:var(--rose)] decoration-dotted underline-offset-4 hover:opacity-100 transition"
        >
          {t.footer} ♥️
        </button>

        {/* Detail modal */}
        {selectedLetter && (
          <LetterDetailView
            messageId={selectedLetter.letter.id}
            color={selectedLetter.color}
            onClose={() => setSelectedLetter(null)}
            language={language}
            onRead={(id) => {
              // ✅ remove unread dot immediately
              setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)));
            }}
            onReplySent={(id, replyBody, createdAt) => {
              // Optional: keep list ordering fresh when a reply is sent
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, lastActiveAt: createdAt ?? Date.now() } : m
                )
              );
            }}
          />
        )}
      </div>
    </AppFrame>
  );
}