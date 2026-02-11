import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useSession } from "../contexts/SessionContext";
import { listInbox, InboxMessage } from "../services/api";
import svgPaths from "../imports/svg-01d0jglvrw";
import type { Letter } from "../App";
import LetterDetailView from "./LetterDetailView";

function MdiHeart({ className }: { className?: string }) {
  return (
    <div className={className || "relative shrink-0 size-[24px]"} data-name="mdi:heart">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="mdi:heart">
          <path d={svgPaths.p18ccc940} fill="#DB8C8F" />
        </g>
      </svg>
    </div>
  );
}

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

function UnreadDot() {
  return (
    <div className="bg-white/85 rounded-full p-2 shadow-md">
      <span className="relative inline-flex items-center justify-center">
        <span className="absolute w-5 h-5 rounded-full bg-pink-400/30 blur-[1px]" />
        <span className="w-2.5 h-2.5 rounded-full bg-pink-600 shadow-[0_0_10px_rgba(219,39,119,0.7)]" />
      </span>
    </div>
  );
}

interface LetterCardData extends Letter {
  unread: boolean;
  lastActiveAt: number;
}

interface LetterCardProps {
  letter: LetterCardData;
  color: string;
  index: number;
  onClick: () => void;
}

// Get theme colors based on letter type
function getThemeColor(type: string): string {
  switch (type) {
    case "love":
      return "bg-gradient-to-br from-pink-500 via-pink-400 to-rose-400 border-2 border-amber-400";
    case "friend":
      return "bg-gradient-to-br from-yellow-300 via-lime-300 to-green-300 border-2 border-lime-400";
    case "crush":
      return "bg-gradient-to-br from-white via-pink-100 to-rose-200 border-2 border-pink-300";
    case "family":
      return "bg-gradient-to-br from-white via-gray-100 to-slate-200 border-2 border-slate-300";
    default:
      return "bg-gradient-to-br from-pink-400 to-rose-400 border-2 border-amber-300";
  }
}

// Get text color based on type
function getTextColor(type: string): string {
  switch (type) {
    case "love":
      return "text-white";
    case "friend":
      return "text-black";
    case "crush":
      return "text-black";
    case "family":
      return "text-black";
    default:
      return "text-white";
  }
}

function LetterCard({ letter, color, index, onClick }: LetterCardProps) {
  const textColor = getTextColor(letter.type);

  return (
    <motion.div
      onClick={onClick}
      className={`${color} rounded-[15px] w-[283px] h-[172px] relative mx-auto cursor-pointer shadow-lg overflow-hidden`}
      initial={{ opacity: 0, y: 30, rotate: -5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        type: "spring",
        stiffness: 100,
      }}
      whileHover={{
        scale: 1.05,
        rotate: 2,
        boxShadow: "0 15px 30px rgba(0,0,0,0.3)",
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Unread badge */}
      {letter.unread && (
        <div className="absolute top-3 left-3 z-50">
          <UnreadDot />
        </div>
      )}

      {/* Envelope flap lines */}
      <motion.svg
        className="absolute top-0 left-0 right-0 pointer-events-none w-full z-0"
        height="60"
        viewBox="0 0 283 60"
        preserveAspectRatio="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.15 + 0.2 }}
      >
        <line x1="0" y1="0" x2="141.5" y2="50" stroke="white" strokeOpacity="0.6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1="283" y1="0" x2="141.5" y2="50" stroke="white" strokeOpacity="0.6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="283" y2="0" stroke="white" strokeOpacity="0.6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </motion.svg>

      {/* Center icon */}
      <motion.div
        className="absolute left-[calc(50%+2px)] top-[50px] -translate-x-1/2 -translate-y-1/2 z-10"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: index * 0.15 + 0.3,
          type: "spring",
          stiffness: 200,
        }}
      >
        <div className="absolute inset-0 -m-2 rounded-full" style={{ backgroundColor: "inherit" }} />
        <div className="relative z-10">
          <OvalLoveIcon />
        </div>
      </motion.div>

      {/* From and Date */}
      <motion.div
        className="absolute top-[100px] left-0 right-0 text-center space-y-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.15 + 0.4 }}
      >
        <p className={`font-['Inter',sans-serif] font-normal text-[13px] ${textColor} drop-shadow-md`}>
          From: {letter.from}
        </p>
        <p className={`font-['Inter',sans-serif] font-normal text-[13px] ${textColor} drop-shadow-md`}>
          Date: {letter.date}
        </p>
      </motion.div>

      {/* Type */}
      <motion.div
        className="absolute bottom-3 right-4"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className={`font-['Inter',sans-serif] font-light italic text-[14px] ${textColor === "text-white" ? "text-white/80" : "text-black/70"} capitalize`}>
          {letter.type}
        </p>
      </motion.div>
    </motion.div>
  );
}

