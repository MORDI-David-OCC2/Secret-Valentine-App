import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner@2.0.3";
import { useSession } from "../contexts/SessionContext";
import { getMessage, MessageDetail, MessageReply } from "../services/api";
import svgPaths from "../imports/svg-01d0jglvrw";
import type { Letter } from "../App";
import ReplyToLetterView from "./ReplyToLetterView";
import FlowerIcon from "./Fleurs";

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

function formatDate(msOrIso: any, language: "en" | "fr") {
  try {
    const d = new Date(msOrIso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(language === "fr" ? "fr-FR" : undefined);
  } catch {
    return "";
  }
}

function formatTimestamp(msOrIso: any, language: "en" | "fr") {
  try {
    const d = new Date(msOrIso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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
      type: message.type === "friendship" ? "friend" : (message.type as any),
      date: formatDate(message.createdAt, language),
      message: message.body,
      isAnonymous: message.fromName?.toLowerCase?.().includes("anonymous") || false,
    };
  }, [message, language]);

  if (loading || !message || !letter) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center flex-col gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl">
          💌
        </motion.div>
        <p className="text-white italic font-['Cormorant_Garamond',serif] text-[16px]">
          {language === "en" ? "Opening your love letter..." : "Ouverture de votre lettre d'amour..."}
        </p>
      </motion.div>
    );
  }

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

  const replyEnabled = !!message.replyEnabled;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          paddingTop: "max(14px, env(safe-area-inset-top))",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
        }}
      >
        {/* Backdrop */}
        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Content wrapper */}
        <motion.div
          className="relative w-full max-w-[360px]"
          style={{
            // Réduit la hauteur max pour éviter de toucher la barre du haut/bas
            maxHeight: "calc(100dvh - max(28px, env(safe-area-inset-top)) - max(28px, env(safe-area-inset-bottom)) - 24px)",
            transform: "translateY(-40px)",
          }}
          initial={{ scale: 0.6, opacity: 0, rotateY: -60 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.6, opacity: 0, rotateY: 60 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          {/* Card */}
          <motion.div
            className={`${color} rounded-[20px] shadow-2xl relative overflow-hidden`}
            initial={{ y: 18 }}
            animate={{ y: 0 }}
          >
            {/* Close INSIDE card (fix principal) */}
            <motion.button
              onClick={onClose}
              className="
                absolute top-3 right-3
                size-10 rounded-full
                bg-white/90
                flex items-center justify-center
                text-[color:var(--text)]
                font-bold text-xl
                shadow-lg
                z-20
              "
              whileHover={{ scale: 1.06, rotate: 90 }}
              whileTap={{ scale: 0.94 }}
              aria-label={language === "en" ? "Close" : "Fermer"}
            >
              ✕
            </motion.button>

            {/* Scroll area (only inside the card) */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: "inherit" }}>
              {/* Decorative hearts */}
              <motion.div
                className="absolute top-4 left-4 opacity-20 pointer-events-none"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
              >
                <MdiHeart className="size-[36px]" />
              </motion.div>
              <motion.div
                className="absolute bottom-4 right-4 opacity-20 pointer-events-none"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, delay: 1 }}
              >
                <MdiHeart className="size-[36px]" />
              </motion.div>

              {/* Header icon */}
              <div className="flex justify-center mb-4 pt-2">
                <OvalLoveIcon />
              </div>

              {/* Type badge */}
              <div className="flex justify-center mb-4">
                <div className="bg-white/30 backdrop-blur-sm px-5 py-2 rounded-full border border-white/50 flex items-center gap-2">
                  <FlowerIcon type={letter.type} size="sm" />
                </div>
              </div>

              {/* From & Date */}
              <div className="space-y-3 mb-4 text-center">
                <div>
                  <p className="italic text-[12px] text-black/70 font-['Cormorant_Garamond',serif]">
                    {language === "en" ? "From" : "De"}
                  </p>
                  <p className="font-['Playfair_Display',serif] italic font-bold text-[20px] text-black drop-shadow">
                    {letter.from}
                  </p>
                </div>
                <div>
                  <p className="italic text-[12px] text-black/70 font-['Cormorant_Garamond',serif]">
                    {language === "en" ? "Date" : "Date"}
                  </p>
                  <p className="font-['Cormorant_Garamond',serif] italic font-semibold text-[14px] text-black">
                    {letter.date}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-black/30 mb-4" />

              {/* CONTENT AREA */}
              {!replyEnabled ? (
                <div className="bg-white/20 backdrop-blur-sm rounded-[15px] p-5 border border-white/30 min-h-[160px] relative">
                  <div className="absolute top-2 left-3 text-black/25 font-serif text-[52px] leading-none">"</div>
                  <div className="absolute bottom-2 right-3 text-black/25 font-serif text-[52px] leading-none">"</div>

                  <div className="relative z-10 pt-5 pb-4">
                    {letter.message ? (
                      <p className="font-['Cormorant_Garamond',serif] italic text-[16px] leading-relaxed text-black text-center whitespace-pre-wrap">
                        {letter.message}
                      </p>
                    ) : (
                      <p className="font-['Cormorant_Garamond',serif] italic text-[16px] leading-relaxed text-black/80 text-center">
                        {language === "en" ? "A secret message just for you..." : "Un message secret rien que pour toi..."}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/15 backdrop-blur-sm rounded-[15px] p-4 border border-white/25 max-h-[280px] overflow-y-auto">
                  <div className="space-y-3">
                    {/* original bubble */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="rounded-[18px] px-4 py-3 bg-white/30 border border-white/30">
                          <p className="font-['Cormorant_Garamond',serif] italic text-[15px] leading-relaxed text-black whitespace-pre-wrap">
                            {letter.message ||
                              (language === "en" ? "A secret message just for you..." : "Un message secret rien que pour toi...")}
                          </p>
                        </div>
                        <p className="font-['Cormorant_Garamond',serif] italic text-[11px] text-black/50 mt-1 ml-2">
                          {formatTimestamp(message.createdAt, language)}
                        </p>
                      </div>
                    </div>

                    {/* replies */}
                    {replies.map((r) => (
                      <div key={r.id} className={`flex ${r.from === "me" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] ${r.from === "me" ? "items-end" : "items-start"} flex flex-col`}>
                          <div className={`rounded-[18px] px-4 py-3 border border-white/30 ${r.from === "me" ? "bg-white/45" : "bg-white/25"}`}>
                            <p className="font-['Cormorant_Garamond',serif] italic text-[15px] leading-relaxed text-black whitespace-pre-wrap">
                              {r.body}
                            </p>
                          </div>
                          <p className={`font-['Cormorant_Garamond',serif] italic text-[11px] text-black/50 mt-1 ${r.from === "me" ? "mr-2" : "ml-2"}`}>
                            {formatTimestamp(r.createdAt, language)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* To */}
              <div className="mt-4 text-center">
                <p className="italic text-[12px] text-black/70 font-['Cormorant_Garamond',serif]">{language === "en" ? "To" : "À"}</p>
                <p className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-black drop-shadow">{letter.to}</p>
              </div>

              {/* Anonymous badge */}
              {letter.isAnonymous && (
                <div className="mt-4 flex justify-center">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 flex items-center gap-2">
                    <span className="text-[16px]">🎭</span>
                    <p className="font-['Cormorant_Garamond',serif] italic text-[12px] text-black">
                      {language === "en" ? "Sent anonymously" : "Envoyé anonymement"}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-[14px] h-[48px] bg-white/90 text-[color:var(--text)] font-['Playfair_Display',serif] italic font-bold text-[14px] shadow-md"
                >
                  {language === "en" ? "Close" : "Fermer"}
                </button>

                {replyEnabled && (
                  <button
                    onClick={() => setShowReply(true)}
                    className={`flex-1 rounded-[14px] h-[48px] ${color} text-white font-['Playfair_Display',serif] italic font-bold text-[14px] shadow-md`}
                  >
                    {language === "en" ? "Reply" : "Répondre"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}