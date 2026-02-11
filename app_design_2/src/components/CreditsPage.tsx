import { motion } from 'motion/react';

interface CreditsPageProps {
  onBack: () => void;
  language: 'en' | 'fr';
}

export default function CreditsPage({ onBack, language }: CreditsPageProps) {
  const translations = {
    en: {
      back: 'Back',
      title: 'Credits',
      subtitle: 'The team behind Secret Valentine',
      dRole: 'Lead Designer & Creative Director',
      dDescription: 'Designed the beautiful user interface, crafted the romantic pink aesthetic, and brought the vision to life with elegant animations and delightful interactions.',
      fRole: 'Lead Developer & Technical Architect',
      fDescription: 'Implemented the entire application architecture, developed all features including PIN security, multi-language support, and seamless page transitions.',
      madeWith: 'Made with',
      and: 'and',
      technologies: 'Technologies Used:',
      react: 'React - UI Framework',
      tailwind: 'Tailwind CSS - Styling',
      motion: 'Motion - Animations',
      typescript: 'TypeScript - Type Safety',
      footer: 'Thank you for using Secret Valentine! 💕'
    },
    fr: {
      back: 'Retour',
      title: 'Crédits',
      subtitle: 'L\'équipe derrière Valentin Secret',
      dRole: 'Designer Principal & Directeur Créatif',
      dDescription: 'A conçu la belle interface utilisateur, créé l\'esthétique rose romantique et donné vie à la vision avec des animations élégantes et des interactions délicieuses.',
      fRole: 'Développeur Principal & Architecte Technique',
      fDescription: 'A mis en œuvre toute l\'architecture de l\'application, développé toutes les fonctionnalités, y compris la sécurité PIN, le support multilingue et les transitions de page fluides.',
      madeWith: 'Créé avec',
      and: 'et',
      technologies: 'Technologies Utilisées :',
      react: 'React - Framework UI',
      tailwind: 'Tailwind CSS - Stylisation',
      motion: 'Motion - Animations',
      typescript: 'TypeScript - Sécurité des Types',
      footer: 'Merci d\'utiliser Valentin Secret ! 💕'
    }
  };

  const t = translations[language];

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full pb-24">
      {/* Back Button */}
      <motion.button
        onClick={onBack}
        className="absolute top-10 left-5 font-['Inter',sans-serif] font-medium text-[25px] text-[#2d1b1b] z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ x: -5, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ← {t.back}
      </motion.button>

      {/* Header */}
      <motion.div 
        className="flex gap-[6px] items-center justify-center pt-[93px] pb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
        >
          <span className="text-[42px]">🎨</span>
        </motion.div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black">{t.title}</h1>
        <motion.div
          animate={{ 
            rotate: [0, -10, 10, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            delay: 0.5
          }}
        >
          <span className="text-[42px]">💻</span>
        </motion.div>
      </motion.div>

      {/* Divider */}
      <motion.div 
        className="w-full h-[1px] bg-black"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Subtitle */}
      <motion.div 
        className="px-8 pt-6 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <p className="font-['Inter',sans-serif] font-light text-[20px] text-[#2d1b1b] text-center">
          {t.subtitle}
        </p>
      </motion.div>

      {/* Team Cards */}
      <div className="mx-5 space-y-6">
        {/* F Card */}
        <motion.div
          className="bg-white/80 rounded-[15px] p-6 shadow-lg"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <span className="text-[48px]">🎨</span>
            </motion.div>
            <div>
              <h2 className="font-['Kaushan_Script',sans-serif] text-[28px] text-[#a31e46]">D</h2>
              <p className="font-['Inter',sans-serif] font-bold text-[14px] text-[#2d1b1b]">{t.dRole}</p>
            </div>
          </div>
          <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#2d1b1b] leading-relaxed">
            {t.dDescription}
          </p>
        </motion.div>

        {/* D Card */}
        <motion.div
          className="bg-white/80 rounded-[15px] p-6 shadow-lg"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.5 }}
            >
              <span className="text-[48px]">💻</span>
            </motion.div>
            <div>
              <h2 className="font-['Kaushan_Script',sans-serif] text-[28px] text-[#a31e46]">F</h2>
              <p className="font-['Inter',sans-serif] font-bold text-[14px] text-[#2d1b1b]">{t.fRole}</p>
            </div>
          </div>
          <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#2d1b1b] leading-relaxed">
            {t.fDescription}
          </p>
        </motion.div>

        {/* Technologies Card */}
        <motion.div
          className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-[15px] p-6 shadow-lg border-2 border-pink-300"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          <h3 className="font-['Inter',sans-serif] font-bold text-[16px] text-[#a31e46] mb-4">{t.technologies}</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">⚛️</span>
              <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#2d1b1b]">{t.react}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[20px]">🎨</span>
              <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#2d1b1b]">{t.tailwind}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[20px]">✨</span>
              <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#2d1b1b]">{t.motion}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[20px]">📘</span>
              <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#2d1b1b]">{t.typescript}</p>
            </div>
          </div>
        </motion.div>

        {/* Made With Love */}
        <motion.div
          className="flex items-center justify-center gap-2 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
        >
          <p className="font-['Inter',sans-serif] font-light text-[16px] text-[#2d1b1b]">
            {t.madeWith}
          </p>
          <motion.span
            className="text-[24px]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
          >
            ❤️
          </motion.span>
          <p className="font-['Inter',sans-serif] font-light text-[16px] text-[#2d1b1b]">
            {t.and}
          </p>
          <motion.span
            className="text-[24px]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2, delay: 0.3 }}
          >
            ☕
          </motion.span>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div 
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        <p className="font-['Inter',sans-serif] font-thin italic text-[15px] text-[#2d1b1b] text-center">
          {t.footer}
        </p>
      </motion.div>
    </div>
  );
}
