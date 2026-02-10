import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import svgPaths from '../imports/svg-01d0jglvrw';
import { getInboxId, getSessionToken, isPinRequired } from '../api/storage';
import { getMessageById, listInbox, sendReply, verifyPin } from '../api/netlify';
import type { MessagePreview, GetMessageResponse, Reply, MessageDetail } from '../types';
import { formatWhen, mapTypeToUi, typeLabel } from '../utils/format';
import LetterDetailView from './LetterDetailView';

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

function getThemeColor(type: string): string {
  switch (type) {
    case 'love':
      return 'bg-gradient-to-br from-pink-500 via-pink-400 to-rose-400 border-2 border-amber-400';
    case 'friend':
      return 'bg-gradient-to-br from-yellow-300 via-lime-300 to-green-300 border-2 border-lime-400';
    case 'crush':
      return 'bg-gradient-to-br from-pink-300 via-violet-300 to-white border-2 border-violet-300';
    case 'family':
      return 'bg-gradient-to-br from-amber-400 via-amber-300 to-rose-400 border-2 border-amber-500';
    default:
      return 'bg-gradient-to-br from-pink-500 to-rose-400';
  }
}

function getTextColor(type: string): string {
  switch (type) {
    case 'friend':
    case 'crush':
      return 'text-black';
    default:
      return 'text-white';
  }
}

type UiLetter = {
  id: string;
  from: string;
  type: 'love' | 'friend' | 'family' | 'crush';
  date: string;
  unread?: boolean;
};

function toUiLetter(m: MessagePreview): UiLetter {
  const uiType = mapTypeToUi(m.type);
  const ts = m.lastActiveAt || m.createdAt || m.lastActiveAtMs || m.createdAtMs;
  return {
    id: m.id,
    from: m.fromName || 'Anonymous',
    type: uiType,
    date: formatWhen(ts),
    unread: !!m.unread,
  };
}

function LetterCard({ letter, index, onClick }: { letter: UiLetter; index: number; onClick: () => void }) {
  const color = getThemeColor(letter.type);
  const textColor = getTextColor(letter.type);

  return (
    <motion.div
      onClick={onClick}
      className={`${color} rounded-[15px] w-[284px] h-[172px] relative mx-auto cursor-pointer shadow-lg overflow-hidden`}
      initial={{ opacity: 0, y: 30, rotate: -5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.05, rotate: 2, boxShadow: '0 15px 30px rgba(0,0,0,0.3)' }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div className="absolute inset-2 border-2 border-white/40 rounded-[12px] pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.15 + 0.2 }} />

      {/* Envelope flap */}
      <motion.svg
        className="absolute top-2 left-2 right-2 pointer-events-none"
        width="100%"
        height="60"
        viewBox="0 0 280 60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.15 + 0.3 }}
      >
        <line x1="0" y1="0" x2="140" y2="50" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
        <line x1="280" y1="0" x2="140" y2="50" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
        <line x1="0" y1="0" x2="280" y2="0" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
      </motion.svg>

      <motion.div
        className="absolute left-1/2 top-[45px] -translate-x-1/2"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: index * 0.15 + 0.4, type: 'spring', stiffness: 200 }}
      >
        <OvalLoveIcon />
      </motion.div>

      <motion.div
        className="absolute top-[100px] left-0 right-0 text-center space-y-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.15 + 0.5 }}
      >
        <p className={`font-['Inter',sans-serif] font-normal text-[13px] ${textColor} drop-shadow-md`}>From: {letter.from}</p>
        <p className={`font-['Inter',sans-serif] font-normal text-[13px] ${textColor} drop-shadow-md`}>Date: {letter.date}</p>
      </motion.div>

      <motion.div className="absolute bottom-3 right-4" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.15 + 0.6 }}>
        <p className={`font-['Inter',sans-serif] font-light italic text-[14px] ${textColor === 'text-white' ? 'text-white/80' : 'text-black/70'} capitalize`}>
          {letter.type}
        </p>
      </motion.div>

      {letter.unread && (
        <div className="absolute left-3 top-3 size-3 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.25)]" />
      )}

      <motion.div className="absolute top-2 right-2 bg-white/90 rounded-full px-3 py-1" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.15 + 0.6 }}>
        <p className="font-['Inter',sans-serif] font-medium text-[11px] text-[#2d1b1b]">Tap to open</p>
      </motion.div>
    </motion.div>
  );
}

function PinGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-5 bg-[rgba(255,255,255,0.7)] rounded-[12px] p-6 shadow-lg">
      <p className="font-['Kaushan_Script',sans-serif] text-[34px] text-center">🔒 Locked inbox</p>
      <p className="font-['Inter',sans-serif] text-center opacity-80 mt-2">Enter your PIN to unlock</p>

      <div className="mt-5 space-y-3">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          type="password"
          inputMode="numeric"
          className="w-full bg-white/90 border-2 border-white rounded-[10px] h-[52px] px-4 font-['Inter',sans-serif] text-[16px]"
          placeholder="PIN"
        />
        <button
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              setStatus('Unlocking…');
              await verifyPin(pin);
              setStatus(null);
              onUnlocked();
            } catch (e) {
              console.error(e);
              setStatus(e instanceof Error ? e.message : 'Invalid PIN');
            } finally {
              setBusy(false);
            }
          }}
          className="w-full bg-[#db8c8f] rounded-[10px] h-[52px] font-['Inter',sans-serif] font-medium shadow-lg"
        >
          Unlock
        </button>
        {status && <p className="font-['Inter',sans-serif] text-center text-[13px] text-[#b00020]">{status}</p>}
      </div>
    </div>
  );
}

export default function LettersPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [previews, setPreviews] = useState<MessagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<MessageDetail | null>(null);
  const [selectedReplies, setSelectedReplies] = useState<Reply[]>([]);
  const [detailColor, setDetailColor] = useState<string>('');

  const uiLetters = useMemo(() => previews.map(toUiLetter), [previews]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listInbox();
      setPreviews(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // If user has no inbox yet, they must come from the email link
    if (!getInboxId()) {
      setLoading(false);
      setError('No inbox connected yet. Open your email link first.');
      return;
    }

    // If backend requires PIN, the user will unlock using the gate.
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) {
      setSelectedDetail(null);
      setSelectedReplies([]);
      return;
    }

    (async () => {
      try {
        const data: GetMessageResponse = await getMessageById(id);
        if (!data.message) throw new Error('Message not found');

        const uiType = mapTypeToUi(data.message.type);
        setDetailColor(getThemeColor(uiType));
        setSelectedDetail(data.message);
        setSelectedReplies(data.replies || []);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : 'Failed to load message');
        navigate('/letters', { replace: true });
      }
    })();
  }, [id, navigate]);

  const locked = isPinRequired() && !getSessionToken();

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full pb-24">
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

      <motion.div className="flex gap-[6px] items-center justify-center pt-[93px] pb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}>
          <EnvelopeIcon />
        </motion.div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black">Your Love Letters</h1>
      </motion.div>

      <motion.div className="w-full h-[1px] bg-black" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />

      <div className="px-8 pt-6 pb-4">
        <p className="font-['Inter',sans-serif] font-extralight text-[20px] text-[#2d1b1b] text-center italic opacity-80">
          {uiLetters.length ? `You have ${uiLetters.length} secret messages waiting for you` : 'No messages yet'}
        </p>
      </div>

      {locked ? (
        <PinGate onUnlocked={refresh} />
      ) : loading ? (
        <p className="font-['Inter',sans-serif] text-center opacity-70 mt-10">Loading…</p>
      ) : error ? (
        <p className="font-['Inter',sans-serif] text-center text-[#b00020] mt-10 px-6">{error}</p>
      ) : (
        <div className="space-y-6 px-4">
          {uiLetters.map((letter, idx) => (
            <LetterCard key={letter.id} letter={letter} index={idx} onClick={() => navigate(`/letters/${encodeURIComponent(letter.id)}`)} />
          ))}
        </div>
      )}

      {selectedDetail && (
        <LetterDetailView
          color={detailColor}
          letter={{
            id: selectedDetail.id,
            from: selectedDetail.fromName || 'Anonymous',
            to: 'You',
            type: mapTypeToUi(selectedDetail.type),
            date: formatWhen(selectedDetail.createdAt),
            message: selectedDetail.body || '',
            isAnonymous: !(selectedDetail.fromName && selectedDetail.fromName !== 'Anonymous'),
          }}
          replies={selectedReplies}
          replyEnabled={!!selectedDetail.replyEnabled}
          onClose={() => navigate('/letters')}
          onSendReply={async (body) => {
            await sendReply(selectedDetail.id, body);
            // reload message + list preview
            await refresh();
            const data = await getMessageById(selectedDetail.id);
            setSelectedReplies(data.replies || []);
          }}
        />
      )}
    </div>
  );
}
