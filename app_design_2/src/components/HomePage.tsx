import { motion } from 'motion/react';
import { useSession } from '../contexts/SessionContext';

interface HomePageProps {
  onNavigate: (page: 'home' | 'letters' | 'compose' | 'settings' | 'credits' | 'claim') => void;
  language: 'en' | 'fr';
}

export default function HomePage({ onNavigate, language }: HomePageProps) {
  const {isAuthenticated} = useSession()

  const translations = {
    en: {
      title: 'Secret Valentine',
      welcome: '"Welcome to Secret Valentine. Reveal your heart and keep your mystery..."',
      writeMessage: 'Write your message',
      claimInbox: 'Access my inbox',
      footer: 'made by D&F with'
    },
    fr: {
      title: 'Valentin Secret',
      welcome: '"Bienvenue sur Secret Valentine. Révélez votre cœur et gardez votre mystère..."',
      writeMessage: 'Écrivez votre message',
      claimInbox: 'Accéder à ma boîte',
      footer: 'créé par D&F avec'
    }
  };

  const t = translations[language];

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full">
      {/* Settings Button */}
      <motion.button
        onClick={() => onNavigate('settings')}
        className="absolute top-10 right-5 size-[40px] rounded-full bg-white/80 flex items-center justify-center shadow-md z-10"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,1)' }}
        whileTap={{ scale: 0.9 }}
      >
        <span className="text-xl md:text-2xl">⚙️</span>
      </motion.button>

      {/* Header */}
      <motion.div 
        className="flex gap-[6px] items-center justify-center pt-[97px] pb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
        >
          <span className="text-[24px]">💕</span>
        </motion.div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black">{t.title}</h1>
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, -5, 5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            delay: 0.3
          }}
        >
          <span className="text-[24px]">💕</span>
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
        className="px-6 md:px-8 pt-6 md:pt-8 pb-8 md:pb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <p className="font-['Inter',sans-serif] font-light text-[24px] text-[#2d1b1b] text-center leading-relaxed">
          {t.welcome}
        </p>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-6 px-16flex flex-col items-center gap-4 md:gap-6 px-6 md:px-16 max-w-2xl mx-auto">
        {/* Write Message Button */}
        <motion.button
          onClick={() => onNavigate('compose')}
          className="bg-[#db8c8f] rounded-[10px] w-full min-h-[140px] flex flex-col items-center justify-center gap-4 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          whileHover={{ 
            scale: 1.05,
            backgroundColor: '#c77c7f',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 2
            }}
          >
            <span className="text-[88px] leading-none">✍️</span>
          </motion.div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#2d1b1b]">{t.writeMessage}</p>
        </motion.button>

        {/* Claim Inbox Button */}
        <motion.button
          onClick={() => onNavigate(isAuthenticated ? 'letters' : 'claim')}
          className="bg-[#db8c8f] rounded-[10px] w-full min-h-[140px] flex flex-col items-center justify-center gap-4 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          whileHover={{ 
            scale: 1.05,
            backgroundColor: '#c77c7f',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
          >
            <span className="text-[88px] leading-none">💌</span>
          </motion.div>
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#2d1b1b]">{t.claimInbox}</p>
        </motion.button>
      </div>

      {/* Footer - Clickable */}
      <motion.button
        onClick={() => onNavigate('credits')}
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-1 cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <p className="font-['Inter',sans-serif] font-thin italic text-[15px] text-[#2d1b1b] text-center underline decoration-dotted">
          {t.footer}
        </p>
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            duration: 1,
            repeat: Infinity,
            repeatDelay: 2
          }}
        >
          <span className="text-[24px]">❤️</span>
        </motion.div>
      </motion.button>
    </div>
  );
}