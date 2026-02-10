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
  originalFrom: string;
  originalMessage: string;
  color: string;
  onClose: () => void;
  onSend: (body: string) => Promise<void> | void;
}

export default function ReplyToLetterView({ originalFrom, originalMessage, color, onClose, onSend }: ReplyToLetterViewProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please write a message.');
      return;
    }

    setError(null);
    setIsSending(true);
    try {
      await onSend(message.trim());
      onClose();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Backdrop */}
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

      {/* Reply Form */}
      <motion.div
        className="relative w-full max-w-[380px] max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
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

        {/* Container */}
        <motion.div className={`${color} rounded-[20px] p-6 shadow-2xl relative overflow-hidden`} initial={{ rotateX: -90 }} animate={{ rotateX: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}>
          {/* Decorative hearts */}
          <motion.div className="absolute top-4 left-4 opacity-20" animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
            <MdiHeart className="size-[40px]" />
          </motion.div>
          <motion.div
            className="absolute bottom-4 right-4 opacity-20"
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          >
            <MdiHeart className="size-[40px]" />
          </motion.div>

          {/* Header */}
          <motion.div className="flex flex-col items-center mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
              <EnvelopeIcon />
            </motion.div>
            <h2 className="font-['Kaushan_Script',sans-serif] text-[28px] text-white mt-3 text-center drop-shadow-lg">Reply to Letter</h2>
            <p className="font-['Inter',sans-serif] font-light text-[14px] text-white/90 mt-2 text-center">
              Send your response to <span className="font-medium">{originalFrom}</span>
            </p>
          </motion.div>

          {/* Original Message Preview */}
          <motion.div className="bg-white/20 backdrop-blur-sm rounded-[12px] p-4 mb-6 border border-white/30" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <p className="font-['Inter',sans-serif] font-medium text-[12px] text-white/70 mb-2">Original message:</p>
            <p className="font-['Inter',sans-serif] font-light text-[14px] text-white italic line-clamp-3">“{originalMessage}”</p>
          </motion.div>

          {/* Reply */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <p className="font-['Inter',sans-serif] font-medium text-[14px] text-white mb-2">Your reply</p>
            <motion.textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your reply..."
              rows={5}
              className="w-full bg-white/90 border-2 border-white rounded-[10px] px-4 py-3 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-white focus:bg-white transition-all resize-none"
              whileFocus={{ scale: 1.01 }}
            />
            {error && <p className="mt-2 text-sm text-white/90 bg-black/20 rounded-lg px-3 py-2">{error}</p>}
          </motion.div>

          {/* Send Button */}
          <motion.button
            onClick={handleSubmit}
            disabled={isSending}
            className="mt-6 w-full bg-white/95 hover:bg-white text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[16px] py-4 rounded-[12px] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {isSending ? 'Sending…' : 'Send Reply'}
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
