import { useState } from 'react';
import { motion } from 'motion/react';
import svgPaths from '../imports/svg-kcw2rymt7y';

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
  /** Name shown to the user (newer prop name). */
  toName?: string;
  /** Backward compatible prop name used by older callers. */
  originalFrom?: string;

  originalMessage: string;
  color: string;

  /** Optional external sending state (if the parent wants to control it). */
  isSending?: boolean;

  onClose: () => void;
  onSend: (body: string) => Promise<void> | void;
}

export default function ReplyToLetterView({
  toName,
  originalFrom,
  originalMessage,
  color,
  isSending,
  onClose,
  onSend,
}: ReplyToLetterViewProps) {
  const [message, setMessage] = useState('');
  const [localSending, setLocalSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = toName || originalFrom || 'Anonymous';
  const sending = typeof isSending === 'boolean' ? isSending : localSending;

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please write a message.');
      return;
    }

    setError(null);
    setLocalSending(true);
    try {
      await onSend(message.trim());
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to send reply');
    } finally {
      setLocalSending(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Reply Form */}
      <motion.div
        className="relative w-full max-w-[380px] max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <motion.div className={`${color} rounded-[20px] p-7 shadow-2xl relative overflow-hidden`}>
          <motion.div className="flex items-center justify-center gap-2 mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EnvelopeIcon />
            <h2 className="font-['Kaushan_Script',sans-serif] text-[28px] text-white drop-shadow-lg">Reply</h2>
          </motion.div>

          <motion.div className="mb-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <p className="font-['Inter',sans-serif] text-white/90 text-[14px] text-center">
              Send your response to <span className="font-medium">{displayName}</span>
            </p>
          </motion.div>

          {/* Original Message Preview */}
          <motion.div
            className="bg-white/20 backdrop-blur-sm rounded-[12px] p-4 mb-6 border border-white/30"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-white/80 text-xs mb-2 font-['Inter',sans-serif]">Original message</p>
            <p className="text-white text-sm whitespace-pre-wrap font-['Inter',sans-serif]">“{originalMessage}”</p>
          </motion.div>

          {/* Reply textarea */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your reply..."
              rows={6}
              className="w-full bg-white/20 border border-white/40 rounded-[12px] px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/60 transition-all font-['Inter',sans-serif]"
            />
            {error && <p className="mt-2 text-sm text-white/90 bg-black/20 rounded-lg px-3 py-2">{error}</p>}
          </motion.div>

          {/* Send Button */}
          <motion.button
            onClick={handleSubmit}
            disabled={sending}
            className="mt-6 w-full bg-white/95 hover:bg-white text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] py-4 rounded-[12px] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {sending ? 'Sending…' : 'Send Reply'}
          </motion.button>

          {/* Decorative hearts */}
          <motion.div className="absolute -top-3 -left-3 opacity-25" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <MdiHeart className="size-[38px]" />
          </motion.div>
          <motion.div className="absolute -bottom-3 -right-3 opacity-25" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}>
            <MdiHeart className="size-[38px]" />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}