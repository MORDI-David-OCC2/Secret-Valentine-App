import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { setPin } from '../services/api';

/**
 * Écran de création obligatoire de PIN lors de la première connexion
 * Affiche un formulaire pour créer un code PIN à 4 chiffres
 */

interface FirstPinSetupProps {
  inboxId: string;
  sessionToken: string;
  onPinCreated: (pin: string) => void;
  onBack: () => void;
  language: 'en' | 'fr';
}

export default function FirstPinSetup({
  inboxId,
  sessionToken,
  onPinCreated,
  onBack,
  language
}: FirstPinSetupProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translations = {
    en: {
      title: 'Secure Your Inbox',
      subtitle: 'Create a PIN code to protect your love letters',
      description: 'Your inbox needs a 4-digit PIN code for security. This PIN will be required every time you access your messages.',
      enterNewPin: 'Enter new PIN (4 digits)',
      confirmNewPin: 'Confirm new PIN',
      createButton: 'Create PIN',
      creating: 'Creating...',
      pinMismatch: 'PINs do not match',
      pinInvalid: 'PIN must be 4 digits',
      pinCreated: 'PIN created successfully! 🔐',
      errorCreating: 'Error creating PIN',
      back: 'Back',
      securityNote: '🔒 Your PIN is encrypted and secure'
    },
    fr: {
      title: 'Sécurisez votre boîte',
      subtitle: 'Créez un code PIN pour protéger vos lettres d\'amour',
      description: 'Votre boîte nécessite un code PIN à 4 chiffres pour la sécurité. Ce PIN sera requis à chaque fois que vous accéderez à vos messages.',
      enterNewPin: 'Entrez le nouveau PIN (4 chiffres)',
      confirmNewPin: 'Confirmez le nouveau PIN',
      createButton: 'Créer le PIN',
      creating: 'Création...',
      pinMismatch: 'Les codes PIN ne correspondent pas',
      pinInvalid: 'Le PIN doit contenir 4 chiffres',
      pinCreated: 'PIN créé avec succès ! 🔐',
      errorCreating: 'Erreur lors de la création du PIN',
      back: 'Retour',
      securityNote: '🔒 Votre PIN est crypté et sécurisé'
    }
  };

  const t = translations[language];

  const handleCreatePin = async () => {
    // Validation
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error(t.pinInvalid);
      return;
    }
    if (newPin !== confirmPin) {
      toast.error(t.pinMismatch);
      return;
    }

    setIsSubmitting(true);

    try {
      // Appeler l'API pour créer le PIN
      await setPin(inboxId, newPin, sessionToken);
      toast.success(t.pinCreated);
      
      // Notifier le parent que le PIN a été créé
      onPinCreated(newPin);
    } catch (error: any) {
      console.error('Error creating PIN:', error);
      toast.error(error.message || t.errorCreating);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            scale: [1, 1.15, 1],
            rotate: [0, -5, 5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="text-7xl mb-6"
        >
          🔐
        </motion.div>
        
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black text-center mb-4">
          {t.title}
        </h1>
        
        <p className="font-['Inter',sans-serif] font-bold text-[18px] text-[#a31e46] text-center mb-3">
          {t.subtitle}
        </p>
        
        <p className="font-['Inter',sans-serif] font-light text-[15px] text-[#2d1b1b] text-center">
          {t.description}
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div 
        className="w-full h-[1px] bg-black mb-8"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Form */}
      <motion.div 
        className="mx-5 bg-[rgba(255,255,255,0.8)] rounded-[15px] p-7 space-y-6 shadow-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {/* New PIN Field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
            {t.enterNewPin}
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[18px] text-[#2d1b1b] text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
            placeholder="••••"
            disabled={isSubmitting}
          />
        </motion.div>

        {/* Confirm PIN Field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
            {t.confirmNewPin}
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[18px] text-[#2d1b1b] text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
            placeholder="••••"
            disabled={isSubmitting}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreatePin();
              }
            }}
          />
        </motion.div>

        {/* Security Note */}
        <motion.div
          className="bg-[rgba(163,30,70,0.1)] border-2 border-[#db8c8f] rounded-[10px] p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <p className="font-['Inter',sans-serif] font-light text-[13px] text-[#2d1b1b] text-center">
            {t.securityNote}
          </p>
        </motion.div>

        {/* Create Button */}
        <motion.button
          onClick={handleCreatePin}
          disabled={isSubmitting || newPin.length !== 4 || confirmPin.length !== 4}
          className="w-full bg-[#a31e46] hover:bg-[#8b1838] text-white font-['Inter',sans-serif] font-bold text-[18px] rounded-[10px] h-[54px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          whileHover={!isSubmitting ? { scale: 1.03, boxShadow: '0 10px 25px rgba(163,30,70,0.4)' } : {}}
          whileTap={!isSubmitting ? { scale: 0.97 } : {}}
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
              {t.creating}
            </motion.div>
          ) : (
            t.createButton
          )}
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.div 
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <p className="font-['Inter',sans-serif] font-thin italic text-[15px] text-[#2d1b1b] text-center">
          made by D&F with
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
