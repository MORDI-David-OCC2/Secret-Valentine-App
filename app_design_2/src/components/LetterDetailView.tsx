import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { useSession } from '../contexts/SessionContext';
import { getMessage, MessageDetail, MessageReply } from '../services/api';
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
  language: 'en' | 'fr';
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
        toast.error('Invalid session');
        onClose();
        return;
      }

      try {
        const response = await getMessage(
          session.inboxId,
          messageId,
          session.sessionToken
        );
        
        setMessage(response.message);
        setReplies(response.replies);
      } catch (error: any) {
        if (error.message.includes('401')) {
          toast.error('Session expired');
        } else if (error.message.includes('404')) {
          toast.error('Message not found');
        } else {
          toast.error('Failed to load message');
        }
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, [messageId, session.inboxId, session.sessionToken, onClose]);

  if (loading || !message) {
    return (
      <motion.div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
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
      </motion.div>
    );
  }

  // Convertir en format Letter pour compatibilité avec le reste du code
  const letter: Letter = {
    id: message.id,
    from: message.fromName,
    to: 'You',
    type: message.type === 'friendship' ? 'friend' : message.type,
    date: new Date(message.createdAt).toLocaleDateString(),
    message: message.body,
    isAnonymous: message.fromName.toLowerCase().includes('anonymous')
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'love': return '🌹'; // Rose
      case 'friend': return '🌻'; // Rose Jaune
      case 'family': return '🌺'; // Lys
      case 'crush': return '🌸'; // Rose Blanche
      default: return '💌';
    }
  };

  const getFlowerName = (type: string) => {
    switch (type) {
      case 'love': return 'Rose';
      case 'friend': return 'Rose Jaune';
      case 'family': return 'Lys';
      case 'crush': return 'Rose Blanche';
      default: return '';
    }
  };

  const handleSendReply = (reply: Omit<Letter, 'id' | 'date'>) => {
    onReply(reply);
    setShowReply(false);
    onClose();
  };

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

        {/* Letter Content */}
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
            transition={{ delay: 0.3 }}
          >
            ✕
          </motion.button>

          {/* Envelope Card */}
          <motion.div
            className={`${color} rounded-[20px] p-8 shadow-2xl relative overflow-hidden`}
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Decorative elements */}
            <motion.div
              className="absolute top-4 left-4 opacity-20"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                repeatDelay: 2
              }}
            >
              <MdiHeart className="size-[40px]" />
            </motion.div>
            <motion.div
              className="absolute bottom-4 right-4 opacity-20"
              animate={{ 
                rotate: [0, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                repeatDelay: 2,
                delay: 1
              }}
            >
              <MdiHeart className="size-[40px]" />
            </motion.div>

            {/* Header Icon */}
            <motion.div 
              className="flex justify-center mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.4,
                type: "spring",
                stiffness: 200
              }}
            >
              <OvalLoveIcon />
            </motion.div>

            {/* Type Badge */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-white/50">
              <div className="font-['Inter',sans-serif] font-bold text-[18px] text-black capitalize flex items-center gap-2">
                <FlowerIcon type={letter.type as any} size="sm" className="w-12 h-12" />
              </div>

              </div>
            </motion.div>

            {/* From & Date */}
            <motion.div
              className="space-y-3 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="text-center">
                <p className="font-['Inter',sans-serif] font-light text-[14px] text-black/70 mb-1">From</p>
                <p className="font-['Kaushan_Script',sans-serif] text-[28px] text-black drop-shadow-lg">
                  {letter.from}
                </p>
              </div>
              <div className="text-center">
                <p className="font-['Inter',sans-serif] font-light text-[14px] text-black/70 mb-1">Date</p>
                <p className="font-['Inter',sans-serif] font-medium text-[16px] text-black">
                  {letter.date}
                </p>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div
              className="h-[1px] bg-black/40 mb-8"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            />

            {/* Message Content */}
            <motion.div
              className="bg-white/20 backdrop-blur-sm rounded-[15px] p-6 border-2 border-white/30 min-h-[200px] relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              {/* Decorative quote marks */}
              <div className="absolute top-2 left-3 text-black/30 font-serif text-[60px] leading-none">"</div>
              <div className="absolute bottom-2 right-3 text-black/30 font-serif text-[60px] leading-none">"</div>
              
              <div className="relative z-10 pt-6 pb-6">
                {letter.message ? (
                  <p className="font-['Inter',sans-serif] font-light text-[18px] leading-relaxed text-black text-center whitespace-pre-wrap">
                    {letter.message}
                  </p>
                ) : (
                  <p className="font-['Inter',sans-serif] font-light italic text-[18px] leading-relaxed text-black/80 text-center">
                    A secret message just for you...
                  </p>
                )}
              </div>
            </motion.div>

            {/* Conversation / Replies */}
{replies.length > 0 && (
  <motion.div
    className="mt-6"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.85 }}
  >
    <p className="text-center font-['Inter',sans-serif] text-[13px] text-black/60 mb-3">
      Replies
    </p>

    <div className="space-y-3">
      {replies.map((r) => (
        <div
          key={r.id}
          className={`flex ${r.from === "me" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-[16px] px-4 py-3 border border-white/30 ${
              r.from === "me" ? "bg-white/35" : "bg-white/20"
            }`}
          >
            <p className="font-['Inter',sans-serif] text-[15px] leading-relaxed text-black whitespace-pre-wrap">
              {r.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
)}


            {/* To Field */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <p className="font-['Inter',sans-serif] font-light text-[14px] text-black/70 mb-1">To</p>
              <p className="font-['Kaushan_Script',sans-serif] text-[24px] text-black drop-shadow-lg">
                {letter.to}
              </p>
            </motion.div>

            {/* Anonymous Badge */}
            {letter.isAnonymous && (
              <motion.div
                className="mt-6 flex justify-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: "spring" }}
              >
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 flex items-center gap-2">
                  <span className="text-[16px]">🎭</span>
                  <p className="font-['Inter',sans-serif] font-light italic text-[13px] text-black">
                    Sent anonymously
                  </p>
                </div>
              </motion.div>
            )}

            {/* Floating hearts animation */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 0,
                    scale: 0 
                  }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 200,
                    y: -100 - Math.random() * 100,
                    opacity: [0, 0.6, 0],
                    scale: [0, 1, 0.8]
                  }}
                  transition={{ 
                    delay: 1.5 + i * 0.3,
                    duration: 2,
                    ease: "easeOut"
                  }}
                >
                  <MdiHeart className="size-[20px]" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="mt-6 flex gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <motion.button
              onClick={onClose}
              className="flex-1 bg-white text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(255,255,255,0.3)' }}
              whileTap={{ scale: 0.95 }}
            >
              Close
            </motion.button>
            <motion.button
              onClick={() => setShowReply(true)}
              className={`flex-1 ${color} text-white font-['Inter',sans-serif] font-bold text-[16px] rounded-[10px] h-[50px] shadow-lg flex items-center justify-center gap-2`}
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                animate={{ 
                  rotate: [0, -10, 10, -10, 0]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                ✉️
              </motion.span>
              Reply
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}