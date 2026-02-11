import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner@2.0.3";
import { useSession } from "../contexts/SessionContext";
import { getMessage, MessageDetail, MessageReply } from "../services/api";
import svgPaths from "../imports/svg-01d0jglvrw";
import type { Letter } from "../App";
import ReplyToLetterView from "./ReplyToLetterView";

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

interface LetterDetailViewProps {
  messageId: string;
  color: string;
  onClose: () => void;
  language: "en" | "fr";
}

function formatDate(ms?: number) {
  if (!ms) return "";
  try {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatTime(ms?: number) {
  if (!ms) return "";
  try {
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Bubble({
  side,
  name,
  time,
  text,
}: {
  side: "left" | "right";
  name: string;
  time: string;
  text: string;
}) {
  const isRight = side === "right";

  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <div className={`text-[11px] mb-1 px-1 flex gap-2 ${isRight ? "justify-end" : "justify-start"} text-black/60`}>
          <span className="font-semibold">{name}</span>
          {time ? <span className="opacity-70">{time}</span> : null}
        </div>

        <div
          className={[
            "rounded-[18px] px-4 py-3 border border-white/25 shadow-sm",
            isRight ? "bg-white/45" : "bg-white/25",
          ].join(" ")}
        >
          <p className="font-['Inter',sans-serif] text-[15px] leading-relaxed text-black whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LetterDetailView({ messageId, color, onClose, language }: LetterDetailViewProps) {
  const { session } = useSession();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    const loadMessage = async () => {
      if (!session.inboxId || !session.sessionToken) {
        toast.error(language === "en" ? "Invalid session" : "Session invalide");
        onClose();
        return;
      }

      try {
        const response = await getMessage(session.inboxId, messageId, session.sessionToken);
        setMessage(response.message);
        setReplies(response.replies || []);
      } catch (error: any) {
        const msg = String(error?.message || "");
        if (msg.includes("401")) toast.error(language === "en" ? "Session expired" : "Session expirée");
        else if (msg.includes("404")) toast.error(language === "en" ? "Message not found" : "Message introuvable");
        else toast.error(language === "en" ? "Failed to load message" : "Échec du chargement");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, [messageId, session.inboxId, session.sessionToken, onClose, language]);

  const letter: Letter | null = useMemo(() => {
    if (!message) return null;
    return {
      id: message.id,
      from: message.fromName,
      to: "You",
      type: message.type === "friendship" ? ("friend" as const) : (message.type as any),
      date: formatDate(message.createdAt),
      message: message.body,
      isAnonymous: message.fromName?.toLowerCase?.().includes("anonymous") || false,
    };
  }, [message]);

  const getFlowerName = (type: string) => {
    switch (type) {
      case "love":
        return language === "en" ? "Rose" : "Rose";
      case "friend":
        return language === "en" ? "Yellow Rose" : "Rose Jaune";
      case "family":
        return language === "en" ? "Lily" : "Lys";
      case "crush":
        return language === "en" ? "White Rose" : "Rose Blanche";
      default:
        return "";
    }
  };

  if (loading || !message || !letter) {
    return (
      <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl">
          💌
        </motion.div>
      </motion.div>
    );
  }

  const replyEnabled = !!message.replyEnabled;

  if (showReply) {
    return (
      <ReplyToLetterView
        messageId={messageId}
        originalLetter={letter}
        color={color}
        onClose={() => setShowReply(false)}
        language={language}
      />
    );
  }

  const meLabel = language === "en" ? "You" : "Vous";
  const themLabel = letter.from || (language === "en" ? "Someone" : "Quelqu'un");

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {/* Backdrop */}
        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

        {/* Card */}
        <motion.div
          className="relative w-full max-w-[380px] max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotateY: 90 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6 }}
        >
          {/* Close Button */}
          <motion.button
            onClick={onClose}
            className="absolute -top-12 right-0 size-10 rounded-full bg-white/90 flex items-center justify-center text-[#2d1b1b] font-bold text-xl shadow-lg z-10"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            ✕
          </motion.button>

          <motion.div className={`${color} rounded-[20px] p-6 shadow-2xl relative overflow-hidden`} initial={{ y: 50 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
            {/* Decorative hearts */}
            <motion.div className="absolute top-4 left-4 opacity-20" animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}>
              <MdiHeart className="size-[40px]" />
            </motion.div>
            <motion.div className="absolute bottom-4 right-4 opacity-20" animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, delay: 1 }}>
              <MdiHeart className="size-[40px]" />
            </motion.div>

            {/* Header icon */}
            <motion.div className="flex justify-center mb-4" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4, type: "spring", stiffness: 200 }}>
              <OvalLoveIcon />
            </motion.div>

            {/* Type badge */}
            <motion.div className="flex justify-center mb-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="bg-white/30 backdrop-blur-sm px-5 py-2 rounded-full border-2 border-white/50">
                <p className="font-['Inter',sans-serif] font-bold text-[16px] text-black capitalize flex items-center gap-2">
                  <span className="text-[16px]">🌸</span>
                  {getFlowerName(letter.type)}
                </p>
              </div>
            </motion.div>

            {/* If replies disabled: keep "letter" look */}
            {!replyEnabled ? (
              <>
                <motion.div className="space-y-2 mb-5 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  <p className="font-['Inter',sans-serif] font-light text-[13px] text-black/70">
                    {language === "en" ? "From" : "De"}
                  </p>
                  <p className="font-['Kaushan_Script',sans-serif] text-[28px] text-black drop-shadow-lg">{letter.from}</p>
                  <p className="font-['Inter',sans-serif] font-medium text-[14px] text-black">
                    {formatDate(message.createdAt)} {formatTime(message.createdAt)}
                  </p>
                </motion.div>

                <motion.div className="h-[1px] bg-black/40 mb-5" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.6 }} />

                <motion.div className="bg-white/20 backdrop-blur-sm rounded-[15px] p-6 border-2 border-white/30 min-h-[200px] relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                  <div className="absolute top-2 left-3 text-black/30 font-serif text-[60px] leading-none">"</div>
                  <div className="absolute bottom-2 right-3 text-black/30 font-serif text-[60px] leading-none">"</div>

                  <div className="relative z-10 pt-6 pb-6">
                    {letter.message ? (
                      <p className="font-['Inter',sans-serif] font-light text-[18px] leading-relaxed text-black text-center whitespace-pre-wrap">{letter.message}</p>
                    ) : (
                      <p className="font-['Inter',sans-serif] font-light italic text-[18px] leading-relaxed text-black/80 text-center">
                        {language === "en" ? "A secret message just for you..." : "Un message secret rien que pour toi..."}
                      </p>
                    )}
                  </div>
                </motion.div>
              </>
            ) : (
              // Replies enabled: show real conversation thread
              <>
                <motion.div className="flex items-center justify-center mb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  <div className="bg-white/25 border border-white/30 text-black/80 text-[12px] px-3 py-1 rounded-full">
                    {formatDate(message.createdAt)}
                  </div>
                </motion.div>

                <motion.div className="bg-white/15 backdrop-blur-sm rounded-[15px] p-4 border-2 border-white/25" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <div className="space-y-4">
                    {/* Original message = them (left) */}
                    <Bubble side="left" name={themLabel} time={formatTime(message.createdAt)} text={letter.message || (language === "en" ? "A secret message just for you..." : "Un message secret rien que pour toi...")} />

                    {/* Replies */}
                    {replies.map((r: any) => {
                      const from = String((r as any).from || "them");
                      const isMe = from === "me";
                      return (
                        <Bubble
                          key={r.id}
                          side={isMe ? "right" : "left"}
                          name={isMe ? meLabel : themLabel}
                          time={formatTime((r as any).createdAt)}
                          text={r.body}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}

            {/* Anonymous badge */}
            {letter.isAnonymous && (
              <motion.div className="mt-4 flex justify-center" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: "spring" }}>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 flex items-center gap-2">
                  <span className="text-[16px]">🎭</span>
                  <p className="font-['Inter',sans-serif] font-light italic text-[13px] text-black">
                    {language === "en" ? "Sent anonymously" : "Envoyé anonymement"}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Action buttons */}
          <motion.div className="mt-6 flex gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
            <motion.button
              onClick={onClose}
              className="flex-1 bg-white text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg"
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.95 }}
            >
              {language === "en" ? "Close" : "Fermer"}
            </motion.button>

            {replyEnabled && (
              <motion.button
                onClick={() => setShowReply(true)}
                className={`flex-1 ${color} text-white font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg flex items-center justify-center gap-2`}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}>
                  ✉️
                </motion.span>
                {language === "en" ? "Reply" : "Répondre"}
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}