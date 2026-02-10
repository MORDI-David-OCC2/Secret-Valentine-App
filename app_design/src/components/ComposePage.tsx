import { useState, React } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import svgPaths from '../imports/svg-kcw2rymt7y';
import { sendMessage } from '../api/netlify';
import type { LetterType } from '../types';

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

function TypeButton({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`bg-white/40 border-2 rounded-[10px] h-[83px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
        active ? 'border-black/60 ring-2 ring-black/20 scale-[1.02]' : 'border-black/10'
      }`}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="text-3xl">{emoji}</span>
      <p className="font-['Inter',sans-serif] font-bold text-[15px] text-[#2d1b1b] capitalize">{label}</p>
    </motion.button>
  );
}

export default function ComposePage() {
  const navigate = useNavigate();

  const [toEmail, setToEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [sendAnon, setSendAnon] = useState(false);
  const [type, setType] = useState<LetterType>('love');
  const [body, setBody] = useState('');
  const [replyAllowed, setReplyAllowed] = useState(false);
  const [fromEmail, setFromEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit() {
    setStatus(null);

    if (!toEmail.trim() || !toEmail.includes('@')) {
      setStatus('Invalid recipient email.');
      return;
    }
    if (!body.trim()) {
      setStatus('Your message is empty.');
      return;
    }
    if (replyAllowed && (!fromEmail.trim() || !fromEmail.includes('@'))) {
      setStatus('Please provide an email to receive replies.');
      return;
    }

    setSending(true);
    try {
      await sendMessage({
        toEmail: toEmail.trim(),
        fromName: sendAnon ? 'Anonymous' : (fromName.trim() || 'An admirer'),
        type,
        stickerId: 'heart_01',
        body: body.trim(),
        replyAllowed,
        fromEmail: replyAllowed ? fromEmail.trim() : undefined,
      });

      setStatus('Sent ✅');
      setBody('');
    } catch (e) {
      console.error(e);
      setStatus(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full pb-24">
      {/* Back Button */}
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-10 left-5 font-['Inter',sans-serif] font-medium text-[25px] text-[#2d1b1b] z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ x: -5, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ← Back
      </motion.button>

      {/* Header */}
      <motion.div
        className="flex gap-[6px] items-center justify-center pt-[93px] pb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
        >
          <EnvelopeIcon />
        </motion.div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black">Compose your letter</h1>
      </motion.div>

      {/* Divider */}
      <motion.div className="w-full h-[1px] bg-black" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />

      {/* Subtitle */}
      <motion.div className="px-8 pt-6 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
        <p className="font-['Inter',sans-serif] font-extralight text-[24px] text-[#2d1b1b] text-center">Write a heartfelt message to someone special</p>
      </motion.div>

      {/* Form */}
      <motion.div
        className="mx-5 bg-[rgba(255,255,255,0.7)] rounded-[10px] p-7 space-y-6 shadow-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        {/* To Email */}
        <div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
            <span className="font-bold">To:</span> <span className="font-normal text-[#4a4a4a]">Recipient email</span>
          </p>
          <motion.input
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="olivia@example.com"
            className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
            whileFocus={{ scale: 1.02 }}
          />
        </div>

        {/* From Name */}
        <div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
            <span className="font-bold">From:</span> <span className="font-normal text-[#4a4a4a]">Your name (optional)</span>
          </p>
          <motion.input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Your name"
            disabled={sendAnon}
            className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent disabled:opacity-50 transition-all"
            whileFocus={{ scale: 1.02 }}
          />
        </div>

        {/* Anonymous */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={() => setSendAnon((v) => !v)}
            className="size-[20px] border-2 border-[#2d1b1b] rounded-[3px] bg-white flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {sendAnon && <div className="size-[12px] bg-[#a31e46] rounded-[1px]" />}
          </motion.button>
          <p className="font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b]">Send anonymously</p>
        </div>

        {/* Type */}
        <div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-4">
            <span className="font-bold">Type:</span> <span className="font-normal text-[#4a4a4a]">(love, friendship, family, crush)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <TypeButton label="love" emoji="🌹" active={type === 'love'} onClick={() => setType('love')} />
            <TypeButton label="friendship" emoji="🌻" active={type === 'friendship'} onClick={() => setType('friendship')} />
            <TypeButton label="family" emoji="🌺" active={type === 'family'} onClick={() => setType('family')} />
            <TypeButton label="crush" emoji="🌸" active={type === 'crush'} onClick={() => setType('crush')} />
          </div>
        </div>

        {/* Message */}
        <div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
            <span className="font-bold">Message:</span>
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your heartfelt message here..."
            rows={8}
            className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] px-4 py-3 font-['Inter',sans-serif] text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
          />
        </div>

        {/* Replies toggle */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              onClick={() => setReplyAllowed((v) => !v)}
              className="size-[20px] border-2 border-[#2d1b1b] rounded-[3px] bg-white flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {replyAllowed && <div className="size-[12px] bg-[#a31e46] rounded-[1px]" />}
            </motion.button>
            <p className="font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b]">Allow replies (optional)</p>
          </div>

          {replyAllowed && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <motion.input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="Your email (for replies)"
                className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
                whileFocus={{ scale: 1.02 }}
              />
              <p className="mt-2 text-[12px] opacity-70">Your email is only used to receive replies.</p>
            </motion.div>
          )}
        </div>

        {/* Status */}
        {status && <p className="text-center font-['Inter',sans-serif] text-[14px] text-[#2d1b1b] opacity-90">{status}</p>}

        {/* Send */}
        <motion.button
          onClick={onSubmit}
          disabled={sending}
          className="w-full bg-[#db8c8f] hover:bg-[#c77c7f] text-[#2d1b1b] font-['Inter',sans-serif] font-bold text-[18px] py-4 rounded-[12px] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {sending ? 'Sending…' : 'Send Letter'}
        </motion.button>
      </motion.div>

      <div className="mt-8 text-center opacity-45 font-['Kaushan_Script',sans-serif] text-[22px]">made by D&F with ♥</div>
    </div>
  );
}
