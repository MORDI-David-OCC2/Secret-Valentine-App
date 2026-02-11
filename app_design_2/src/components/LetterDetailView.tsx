import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner@2.0.3';
import { useSession } from '../contexts/SessionContext';
import { getMessage, MessageDetail, MessageReply } from '../services/api';
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
  language: 'en' | 'fr';
}

function formatDate(msOrIso: any) {
  try {
    const d = new Date(msOrIso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function formatTimestamp(msOrIso: any) {
  try {
    const d = new Date(msOrIso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        if (msg.includes('401')) toast.error(language === "en" ? "Session expired" : "Session expirée");
        else if (msg.includes('404')) toast.error(language === "en" ? "Message not found" : "Message introuvable");
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
      to: 'You',
      type: message.type === 'friendship' ? 'friend' : (message.type as any),
      date: formatDate(message.createdAt),
      message: message.body,
      isAnonymous: message.fromName?.toLowerCase?.().includes('anonymous') || false
    };
  }, [message]);

  const getFlowerName = (type: string) => {
    switch (type) {
      case 'love': return 'Rose';
      case 'friend': return 'Rose Jaune';
      case 'family': return 'Lys';
      case 'crush': return 'Rose Blanche';
      default: return '';
    }
  };

  if (loading || !message || !letter) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center flex-col gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          💌
        </motion.div>
        <p className="font-['Inter',sans-serif] text-white text-lg">
          {language === 'en' ? 'Opening your love letter...' : 'Ouverture de votre lettre d\'amour...'}
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
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Content */}
        <motion.div
          className="relative w-full max-w-[360px] max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotateY: 90 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 0.6
          }}
        >
          {/* Close Button */}
          <motion.button
            onClick={onClose}
            className="absolute -top-12 right-0 size-10 rounded-full bg-white/90 flex items-center justify-center text-[#2d1b1b] font-bold text-xl shadow-lg z-10"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ✕
          </motion.button>

          <motion.div
            className={`${color} rounded-[20px] p-8 shadow-2xl relative overflow-hidden`}
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Decorative hearts */}
            <motion.div
              className="absolute top-4 left-4 opacity-20"
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
            >
              <MdiHeart className="size-[40px]" />
            </motion.div>
            <motion.div
              className="absolute bottom-4 right-4 opacity-20"
              animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, delay: 1 }}
            >
              <MdiHeart className="size-[40px]" />
            </motion.div>

            {/* Header icon */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <OvalLoveIcon />
            </motion.div>

            {/* Type badge */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-white/50">
                <p className="font-['Inter',sans-serif] font-bold text-[18px] text-black capitalize flex items-center gap-2">
                  <span className="text-[18px]">🌸</span>
                  {getFlowerName(letter.type)}
                </p>
              </div>
            </motion.div>

            {/* From & Date */}
            <motion.div
              className="space-y-3 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-center">
                <p className="font-['Inter',sans-serif] font-light text-[14px] text-black/70 mb-1">
                  {language === "en" ? "From" : "De"}
                </p>
                <p className="font-['Kaushan_Script',sans-serif] text-[28px] text-black drop-shadow-lg">
                  {letter.from}
                </p>
              </div>

              <div className="text-center">
                <p className="font-['Inter',sans-serif] font-light text-[14px] text-black/70 mb-1">
                  {language === "en" ? "Date" : "Date"}
                </p>
                <p className="font-['Inter',sans-serif] font-medium text-[16px] text-black">
                  {letter.date}
                </p>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div
              className="h-[1px] bg-black/40 mb-6"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            />

            {/* CONTENT AREA */}
            {!replyEnabled ? (
              // ✅ Replies disabled: keep "letter" bubble
              <motion.div
                className="bg-white/20 backdrop-blur-sm rounded-[15px] p-6 border-2 border-white/30 min-h-[200px] relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="absolute top-2 left-3 text-black/30 font-serif text-[60px] leading-none">"</div>
                <div className="absolute bottom-2 right-3 text-black/30 font-serif text-[60px] leading-none">"</div>

                <div className="relative z-10 pt-6 pb-6">
                  {letter.message ? (
                    <p className="font-['Inter',sans-serif] font-light text-[18px] leading-relaxed text-black text-center whitespace-pre-wrap">
                      {letter.message}
                    </p>
                  ) : (
                    <p className="font-['Inter',sans-serif] font-light italic text-[18px] leading-relaxed text-black/80 text-center">
                      {language === "en" ? "A secret message just for you..." : "Un message secret rien que pour toi..."}
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              // ✅ Replies enabled: show as a conversation thread
              <motion.div
                className="bg-white/15 backdrop-blur-sm rounded-[15px] p-4 border-2 border-white/25 max-h-[300px] overflow-y-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="space-y-3">
                  {/* original message bubble (them - left) */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="rounded-[18px] px-4 py-3 bg-white/30 border border-white/30">
                        <p className="font-['Inter',sans-serif] text-[15px] leading-relaxed text-black whitespace-pre-wrap">
                          {letter.message || (language === "en" ? "A secret message just for you..." : "Un message secret rien que pour toi...")}
                        </p>
                      </div>
                      <p className="font-['Inter',sans-serif] text-[11px] text-black/50 mt-1 ml-2">
                        {formatTimestamp(message.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* replies */}
                  {replies.map((r) => (
                    <div key={r.id} className={`flex ${r.from === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] ${r.from === "me" ? "items-end" : "items-start"} flex flex-col`}>
                        <div
                          className={`rounded-[18px] px-4 py-3 border border-white/30 ${
                            r.from === "me" ? "bg-white/45" : "bg-white/25"
                          }`}
                        >
                          <p className="font-['Inter',sans-serif] text-[15px] leading-relaxed text-black whitespace-pre-wrap">
                            {r.body}
                          </p>
                        </div>
                        <p className={`font-['Inter',sans-serif] text-[11px] text-black/50 mt-1 ${r.from === "me" ? "mr-2" : "ml-2"}`}>
                          {formatTimestamp(r.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* To field */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="font-['Inter',sans-serif] font-light text-[14px] text-black/70 mb-1">
                {language === "en" ? "To" : "À"}
              </p>
              <p className="font-['Kaushan_Script',sans-serif] text-[24px] text-black drop-shadow-lg">
                {letter.to}
              </p>
            </motion.div>

            {/* Anonymous badge */}
            {letter.isAnonymous && (
              <motion.div
                className="mt-4 flex justify-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
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
          <motion.div
            className="mt-6 flex gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={onClose}
              className="flex-1 bg-white text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(255,255,255,0.3)' }}
              whileTap={{ scale: 0.95 }}
            >
              {language === "en" ? "Close" : "Fermer"}
            </motion.button>

            {/* ✅ Only show reply button if enabled */}
            {replyEnabled && (
              <motion.button
                onClick={() => setShowReply(true)}
                className={`flex-1 ${color} text-white font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg flex items-center justify-center gap-2`}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
                >
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