// src/components/ReplyToLetterView.tsx
import { useState } from "react";
import { motion } from "motion/react";
import { sendReply, MessageReply } from "../services/api";
import { useSession } from "../contexts/SessionContext";
import { toast } from "sonner";
import svgPaths from "../imports/svg-01d0jglvrw";
import type { Letter } from "../App";
import type { ApiError } from "../services/api";

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

interface ReplyToLetterViewProps {
  messageId: string;
  originalLetter: Letter;
  color: string;
  onClose: () => void;
  language: "en" | "fr";

  // ✅ notify parent so it can update conversation immediately
  onSent?: (reply: MessageReply) => void;
}

export default function ReplyToLetterView({
  messageId,
  originalLetter,
  color,
  onClose,
  language,
  onSent,
}: ReplyToLetterViewProps) {
  const { session } = useSession();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const t = {
    en: {
      replyTo: "Reply to",
      yourMessage: "Your Message",
      characterCount: "characters",
      cancel: "Cancel",
      send: "Send Reply",
      sending: "Sending...",
      empty: "Message is empty",
      tooLong: "Message too long (max 2000)",
      invalidSession: "Invalid session",
      sent: "Reply sent! 💌",
      disabled: "Replies disabled",
      tooMany: "Too many replies",
      expired: "Session expired",
      blocked: "Blocked by moderation",
      failed: "Failed to send",
      placeholder: "Write your heartfelt reply...",
      original: "Original message:",
      sendTo: "Send your response to",
    },
    fr: {
      replyTo: "Répondre à",
      yourMessage: "Votre Message",
      characterCount: "caractères",
      cancel: "Annuler",
      send: "Envoyer la Réponse",
      sending: "Envoi...",
      empty: "Message vide",
      tooLong: "Message trop long (max 2000)",
      invalidSession: "Session invalide",
      sent: "Réponse envoyée! 💌",
      disabled: "Réponses désactivées",
      tooMany: "Trop de réponses",
      expired: "Session expirée",
      blocked: "Bloqué par modération",
      failed: "Échec d'envoi",
      placeholder: "Écrivez votre réponse...",
      original: "Message original :",
      sendTo: "Envoyer votre réponse à",
    },
  }[language];

  const handleSubmit = async () => {
    const body = message.trim();
    if (!body) {
      toast.error(t.empty);
      return;
    }
    if (body.length > 2000) {
      toast.error(t.tooLong);
      return;
    }
    if (!session.inboxId || !session.sessionToken) {
      toast.error(t.invalidSession);
      return;
    }

    setIsSending(true);

    try {
      const res = await sendReply({
        inboxId: session.inboxId,
        messageId,
        body,
        sessionToken: session.sessionToken,
      });

      const reply: MessageReply = {
        id: res.replyId || `local_${Date.now()}`,
        body,
        from: "me",
        createdAt: Date.now(),
      };

      toast.success(t.sent);
      onSent?.(reply);
    } catch (error: any) {
      const msg = String(error?.message || "");
      const apiError= error as ApiError;
      if (msg.includes("403")) toast.error(t.disabled);
      else if (apiError.statusCode === 429) toast.error(t.tooMany);
      else if (apiError.statusCode === 401) toast.error(t.expired);
      else if (msg.toLowerCase().includes("block")) toast.error(t.blocked);
      else toast.error(error?.message || t.failed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

      <motion.div
        className="relative w-full max-w-[380px] max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
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
          className={`${color} rounded-[20px] p-6 shadow-2xl relative overflow-hidden`}
          initial={{ rotateX: -90 }}
          animate={{ rotateX: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
        >
          <motion.div className="absolute top-4 left-4 opacity-20" animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
            <MdiHeart className="size-[40px]" />
          </motion.div>
          <motion.div className="absolute bottom-4 right-4 opacity-20" animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}>
            <MdiHeart className="size-[40px]" />
          </motion.div>

          <motion.div className="flex flex-col items-center mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
              <EnvelopeIcon />
            </motion.div>

            <h2 className="font-['Playfair_Display',serif] italic font-bold text-[28px] text-black mt-3 text-center drop-shadow-lg">
              {t.replyTo} {originalLetter.from}
            </h2>

            <p className="font-['Cormorant_Garamond',serif] italic font-light text-[15px] text-black/80 mt-2 text-center">
              {t.sendTo} <span className="font-medium">{originalLetter.from}</span>
            </p>
          </motion.div>

          <motion.div className="bg-white/20 backdrop-blur-sm rounded-[12px] p-4 mb-6 border border-white/30" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <p className="font-['Cormorant_Garamond',serif] italic font-medium text-[13px] text-black/70 mb-2">
              {t.original}
            </p>
            <p className="font-['Cormorant_Garamond',serif] italic font-light text-[16px] text-black line-clamp-3">
              "{originalLetter.message || (language === "en" ? "A secret message just for you..." : "Un message secret rien que pour toi...")}"
            </p>
          </motion.div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              <p className="font-['Cormorant_Garamond',serif] italic font-bold text-[16px] text-black mb-2">
                {t.yourMessage}:
              </p>
              <motion.textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.placeholder}
                rows={8}
                className="w-full bg-white/90 border-2 border-white rounded-[10px] p-4 font-['Cormorant_Garamond',serif] italic text-[16px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-white focus:bg-white resize-none transition-all"
                whileFocus={{ scale: 1.02 }}
              />
              <p className="font-['Cormorant_Garamond',serif] italic font-light text-[13px] text-black/70 mt-1">
                {message.length} {t.characterCount}
              </p>
            </motion.div>

            <motion.div className="flex gap-3 pt-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <motion.button
                onClick={onClose}
                className="flex-1 bg-white/30 backdrop-blur-sm text-black font-['Cormorant_Garamond',serif] italic font-bold text-[18px] rounded-[10px] h-[50px] border-2 border-white/50"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isSending}
              >
                {t.cancel}
              </motion.button>

              <motion.button
                onClick={handleSubmit}
                disabled={isSending}
                className="flex-1 bg-white text-[#2d1b1b] font-['Cormorant_Garamond',serif] italic font-bold text-[18px] rounded-[10px] h-[50px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!isSending ? { scale: 1.03 } : {}}
                whileTap={!isSending ? { scale: 0.97 } : {}}
              >
                {isSending ? (
                  <motion.div className="flex items-center justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <motion.div className="size-5 border-2 border-[#2d1b1b] border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                    {t.sending}
                  </motion.div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {t.send}
                    <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}>
                      ✉️
                    </motion.span>
                  </span>
                )}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}