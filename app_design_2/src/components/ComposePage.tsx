import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import svgPaths from "../imports/svg-kcw2rymt7y";
import type { Letter } from "../App";
import { sendMessage } from '../services/api';
import FlowerIcon from "./Fleurs";


function MdiHeart({ className }: { className?: string }) {
  return (
    <div className={className || "relative shrink-0 size-[24px]"} data-name="mdi:heart">
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

function UserFriendsIcon() {
  return (
    <div className="h-[27px] w-[34px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 34 27">
        <path d={svgPaths.p1e4e6380} fill="white" />
      </svg>
    </div>
  );
}

function FamilyIcon() {
  return (
    <div className="size-[39px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 39 39">
        <path d={svgPaths.p2d760800} fill="white" />
      </svg>
    </div>
  );
}

function EcgHeartIcon() {
  return (
    <div className="size-[34px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 34 34">
        <path d={svgPaths.p6a77e80} fill="white" />
      </svg>
    </div>
  );
}

function HeartFilledIcon() {
  return (
    <div className="size-[35px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 35 35">
        <path d={svgPaths.p26b0be00} fill="white" />
      </svg>
    </div>
  );
}

interface ComposePageProps {
  onBack: () => void;
  language: 'en' | 'fr';
}

export default function ComposePage({ onBack, language }: ComposePageProps) {
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedType, setSelectedType] = useState<'love' | 'friend' | 'family' | 'crush' | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // États pour API backend
  const [toEmail, setToEmail] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyAllowed, setReplyAllowed] = useState(false);

  const translations = {
    en: {
      back: 'Back',
      title: 'Compose your letter',
      subtitle: 'Write a heartful message to someone special',
      to: 'To:',
      toPlaceholder: 'Write the name of the person',
      toInput: 'Olivia...',
      from: 'From:',
      fromPlaceholder: 'Reveal your identity or not',
      fromInput: 'Your name...',
      anonymous: 'Send anonymously',
      type: 'Type:',
      typePlaceholder: '(love, friend, family, crush)',
      love: 'Love',
      friend: 'Friend',
      family: 'Family',
      crush: 'Crush',
      rose: 'Rose',
      roseJaune: 'Rose Jaune',
      lys: 'Lys',
      roseBlanche: 'Rose Blanche',
      message: 'Message:',
      messageOptional: '(optional)',
      messagePlaceholder: 'Write your heartfelt message here...',
      sendLetter: 'Send Letter',
      sending: 'Sending...',
      fillRequired: 'Please fill in the recipient name and select a type!',
      footer: 'made by D&F with'
    },
    fr: {
      back: 'Retour',
      title: 'Composez votre lettre',
      subtitle: 'Écrivez un message sincère à quelqu\'un de spécial',
      to: 'À :',
      toPlaceholder: 'Écrivez le nom de la personne',
      toInput: 'Olivia...',
      from: 'De :',
      fromPlaceholder: 'Révélez votre identité ou non',
      fromInput: 'Votre nom...',
      anonymous: 'Envoyer anonymement',
      type: 'Type :',
      typePlaceholder: '(amour, ami, famille, béguin)',
      love: 'Amour',
      friend: 'Ami',
      family: 'Famille',
      crush: 'Béguin',
      rose: 'Rose',
      roseJaune: 'Rose Jaune',
      lys: 'Lys',
      roseBlanche: 'Rose Blanche',
      message: 'Message :',
      messageOptional: '(optionnel)',
      messagePlaceholder: 'Écrivez votre message sincère ici...',
      sendLetter: 'Envoyer la Lettre',
      sending: 'Envoi...',
      fillRequired: 'Veuillez remplir le nom du destinataire et sélectionner un type !',
      footer: 'créé par D&F avec'
    }
  };

  const t = translations[language];

  const handleSubmit = async () => {
  // Validation
  if (!toEmail || !toEmail.includes('@')) {
    toast.error(language === 'en' ? 'Invalid email address' : 'Email invalide');
    return;
  }
  
  if (!message || message.length > 2000) {
    toast.error(language === 'en' ? 'Message required (max 2000 chars)' : 'Message requis (max 2000 caractères)');
    return;
  }
  
  if (!selectedType) {
    toast.error(language === 'en' ? 'Please select a type' : 'Veuillez sélectionner un type');
    return;
  }

  if (replyAllowed && !fromEmail) {
    toast.error(language === 'en' ? 'Email required to allow replies' : 'Email requis pour autoriser les réponses');
    return;
  }

  setIsSending(true);

  try {
    // Mapper friend → friendship
    const typeMapping = {
      'love': 'love' as const,
      'friend': 'friendship' as const,
      'family': 'family' as const,
      'crush': 'crush' as const
    };

    const response = await sendMessage({
      toEmail: toEmail.trim().toLowerCase(),
      fromName: isAnonymous ? 'Secret Admirer' : (from || 'Anonymous'),
      fromEmail: replyAllowed ? fromEmail.trim().toLowerCase() : undefined,
      replyAllowed,
      type: typeMapping[selectedType],
      body: message.trim()
    });

    // Gérer succès
    if (response.quarantined) {
      toast.warning(
        language === 'en' 
          ? 'Message sent but pending moderation' 
          : 'Message envoyé mais en attente de modération'
      );
    } else if (response.emailed) {
      toast.success(
        language === 'en' 
          ? 'Message sent! 💌 They will receive an email.' 
          : 'Message envoyé! 💌 Ils recevront un email.'
      );
    }

    // Retour à l'accueil
    setTimeout(() => {
      onBack();
    }, 1500);

  } catch (error: any) {
    // Gérer erreurs
    if (error.message.includes('429')) {
      toast.error(
        language === 'en' 
          ? 'Too many messages. Please wait a moment.' 
          : 'Trop de messages. Attendez un moment.'
      );
    } else if (error.message.includes('block')) {
      toast.error(
        language === 'en' 
          ? 'Message blocked by moderation' 
          : 'Message bloqué par la modération'
      );
    } else {
      toast.error(error.message || (language === 'en' ? 'Failed to send' : 'Échec d\'envoi'));
    }
  } finally {
    setIsSending(false);
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
        className="flex gap-[6px] items-center justify-center pt-[93px] pb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ 
            y: [0, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 2
          }}
        >
          <EnvelopeIcon />
        </motion.div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black">{t.title}</h1>
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
        <p className="font-['Inter',sans-serif] font-extralight text-[24px] text-[#2d1b1b] text-center">
          {t.subtitle}
        </p>
      </motion.div>

      {/* Form */}
      <motion.div 
        className="mx-5 bg-[rgba(255,255,255,0.7)] rounded-[10px] p-7 space-y-6 shadow-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        {/* To Field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
            <span className="font-bold">{t.to}</span>{' '}
            <span className="font-normal text-[#4a4a4a]">{t.toPlaceholder}</span>
          </p>
          <motion.input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t.toInput}
            className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
            whileFocus={{ scale: 1.02 }}
          />
        </motion.div>

      {/* Email destinataire */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.95 }}
      >
        <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
          <span className="font-bold">Email:</span>{' '}
          <span className="font-normal text-[#4a4a4a]">Recipient's email</span>
        </p>
        <motion.input
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          placeholder="olivia@example.com"
          className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
          whileFocus={{ scale: 1.02 }}
        />
      </motion.div>

        {/* From Field */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
            <span className="font-bold">{t.from}</span>{' '}
            <span className="font-normal text-[#4a4a4a]">{t.fromPlaceholder}</span>
          </p>
          <motion.input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={t.fromInput}
            disabled={isAnonymous}
            className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent disabled:opacity-50 transition-all"
            whileFocus={{ scale: 1.02 }}
          />
        </motion.div>

        {/* Anonymous Checkbox */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <motion.button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className="size-[20px] border-2 border-[#2d1b1b] rounded-[3px] bg-white flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isAnonymous && (
              <motion.div 
                className="size-[12px] bg-[#a31e46] rounded-[1px]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              />
            )}
          </motion.button>
          <p className="font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b]">{t.anonymous}</p>
        </motion.div>

        {/* Allow Replies Checkbox */}