interface LettersPageProps {
  onBack: () => void;
  language: "en" | "fr";
}

export default function LettersPage({ onBack, language }: LettersPageProps) {
  const { session } = useSession();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<{ letter: Letter; color: string } | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      if (!session.inboxId || !session.sessionToken) {
        toast.error(language === "en" ? "Invalid session" : "Session invalide");
        onBack();
        return;
      }

      try {
        const response = await listInbox(session.inboxId, session.sessionToken);
        setMessages(response.messages);
      } catch (error: any) {
        if (error.message.includes("401")) {
          toast.error(language === "en" ? "Session expired" : "Session expirée");
          onBack();
        } else if (error.message.includes("429")) {
          toast.error(language === "en" ? "Too many requests" : "Trop de requêtes");
        } else {
          toast.error(error.message || (language === "en" ? "Failed to load" : "Échec du chargement"));
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [session.inboxId, session.sessionToken, language, onBack]);

  // Sort: unread first, then most recent
  const sortedMessages = [...messages].sort((a, b) => {
    const au = (a as any).unread === true ? 1 : 0;
    const bu = (b as any).unread === true ? 1 : 0;
    if (au !== bu) return bu - au;

    const at = new Date((a as any).lastActiveAt || 0).getTime();
    const bt = new Date((b as any).lastActiveAt || 0).getTime();
    return bt - at;
  });

  const unreadCount = sortedMessages.filter((m) => (m as any).unread === true).length;

  // Cards data
  const letters: LetterCardData[] = sortedMessages.map((msg) => ({
    id: msg.id,
    from: msg.fromName,
    to: "You",
    type: msg.type === "friendship" ? ("friend" as const) : (msg.type as any),
    date: new Date((msg as any).lastActiveAt || Date.now()).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    }),
    message: msg.body,
    isAnonymous: msg.fromName.toLowerCase().includes("anonymous"),
    unread: (msg as any).unread === true,
    lastActiveAt: new Date((msg as any).lastActiveAt || Date.now()).getTime(),
  }));

  const translations = {
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
  };

  const t = translations[language];

  if (loading) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <EnvelopeIcon />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full relative overflow-hidden">
      {/* Back button */}
      <motion.div className="absolute top-10 left-6 flex items-center gap-3 cursor-pointer z-20" onClick={onBack} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
        <span className="text-[24px]">←</span>
        <p className="font-['Inter',sans-serif] font-bold text-[24px] text-[#2d1b1b]">{t.back}</p>
      </motion.div>

      {/* Title */}
      <motion.div className="pt-24 pb-6" initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[40px] text-center text-[#2d1b1b] drop-shadow-lg">{t.title}</h1>
      </motion.div>

      {/* Unread count */}
      <motion.div className="flex justify-center mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
        <p className="font-['Inter',sans-serif] font-light text-[22px] text-[#2d1b1b] text-center">
          {t.youHave}{" "}
          <motion.span className="font-bold text-[#a31e46]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6, delay: 0.8 }}>
            {unreadCount}
          </motion.span>{" "}
          {unreadCount === 1 ? t.message : t.messages} {t.waitingForYou}
        </p>
      </motion.div>

      {/* Letters list */}
      <div className="space-y-6 pb-28">
        {letters.map((letter, index) => (
          <LetterCard
            key={letter.id}
            letter={letter}
            color={getThemeColor(letter.type)}
            index={index}
            onClick={() =>
              setSelectedLetter({
                letter,
                color: getThemeColor(letter.type),
              })
            }
          />
        ))}
      </div>

      {/* Footer */}
      <motion.div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1 }}>
        <p className="font-['Inter',sans-serif] font-thin italic text-[15px] text-[#2d1b1b] text-center">{t.footer}</p>
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>
          <MdiHeart className="size-[24px]" />
        </motion.div>
      </motion.div>

      {/* Letter Detail Modal */}
      {selectedLetter && (
        <LetterDetailView
          messageId={selectedLetter.letter.id}
          color={selectedLetter.color}
          onClose={() => setSelectedLetter(null)}
          language={language}
        />
      )}
    </div>
  );
}