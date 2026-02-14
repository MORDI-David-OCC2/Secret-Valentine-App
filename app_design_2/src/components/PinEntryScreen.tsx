// src/components/PinEntryScreen.tsx
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { verifyPin } from "../services/api";
import { useSession } from "../contexts/SessionContext";

function LockIcon() {
  return (
    <div className="size-[80px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 80 80">
        <path
          d="M60 35h-5v-8.333C55 17.425 47.046 10 37.5 10S20 17.425 20 26.667V35h-5c-2.75 0-5 2.25-5 5v30c0 2.75 2.25 5 5 5h50c2.75 0 5-2.25 5-5V40c0-2.75-2.25-5-5-5zM26.667 26.667c0-5.917 4.916-10.834 10.833-10.834s10.833 4.917 10.833 10.834V35H26.667v-8.333zM40 57.5c-2.75 0-5-2.25-5-5s2.25-5 5-5 5 2.25 5 5-2.25 5-5 5z"
          fill="#DB8C8F"
        />
      </svg>
    </div>
  );
}

interface PinEntryScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  language: "en" | "fr";
}

export default function PinEntryScreen({ onSuccess, onBack, language }: PinEntryScreenProps) {
  const { inboxId, setSessionToken, setIsLocked, setIsPinRequired } = useSession();

  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translations = {
    en: { title: "Enter PIN", subtitle: "Enter your 4-digit PIN to access your letters", incorrectPin: "Incorrect PIN. Try again.", back: "Back" },
    fr: { title: "Entrez le PIN", subtitle: "Entrez votre code PIN à 4 chiffres pour accéder à vos lettres", incorrectPin: "PIN incorrect. Réessayez.", back: "Retour" },
  };
  const t = translations[language];

  const submitPin = async (value: string) => {
    if (!inboxId) {
      toast.error(language === "fr" ? "Boîte introuvable (inboxId)" : "Missing inboxId");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyPin(inboxId, value);
      if (!res?.sessionToken) throw new Error("No session token");

      setSessionToken(res.sessionToken);
      setIsPinRequired(true);
      setIsLocked(false);

      onSuccess();
    } catch (e: any) {
      setError(true);
      toast.error(e?.message || t.incorrectPin);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 900);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinChange = (value: string) => {
    const newPin = value.replace(/\D/g, "").slice(0, 4);
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) submitPin(newPin);
  };

  const handleNumberPad = (num: string) => {
    if (isSubmitting) return;
    if (pin.length < 4) handlePinChange(pin + num);
  };

  const handleDelete = () => {
    if (isSubmitting) return;
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full flex flex-col items-center justify-center px-5">
      <motion.button
        onClick={onBack}
        className="inline-flex items-center gap-3 text-[24px] italic text-[color:var(--text-light)]
                   font-['Cormorant_Garamond',serif] px-3 py-2 rounded-[14px] bg-white/35 backdrop-blur
                   border border-white/50 shadow-[0_10px_30px_rgba(180,90,130,.10)] hover:bg-white/45
                   active:scale-[0.99] transition"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -3 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-[30px] leading-none">←</span>
        <span className="leading-none">{t.back}</span>
      </motion.button>

      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
        <LockIcon />
      </motion.div>

      <motion.h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black mt-6 mb-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {t.title}
      </motion.h1>

      <motion.p className="font-['Inter',sans-serif] font-light text-[16px] text-[#2d1b1b] text-center mb-12 max-w-[280px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {t.subtitle}
      </motion.p>

      <motion.div className="flex gap-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className={`size-[60px] rounded-[15px] border-3 flex items-center justify-center font-['Inter',sans-serif] font-bold text-[32px] ${
              error
                ? "bg-red-100 border-red-400 text-red-600"
                : pin.length > index
                ? "bg-[#a31e46] border-[#a31e46] text-white"
                : "bg-white/80 border-[#db8c8f] text-transparent"
            }`}
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {pin[index] ? "•" : ""}
          </motion.div>
        ))}
      </motion.div>

      {isSubmitting && (
        <motion.p className="font-['Inter',sans-serif] text-[14px] text-[#2d1b1b] mb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {language === "fr" ? "Vérification..." : "Checking..."}
        </motion.p>
      )}

      <motion.div className="grid grid-cols-3 gap-4 w-full max-w-[280px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        {["1","2","3","4","5","6","7","8","9"].map((num) => (
          <motion.button
            key={num}
            onClick={() => handleNumberPad(num)}
            className="bg-white/90 rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[28px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={error || isSubmitting}
          >
            {num}
          </motion.button>
        ))}

        <div />

        <motion.button
          onClick={() => handleNumberPad("0")}
          className="bg-white/90 rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[28px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={error || isSubmitting}
        >
          0
        </motion.button>

        <motion.button
          onClick={handleDelete}
          className="bg-[rgba(219,140,143,0.5)] rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[20px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={error || isSubmitting}
        >
          ⌫
        </motion.button>
      </motion.div>
    </div>
  );
}