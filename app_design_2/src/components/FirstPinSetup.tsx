// src/components/FirstPinSetup.tsx
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { setPin, claimEmail, verifyPin } from "../services/api";
import { useSession } from "../contexts/SessionContext";

interface FirstPinSetupProps {
  inboxId: string;
  sessionToken: string;
  onPinCreated: (pin: string) => void;
  onBack: () => void;
  language: "en" | "fr";

  // if true => show email field
  needsEmailAssociation?: boolean;

  // force email (share/instagram) if you want
  requireEmail?: boolean;

  onEmailLinked?: (email: string) => void;
}

export default function FirstPinSetup({
  inboxId,
  sessionToken,
  onPinCreated,
  onBack,
  language,
  requireEmail = false,
  onEmailLinked,
  needsEmailAssociation = false,
}: FirstPinSetupProps) {
  const { setInboxId, setSessionToken, setIsLocked, setIsPinRequired } = useSession();

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translations = {
    en: {
      title: "Secure Your Inbox",
      subtitle: "Create a PIN code to protect your love letters",
      description:
        "Your inbox needs a 4-digit PIN code for security. This PIN will be required every time you access your messages.",
      emailLabel: "Your email (to attach this inbox)",
      emailHint: "This lets you open future letters without using the link again.",
      enterNewPin: "Enter new PIN (4 digits)",
      confirmNewPin: "Confirm new PIN",
      createButton: "Create PIN",
      creating: "Creating...",
      pinMismatch: "PINs do not match",
      pinInvalid: "PIN must be 4 digits",
      emailInvalid: "Please enter a valid email",
      pinCreated: "PIN created successfully! 🔐",
      errorCreating: "Error creating PIN",
      back: "Back",
      securityNote: "🔒 Your PIN is encrypted and secure",
    },
    fr: {
      title: "Sécurisez votre boîte",
      subtitle: "Créez un code PIN pour protéger vos lettres d'amour",
      description:
        "Votre boîte nécessite un code PIN à 4 chiffres pour la sécurité. Ce PIN sera requis à chaque fois que vous accéderez à vos messages.",
      emailLabel: "Ton email (pour rattacher cette boîte)",
      emailHint: "Comme ça, tu pourras ouvrir les prochaines lettres sans repasser par le lien.",
      enterNewPin: "Entrez le nouveau PIN (4 chiffres)",
      confirmNewPin: "Confirmez le nouveau PIN",
      createButton: "Créer le PIN",
      creating: "Création...",
      pinMismatch: "Les codes PIN ne correspondent pas",
      pinInvalid: "Le PIN doit contenir 4 chiffres",
      emailInvalid: "Veuillez entrer un email valide",
      pinCreated: "PIN créé avec succès ! 🔐",
      errorCreating: "Erreur lors de la création du PIN",
      back: "Retour",
      securityNote: "🔒 Votre PIN est crypté et sécurisé",
    },
  };

  const t = translations[language];
  const validateEmail = (v: string) => v.includes("@") && v.includes(".");

  const showEmailField = requireEmail || needsEmailAssociation;

  const handleCreatePin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error(t.pinInvalid);
      return;
    }
    if (newPin !== confirmPin) {
      toast.error(t.pinMismatch);
      return;
    }
    if (showEmailField && !validateEmail(email)) {
      toast.error(t.emailInvalid);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Attach email if needed
      if (showEmailField) {
        const normalized = email.trim().toLowerCase();
        await claimEmail({ inboxId, sessionToken, email: normalized });
        onEmailLinked?.(normalized);
      }

      // 2) Set PIN (⚠️ this revokes all sessions)
      await setPin(inboxId, newPin, sessionToken);

      // 3) Immediately verify PIN to obtain a NEW sessionToken
      const verified = await verifyPin(inboxId, newPin);
      if (!verified?.sessionToken) throw new Error("No sessionToken after verifyPin");

      // 4) Update session context so app is not "locked"
      setInboxId(inboxId);
      setSessionToken(verified.sessionToken);
      setIsPinRequired(true);
      setIsLocked(false);

      toast.success(t.pinCreated);
      onPinCreated(newPin);
    } catch (error: any) {
      console.error("Error creating PIN:", error);
      toast.error(error?.message || t.errorCreating);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full pb-24">
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

      <motion.div
        className="flex flex-col items-center justify-center pt-[120px] pb-6 px-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="text-7xl mb-6"
        >
          🔐
        </motion.div>

        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black text-center mb-4">{t.title}</h1>
        <p className="font-['Inter',sans-serif] font-bold text-[18px] text-[#a31e46] text-center mb-3">{t.subtitle}</p>
        <p className="font-['Inter',sans-serif] font-light text-[15px] text-[#2d1b1b] text-center">{t.description}</p>
      </motion.div>

      <motion.div className="w-full h-[1px] bg-black mb-8" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} />

      <motion.div className="mx-5 bg-[rgba(255,255,255,0.8)] rounded-[15px] p-7 space-y-6 shadow-lg">
        {showEmailField && (
          <div>
            <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
              {t.emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] text-[16px] text-[#2d1b1b]
                         focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
              disabled={isSubmitting}
            />
            <p className="mt-2 text-[12px] text-[#2d1b1b]/70 italic">{t.emailHint}</p>
          </div>
        )}

        <div>
          <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
            {t.enterNewPin}
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] text-[18px] text-[#2d1b1b]
                       text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
            placeholder="••••"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">
            {t.confirmNewPin}
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] text-[18px] text-[#2d1b1b]
                       text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
            placeholder="••••"
            disabled={isSubmitting}
            onKeyDown={(e) => e.key === "Enter" && handleCreatePin()}
          />
        </div>

        <div className="bg-[rgba(163,30,70,0.1)] border-2 border-[#db8c8f] rounded-[10px] p-4">
          <p className="font-['Inter',sans-serif] font-light text-[13px] text-[#2d1b1b] text-center">{t.securityNote}</p>
        </div>

        <motion.button
          onClick={handleCreatePin}
          disabled={
            isSubmitting ||
            newPin.length !== 4 ||
            confirmPin.length !== 4 ||
            (showEmailField && !validateEmail(email))
          }
          className="w-full bg-[#a31e46] hover:bg-[#8b1838] text-white font-['Inter',sans-serif] font-bold text-[18px] rounded-[10px] h-[54px]
                     shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileTap={!isSubmitting ? { scale: 0.97 } : {}}
        >
          {isSubmitting ? t.creating : t.createButton}
        </motion.button>
      </motion.div>
    </div>
  );
}