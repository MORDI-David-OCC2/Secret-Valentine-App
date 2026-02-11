import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { claimPending } from '../services/api';

/**
 * Page pour réclamer/ouvrir sa boîte via email
 * Envoie un lien d'accès par email
 */

interface ClaimInboxPageProps {
  onBack: () => void;
  language: 'en' | 'fr';
}

export default function ClaimInboxPage({ onBack, language }: ClaimInboxPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const translations = {
    en: {
      back: 'Back',
      title: 'Access Your Inbox',
      subtitle: 'Enter your email to receive your inbox link',
      emailLabel: 'Email:',
      emailPlaceholder: 'your.email@example.com',
      sendButton: 'Send Link',
      sending: 'Sending...',
      successTitle: 'Email Sent! 📧',
      successMessage: 'Check your inbox for the access link',
      footer: 'made by D&F with',
      invalidEmail: 'Please enter a valid email address'
    },
    fr: {
      back: 'Retour',
      title: 'Accéder à votre boîte',
      subtitle: 'Entrez votre email pour recevoir votre lien d\'accès',
      emailLabel: 'Email :',
      emailPlaceholder: 'votre.email@exemple.com',
      sendButton: 'Envoyer le Lien',
      sending: 'Envoi...',
      successTitle: 'Email Envoyé ! 📧',
      successMessage: 'Vérifiez votre boîte mail pour le lien d\'accès',
      footer: 'créé par D&F avec',
      invalidEmail: 'Veuillez entrer une adresse email valide'
    }
  };

  const t = translations[language];

  const validateEmail = (email: string) => {
    return email.includes('@') && email.includes('.');
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }

    setIsSubmitting(true);

    try {
      await claimPending(email);
      setEmailSent(true);
      toast.success(t.successTitle);
    } catch (error: any) {
      if (error.message.includes('429')) {
        toast.error('Trop de tentatives. Réessayez dans quelques minutes.');
      } else {
        toast.error(error.message || 'Erreur lors de l\'envoi');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
              y: [0, -10, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="text-8xl mb-6"
          >
            💌
          </motion.div>
          
          <h1 className="font-['Kaushan_Script',sans-serif] text-[40px] text-[#a31e46] mb-4">
            {t.successTitle}
          </h1>
          
          <p className="font-['Inter',sans-serif] text-[18px] text-[#2d1b1b] mb-8">
            {t.successMessage}
          </p>

          <motion.button
            onClick={onBack}
            className="bg-[#a31e46] text-white px-8 py-3 rounded-full font-['Inter',sans-serif] font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t.back}
          </motion.button>
        </motion.div>
      </div>
    );
  }

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
        className="flex flex-col items-center justify-center pt-[120px] pb-6 px-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="text-7xl mb-6"
        >
          📬
        </motion.div>
        
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black text-center mb-4">
          {t.title}
        </h1>
        
        <p className="font-['Inter',sans-serif] font-extralight text-[20px] text-[#2d1b1b] text-center">
          {t.subtitle}
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div 
        className="w-full h-[1px] bg-black mb-12"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Form */}
      <motion.div 
        className="mx-5 bg-[rgba(255,255,255,0.7)] rounded-[10px] p-7 space-y-6 shadow-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {/* Email Field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
            <span className="font-bold">{t.emailLabel}</span>
          </p>
          <motion.input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
            whileFocus={{ scale: 1.02 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
          />
        </motion.div>

        {/* Send Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-[#a31e46] hover:bg-[#8b1838] text-white font-['Inter',sans-serif] font-bold text-[18px] rounded-[10px] h-[50px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          whileHover={!isSubmitting ? { scale: 1.05, boxShadow: '0 10px 25px rgba(163,30,70,0.4)' } : {}}
          whileTap={!isSubmitting ? { scale: 0.95 } : {}}
        >
          {isSubmitting ? (
            <motion.div
              className="flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="size-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {t.sending}
            </motion.div>
          ) : (
            t.sendButton
          )}
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.div 
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
      >
        <p className="font-['Inter',sans-serif] font-thin italic text-[15px] text-[#2d1b1b] text-center">
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
          className="text-[20px]"
        >
          ❤️
        </motion.div>
      </motion.div>
    </div>
  );
}
