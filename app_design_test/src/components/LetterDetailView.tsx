import { motion, AnimatePresence } from 'motion/react';
import { useMemo, useState } from 'react';
import svgPaths from '../imports/svg-01d0jglvrw';
import type { MessageDetail, Reply } from '../types';
import { formatWhen, mapTypeToUi } from '../utils/format';
import ReplyToLetterView from './ReplyToLetterView';
import React from "react";

function MdiHeart({ className }: { className?: string }) {
  return (
    <div className={className || 'relative shrink-0 size-[24px]'} data-name="mdi:heart">
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
  message: MessageDetail;
  replies?: Reply[];
  color: string;
  onClose: () => void;
  onSendReply: (body: string) => Promise<void>;
}

export default function LetterDetailView({
  messageId,
  message,
  replies = [],
  color,
  onClose,
  onSendReply,
}: LetterDetailViewProps) {
  const [showReply, setShowReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const uiType = useMemo(() => mapTypeToUi(message.type), [message.type]);

  if (!message) {
    return null; // or render a Loading UI
  }

  // keep the rest of your file unchanged below
  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'love':
        return '🌹';
      case 'friend':
        return '🌻';
      case 'family':
        return '🌺';
      case 'crush':
        return '🌸';
      default:
        return '💌';
    }
  };

  const getFlowerName = (type: string) => {
    switch (type) {
      case 'love':
        return 'Rose';
      case 'friend':
        return 'Rose Jaune';
      case 'family':
        return 'Lys';
      case 'crush':
        return 'Rose Blanche';
      default:
        return '';
    }
  };

  const createdAt = formatWhen(message.createdAt);
  const fromName = message.fromName || 'Anonymous';
  const body = message.body || '';

  const sortedReplies = useMemo(() => {
    return [...(replies || [])].sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
  }, [replies]);

  const handleSendReply = async (replyBody: string) => {
    try {
      setSendingReply(true);
      await onSendReply(replyBody);
      setShowReply(false);
      onClose();
    } finally {
      setSendingReply(false);
    }
  };

  if (showReply) {
    return (
      <ReplyToLetterView
        toName={fromName}
        originalMessage={body}
        color={color}
        isSending={sendingReply}
        onClose={() => setShowReply(false)}
        onSend={handleSendReply}
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
          transition={{ type: 'spring', stiffness: 200, damping: 20, duration: 0.6 }}
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
          <motion.div className={`${color} rounded-[20px] p-8 shadow-2xl relative overflow-hidden`} initial={{ y: 50 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
            {/* Decorative elements */}
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

            {/* Header Icon */}
            <motion.div className="flex justify-center mb-6" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}>
              <OvalLoveIcon />
            </motion.div>

            {/* Type Badge */}
            <motion.div className="flex justify-center mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-white/50">
                <p className="font-['Inter',sans-serif] font-bold text-[18px] text-white capitalize flex items-center gap-2">
                  <span>{getTypeEmoji(uiType)}</span>
                  {getFlowerName(uiType)}
                </p>
              </div>
            </motion.div>

            {/* From & Date */}
            <motion.div className="space-y-3 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <div className="text-center">
                <p className="font-['Inter',sans-serif] font-light text-[14px] text-white/80 mb-1">From</p>
                <p className="font-['Kaushan_Script',sans-serif] text-[28px] text-white drop-shadow-lg">{fromName}</p>
              </div>
              <div className="text-center">
                <p className="font-['Inter',sans-serif] font-light text-[14px] text-white/80 mb-1">Date</p>
                <p className="font-['Inter',sans-serif] font-medium text-[16px] text-white">{createdAt}</p>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div className="h-[1px] bg-white/40 mb-8" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.6 }} />

            {/* Message Content */}
            <motion.div className="bg-white/20 backdrop-blur-sm rounded-[16px] p-6 border border-white/30 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <p className="font-['Inter',sans-serif] font-light text-[18px] text-white leading-relaxed whitespace-pre-wrap">“{body}”</p>
            </motion.div>

            {/* Replies */}
            {sortedReplies.length > 0 && (
              <motion.div className="space-y-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
                <p className="font-['Inter',sans-serif] font-medium text-[13px] text-white/90">Replies</p>
                {sortedReplies.map((r, idx) => (
                  <div key={`${messageId}-r-${idx}`} className="bg-white/15 rounded-[14px] p-4 border border-white/20">
                    <div className="font-['Inter',sans-serif] text-[14px] text-white whitespace-pre-wrap">{r.body || ''}</div>
                    <div className="mt-2 font-['Inter',sans-serif] text-[12px] text-white/70">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div className="flex gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <motion.button
                onClick={onClose}
                className="flex-1 bg-white/90 text-[#2d1b1b] py-3 rounded-[12px] font-['Inter',sans-serif] font-medium text-[16px] shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
              {message.replyEnabled ? (
                <motion.button
                  onClick={() => setShowReply(true)}
                  className="flex-1 bg-white/30 backdrop-blur-sm text-white py-3 rounded-[12px] font-['Inter',sans-serif] font-medium text-[16px] border border-white/40"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Reply
                </motion.button>
              ) : (
                <div className="flex-1" />
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
