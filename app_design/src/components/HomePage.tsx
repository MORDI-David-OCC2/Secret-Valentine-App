import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import svgPaths from '../imports/svg-zn5hjk1775';

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

function LargeHeart() {
  return (
    <div className="size-[88px]" data-name="mdi:heart">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 88 88">
        <g id="mdi:heart">
          <path d={svgPaths.p20134ac0} fill="black" />
        </g>
      </svg>
    </div>
  );
}

function PenIcon() {
  return (
    <div className="size-[88px]" data-name="mdi:pen">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 88 88">
        <g id="mdi:pen">
          <path d={svgPaths.p2e9e3140} fill="black" />
        </g>
      </svg>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full">
      {/* Header */}
      <motion.div
        className="flex gap-[6px] items-center justify-center pt-[97px] pb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <MdiHeart />
        </motion.div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black">Secret Valentine</h1>
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.3 }}
        >
          <MdiHeart />
        </motion.div>
      </motion.div>

      {/* Divider */}
      <motion.div
        className="w-full h-[1px] bg-black"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Welcome Message */}
      <motion.div
        className="px-8 pt-8 pb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <p className="font-['Inter',sans-serif] font-light text-[24px] text-[#2d1b1b] text-center leading-relaxed">
          "Welcome to Secret Valentine. Reveal your heart, keep your mystery. Send a message to the one you love, without them knowing it's you... yet."
        </p>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-6 px-16">
        {/* Check Letters Button */}
        <motion.button
          onClick={() => navigate('/letters')}
          className="bg-[#db8c8f] rounded-[10px] w-full h-[172px] flex flex-col items-center justify-center gap-4 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          whileHover={{ scale: 1.05, backgroundColor: '#c77c7f', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}>
            <LargeHeart />
          </motion.div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#2d1b1b]">Check your received letter</p>
        </motion.button>

        {/* Write Message Button */}
        <motion.button
          onClick={() => navigate('/compose')}
          className="bg-[#db8c8f] rounded-[10px] w-full h-[172px] flex flex-col items-center justify-center gap-4 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          whileHover={{ scale: 1.05, backgroundColor: '#c77c7f', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            <PenIcon />
          </motion.div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#2d1b1b]">Write your message</p>
        </motion.button>
      </div>

      {/* Footer */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
      >
        <p className="font-['Inter',sans-serif] font-thin italic text-[15px] text-[#2d1b1b] text-center">made by D&F with</p>
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>
          <MdiHeart className="size-[24px]" />
        </motion.div>
      </motion.div>
    </div>
  );
}