<motion.div 
  className="flex items-center gap-3"
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.5, delay: 1.15 }}
>
  <motion.button
    onClick={() => setReplyAllowed(!replyAllowed)}
    className="size-[20px] border-2 border-[#2d1b1b] rounded-[3px] bg-white flex items-center justify-center"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    {replyAllowed && (
      <motion.div 
        className="size-[12px] bg-[#a31e46] rounded-[1px]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500 }}
      />
    )}
  </motion.button>
  <p className="font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b]">
    {language === 'en' ? 'Allow replies' : 'Autoriser les réponses'}
  </p>
</motion.div>

        {/* Your Email (si reply allowed) */}
{replyAllowed && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.3 }}
  >
    <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
      <span className="font-bold">Your Email:</span>{' '}
      <span className="font-normal text-[#4a4a4a]">For replies</span>
    </p>
    <motion.input
      type="email"
      value={fromEmail}
      onChange={(e) => setFromEmail(e.target.value)}
      placeholder="your.email@example.com"
      className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent transition-all"
      whileFocus={{ scale: 1.02 }}
    />
  </motion.div>
)}

        {/* Type Selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-4">
            <span className="font-bold">{t.type}</span>{' '}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Love - Rose + Or */}
            <motion.button
              onClick={() => setSelectedType('love')}
              className={`bg-gradient-to-br from-pink-200 to-amber-100 border-2 border-pink-400 rounded-[10px] h-[83px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
                selectedType === 'love' ? 'ring-4 ring-pink-400 scale-105' : ''
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.3 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <FlowerIcon type="love" size="sm" />
              <p className="font-['Inter',sans-serif] font-bold text-[15px] text-pink-700">{t.love}</p>
            </motion.button>

            {/* Friend - Rose Jaune */}
            <motion.button
              onClick={() => setSelectedType('friend')}
              className={`bg-gradient-to-br from-yellow-100 via-lime-100 to-green-100 border-2 border-lime-400 rounded-[10px] h-[83px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
                selectedType === 'friend' ? 'ring-4 ring-lime-400 scale-105' : ''
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.4 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <FlowerIcon type="friend" size="sm" />
              <p className="font-['Inter',sans-serif] font-bold text-[15px] text-black">{t.friend}</p>
            </motion.button>

            {/* Family - Lys */}
            <motion.button
              onClick={() => setSelectedType('family')}
              className={`bg-gradient-to-br from-amber-300 to-rose-300 border-2 border-amber-400 rounded-[10px] h-[83px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
                selectedType === 'family' ? 'ring-4 ring-amber-400 scale-105' : ''
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.5 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <FlowerIcon type="family" size="sm" />
              <p className="font-['Inter',sans-serif] font-bold text-[15px] text-amber-800">{t.family}</p>
            </motion.button>

            {/* Crush - Rose Blanche */}
            <motion.button
              onClick={() => setSelectedType('crush')}
              className={`bg-gradient-to-br from-pink-200 via-violet-200 to-white border-2 border-violet-300 rounded-[10px] h-[83px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
                selectedType === 'crush' ? 'ring-4 ring-violet-300 scale-105' : ''
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.6 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <FlowerIcon type="crush" size="sm" />
              <p className="font-['Inter',sans-serif] font-bold text-[15px] text-violet-700">{t.crush}</p>
            </motion.button>
          </div>
        </motion.div>

        {/* Message Field */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.7 }}
        >
          <p className="font-['Inter',sans-serif] font-medium text-[15px] text-[#a31e46] mb-2">
            <span className="font-bold">{t.message}</span>{' '}
            <span className="font-normal text-[#4a4a4a]">{t.messageOptional}</span>
          </p>
          <motion.textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            rows={6}
            className="w-full bg-[rgba(219,140,143,0.25)] border-2 border-[#db8c8f] rounded-[10px] p-4 font-['Inter',sans-serif] font-normal text-[15px] text-[#2d1b1b] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#a31e46] focus:border-transparent resize-none transition-all"
            whileFocus={{ scale: 1.02 }}
          />
        </motion.div>

        {/* Send Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={isSending}
          className="w-full bg-[#a31e46] hover:bg-[#8b1838] text-white font-['Inter',sans-serif] font-bold text-[18px] rounded-[10px] h-[50px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.8 }}
          whileHover={!isSending ? { scale: 1.05, boxShadow: '0 10px 25px rgba(163,30,70,0.4)' } : {}}
          whileTap={!isSending ? { scale: 0.95 } : {}}
        >
          {isSending ? (
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
            t.sendLetter
          )}
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.div 
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2 }}
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
        >
          <MdiHeart className="size-[24px]" />
        </motion.div>
      </motion.div>
    </div>
  );
}