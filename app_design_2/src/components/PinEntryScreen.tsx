import { useState } from 'react';
import { motion } from 'motion/react';
import svgPaths from "../imports/svg-01d0jglvrw";

function LockIcon() {
  return (
    <div className="size-[80px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 80 80">
        <path d="M60 35h-5v-8.333C55 17.425 47.046 10 37.5 10S20 17.425 20 26.667V35h-5c-2.75 0-5 2.25-5 5v30c0 2.75 2.25 5 5 5h50c2.75 0 5-2.25 5-5V40c0-2.75-2.25-5-5-5zM26.667 26.667c0-5.917 4.916-10.834 10.833-10.834s10.833 4.917 10.833 10.834V35H26.667v-8.333zM40 57.5c-2.75 0-5-2.25-5-5s2.25-5 5-5 5 2.25 5 5-2.25 5-5 5z" fill="#DB8C8F"/>
      </svg>
    </div>
  );
}

interface PinEntryScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  correctPin: string;
  language: 'en' | 'fr';
}

export default function PinEntryScreen({ onSuccess, onBack, correctPin, language }: PinEntryScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const translations = {
    en: {
      title: 'Enter PIN',
      subtitle: 'Enter your 4-digit PIN to access your letters',
      incorrectPin: 'Incorrect PIN. Try again.',
      back: 'Back'
    },
    fr: {
      title: 'Entrez le PIN',
      subtitle: 'Entrez votre code PIN à 4 chiffres pour accéder à vos lettres',
      incorrectPin: 'PIN incorrect. Réessayez.',
      back: 'Retour'
    }
  };

  const t = translations[language];

  const handlePinChange = (value: string) => {
    const newPin = value.replace(/\D/g, '').slice(0, 4);
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === correctPin) {
        // Success animation
        setTimeout(() => {
          onSuccess();
        }, 300);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 1000);
      }
    }
  };

  const handleNumberPad = (num: string) => {
    if (pin.length < 4) {
      handlePinChange(pin + num);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full flex flex-col items-center justify-center px-5">
      {/* Back Button */}
      <motion.button
  onClick={onBack}
  className="
    inline-flex items-center gap-3
    text-[24px] italic
    text-[color:var(--text-light)]
    font-['Cormorant_Garamond',serif]
    px-3 py-2
    rounded-[14px]
    bg-white/35 backdrop-blur
    border border-white/50
    shadow-[0_10px_30px_rgba(180,90,130,.10)]
    hover:bg-white/45
    active:scale-[0.99]
    transition
  "
  initial={{ opacity: 0, x: -12 }}
  animate={{ opacity: 1, x: 0 }}
  whileHover={{ x: -3 }}
  whileTap={{ scale: 0.98 }}
>
  <span className="text-[30px] leading-none">←</span>
  <span className="leading-none">{t.back}</span>
</motion.button>

      {/* Lock Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
      >
        <LockIcon />
      </motion.div>

      {/* Title */}
      <motion.h1
        className="font-['Kaushan_Script',sans-serif] text-[35px] text-black mt-6 mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {t.title}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="font-['Inter',sans-serif] font-light text-[16px] text-[#2d1b1b] text-center mb-12 max-w-[280px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {t.subtitle}
      </motion.p>

      {/* PIN Display */}
      <motion.div
        className="flex gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className={`size-[60px] rounded-[15px] border-3 flex items-center justify-center font-['Inter',sans-serif] font-bold text-[32px] ${
              error 
                ? 'bg-red-100 border-red-400 text-red-600' 
                : pin.length > index
                ? 'bg-[#a31e46] border-[#a31e46] text-white'
                : 'bg-white/80 border-[#db8c8f] text-transparent'
            }`}
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {pin[index] ? '•' : ''}
          </motion.div>
        ))}
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.p
          className="font-['Inter',sans-serif] font-medium text-[14px] text-red-600 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {t.incorrectPin}
        </motion.p>
      )}

      {/* Number Pad */}
      <motion.div
        className="grid grid-cols-3 gap-4 w-full max-w-[280px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <motion.button
            key={num}
            onClick={() => handleNumberPad(num)}
            className="bg-white/90 rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[28px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f]"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,1)' }}
            whileTap={{ scale: 0.95 }}
            disabled={error}
          >
            {num}
          </motion.button>
        ))}
        
        {/* Empty space */}
        <div></div>
        
        {/* Zero */}
        <motion.button
          onClick={() => handleNumberPad('0')}
          className="bg-white/90 rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[28px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f]"
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,1)' }}
          whileTap={{ scale: 0.95 }}
          disabled={error}
        >
          0
        </motion.button>
        
        {/* Delete */}
        <motion.button
          onClick={handleDelete}
          className="bg-[rgba(219,140,143,0.5)] rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[20px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f]"
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(219,140,143,0.7)' }}
          whileTap={{ scale: 0.95 }}
          disabled={error}
        >
          ⌫
        </motion.button>
      </motion.div>
    </div>
  );
}
