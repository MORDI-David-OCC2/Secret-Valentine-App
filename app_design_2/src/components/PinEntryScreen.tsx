// src/components/PinEntryScreen.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { useSession } from "../contexts/SessionContext";
import { verifyPin } from "../services/api";

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
  const { session, setSessionToken, setIsLocked, setIsPinRequired, setInboxId } = useSession();

  const [pin, setPin] = useState("");
  const [wrongPin, setWrongPin] = useState(false);
  const [busy, setBusy] = useState(false);

  const t = useMemo(
    () =>
      ({
        en: {
          title: "Enter PIN",
          subtitle: "Enter your 4-digit PIN to access your letters",
          incorrectPin: "Incorrect PIN. Try again.",
          missingInbox: "Missing inbox id. Open a link or login first.",
          back: "Back",
        },
        fr: {
          title: "Entrez le PIN",
          subtitle: "Entrez votre code PIN à 4 chiffres pour accéder à vos lettres",
          incorrectPin: "PIN incorrect. Réessayez.",
          missingInbox: "Inbox manquant. Ouvre un lien ou connecte-toi d’abord.",
          back: "Retour",
        },
      }[language]),
    [language]
  );

  const hasInbox = !!session.inboxId;

  // Affiche le message “missing inbox” mais ne bloque pas le clavier
  useEffect(() => {
    if (!hasInbox) {
      // pas de toast spam, juste une fois si tu veux :
      // toast.error(t.missingInbox);
    }
  }, [hasInbox, t.missingInbox]);

  const handlePinChange = (value: string) => {
    if (busy) return;
    const next = value.replace(/\D/g, "").slice(0, 4);
    setPin(next);
    setWrongPin(false);
  };

  const handleNumberPad = (num: string) => {
    if (busy) return;
    if (pin.length < 4) handlePinChange(pin + num);
  };

  const handleDelete = () => {
    if (busy) return;
    setPin(pin.slice(0, -1));
    setWrongPin(false);
  };

  const submitPin = async (pin4: string) => {
    if (!session.inboxId) {
      toast.error(t.missingInbox);
      return;
    }

    setBusy(true);
    try {
      const res = await verifyPin(session.inboxId, pin4);
      if (!res?.sessionToken) {
        throw new Error("No session token");
      }

      // ✅ update session context
      setInboxId(session.inboxId);
      setSessionToken(res.sessionToken);
      setIsPinRequired(true);
      setIsLocked(false);

      onSuccess();
    } catch (e: any) {
      const msg = String(e?.message || "");
      setWrongPin(true);

      // reset after a short delay (but keep keypad usable)
      setTimeout(() => {
        setPin("");
        setWrongPin(false);
      }, 650);

      if (msg.toLowerCase().includes("locked") || msg.includes("401")) {
        toast.error(language === "en" ? "Session expired, reopen the link." : "Session expirée, rouvre le lien.");
      }
    } finally {
      setBusy(false);
    }
  };

  // auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) submitPin(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

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
      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
        <LockIcon />
      </motion.div>

      {/* Title */}
      <motion.h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black mt-6 mb-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {t.title}
      </motion.h1>

      {/* Subtitle */}
      <motion.p className="font-['Inter',sans-serif] font-light text-[16px] text-[#2d1b1b] text-center mb-8 max-w-[280px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {t.subtitle}
      </motion.p>

      {/* Missing inbox message (non-bloquant) */}
      {!hasInbox && (
        <p className="font-['Inter',sans-serif] text-[13px] text-[#a31e46] mb-4 text-center">
          {t.missingInbox}
        </p>
      )}

      {/* PIN Display */}
      <motion.div className="flex gap-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className={`size-[60px] rounded-[15px] border-3 flex items-center justify-center font-['Inter',sans-serif] font-bold text-[32px] ${
              wrongPin ? "bg-red-100 border-red-400 text-red-600" : pin.length > index ? "bg-[#a31e46] border-[#a31e46] text-white" : "bg-white/80 border-[#db8c8f] text-transparent"
            }`}
            animate={wrongPin ? { x: [-8, 8, -8, 8, 0] } : {}}
            transition={{ duration: 0.35 }}
          >
            {pin[index] ? "•" : ""}
          </motion.div>
        ))}
      </motion.div>

      {/* Wrong PIN Message */}
      {wrongPin && (
        <motion.p className="font-['Inter',sans-serif] font-medium text-[14px] text-red-600 mb-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          {t.incorrectPin}
        </motion.p>
      )}

      {/* Number Pad */}
      <motion.div className="grid grid-cols-3 gap-4 w-full max-w-[280px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        {["1","2","3","4","5","6","7","8","9"].map((num) => (
          <motion.button
            key={num}
            onClick={() => handleNumberPad(num)}
            className="bg-white/90 rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[28px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f] disabled:opacity-60"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={busy}
          >
            {num}
          </motion.button>
        ))}

        <div />

        <motion.button
          onClick={() => handleNumberPad("0")}
          className="bg-white/90 rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[28px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f] disabled:opacity-60"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={busy}
        >
          0
        </motion.button>

        <motion.button
          onClick={handleDelete}
          className="bg-[rgba(219,140,143,0.5)] rounded-[15px] h-[70px] flex items-center justify-center font-['Inter',sans-serif] font-bold text-[20px] text-[#2d1b1b] shadow-md border-2 border-[#db8c8f] disabled:opacity-60"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={busy}
        >
          ⌫
        </motion.button>
      </motion.div>
    </div>
  );
}