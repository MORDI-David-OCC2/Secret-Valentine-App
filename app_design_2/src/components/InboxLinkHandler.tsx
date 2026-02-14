import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useInboxLink } from '../hooks/useInboxLink';

/**
 * Composant pour gérer l'ouverture d'un lien inbox
 * Affiche loading / erreur / redirige vers PIN si nécessaire
 */

interface InboxLinkHandlerProps {
  token: string;
  onSuccess: (inboxId: string, needsPin: boolean, sessionToken: string | null, pinMustBeCreated: boolean, needsEmailAssociation: boolean) => void;
  onError: () => void;
  language: 'en' | 'fr';
}

export default function InboxLinkHandler({
  token,
  onSuccess,
  onError,
  language
}: InboxLinkHandlerProps) {
  const { loading, error, needsPin, inboxId, sessionToken, pinMustBeCreated } = useInboxLink(token);

  useEffect(() => {
    if (inboxId) {
      onSuccess(inboxId, needsPin, sessionToken, pinMustBeCreated);
    }
  }, [inboxId, needsPin, sessionToken, pinMustBeCreated]);

  useEffect(() => {
    if (error) {
      onError();
    }
  }, [error]);

  const translations = {
    en: {
      loading: 'Opening your inbox...',
      error: 'Invalid or expired link',
      tryAgain: 'Return to home'
    },
    fr: {
      loading: 'Ouverture de votre boîte...',
      error: 'Lien invalide ou expiré',
      tryAgain: 'Retour à l\'accueil'
    }
  };

  const t = translations[language];

  if (error) {
    return (
      <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-6">💔</div>
          <h1 className="font-['Kaushan_Script',sans-serif] text-[32px] text-[#a31e46] mb-4">
            {t.error}
          </h1>
          <p className="font-['Inter',sans-serif] text-[16px] text-[#2d1b1b] mb-8">
            {error}
          </p>
          <motion.button
            onClick={onError}
            className="bg-[#a31e46] text-white px-8 py-3 rounded-full font-['Inter',sans-serif] font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t.tryAgain}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(246,193,208,0.71)] min-h-screen w-full flex flex-col items-center justify-center">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="text-8xl mb-8"
      >
        💌
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-['Inter',sans-serif] text-[20px] text-[#2d1b1b]"
      >
        {t.loading}
      </motion.p>
      <motion.div
        className="flex gap-2 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-[#a31e46] rounded-full"
            animate={{
              y: [0, -10, 0]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}