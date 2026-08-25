// src/components/FirstPinSetup.tsx
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { setPin, claimEmail, verifyPin } from "../services/api";
import { useSession } from "../contexts/SessionContext";

interface FirstPinSetupProps {
  inboxId: string;
  sessionToken: string;
  onPinCreated: (pin: string) => void;
  onBack: () => void;
  language: "en" | "fr";

  // show email field if true
  needsEmailAssociation?: boolean;

  // force email if you want
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
      subtitle: "Create a Passwordcode to protect your love letters",
      description: "Your inbox needs a 4-digit Passwordcode for security.",
      emailLabel: "Your email (to attach this inbox)",
      emailHint: "So you can access future letters without the link again.",
      enterNewPin: "Enter new Password(6 digits)",
      confirmNewPin: "Confirm new PIN",
      createButton: "Create PIN",
      creating: "Creating...",
      pinMismatch: "PINs do not match",
      pinInvalid: "Passwordmust be 4 digits",
      emailInvalid: "Please enter a valid email",
      pinCreated: "Passwordcreated successfully! 🔐",
      errorCreating: "Error creating PIN",
      back: "Back",
      securityNote: "🔒 Your Passwordis encrypted and secure",
    },
    fr: {
      title: "Sécurisez votre boîte",
      subtitle: "Créez un code Passwordpour protéger vos lettres d'amour",
      description: "Votre boîte nécessite un code Passwordà 6 chiffres pour la sécurité.",
      emailLabel: "Ton email (pour rattacher cette boîte)",
      emailHint: "Comme ça, tu pourras ouvrir les prochaines lettres sans repasser par le lien.",
      enterNewPin: "Entrez le nouveau Password(6 chiffres)",
      confirmNewPin: "Confirmez le nouveau PIN",
      createButton: "Créer le PIN",
      creating: "Création...",
      pinMismatch: "Les codes Passwordne correspondent pas",
      pinInvalid: "Le Passworddoit contenir 6 chiffres",
      emailInvalid: "Veuillez entrer un email valide",
      pinCreated: "Passwordcréé avec succès ! 🔐",
      errorCreating: "Erreur lors de la création du PIN",
      back: "Retour",
      securityNote: "🔒 Votre Passwordest crypté et sécurisé",
    },
  };

  const t = translations[language];
  const validateEmail = (v: string) => v.includes("@") && v.includes(".");
  const showEmailField = requireEmail || needsEmailAssociation;

  const handleCreatePin = async () => {
    if (!/^[A-Za-z0-9]{6}$/.test(newPin)) return toast.error(t.pinInvalid);
    if (newPin !== confirmPin) return toast.error(t.pinMismatch);
    if (showEmailField && !validateEmail(email)) return toast.error(t.emailInvalid);

    setIsSubmitting(true);
    try {
      // 1) Attach email if needed
      if (showEmailField) {
        const normalized = email.trim().toLowerCase();
        await claimEmail({ inboxId, sessionToken, email: normalized });
        onEmailLinked?.(normalized);
      }

      // 2) Set Password(⚠️ backend revokes all sessions)
      await setPin(inboxId, newPin, sessionToken);

      // 3) Re-verify Passwordto obtain a NEW session token
      const verified = await verifyPin(inboxId, newPin);
      if (!verified?.sessionToken) throw new Error("No sessionToken after verifyPin");

      // 4) Update SessionContext => not locked anymore
      setInboxId(inboxId);
      setSessionToken(verified.sessionToken);
      setIsPinRequired(true);
      setIsLocked(false);

      toast.success(t.pinCreated);
      onPinCreated(newPin);
    } catch (error: any) {
      toast.error(error?.message || t.errorCreating);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[rgba(246,193,208,0.71)] relative min-h-screen w-full pb-24">
      <motion.button
        onClick={onBack}
        className="inline-flex items-center gap-3 text-[24px] italic text-[color:var(--text-light)]
                   font-['Cormorant_Garamond',serif] px-3 py-2 rounded-[14px] bg-white/35 backdrop-blur
                   border border-white/50 shadow-[0_10px_30px_rgba(180,90,130,.10)]
                   hover:bg-white/45 active:scale-[0.99] transition"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <span className="text-[30px] leading-none">←</span>
        <span className="leading-none">{t.back}</span>
      </motion.button>

      <div className="flex flex-col items-center justify-center pt-[120px] pb-6 px-8">
        <div className="text-7xl mb-6">🔐</div>
        <h1 className="font-['Kaushan_Script',sans-serif] text-[35px] text-black text-center mb-4">{t.title}</h1>
        <p className="font-['Inter',sans-serif] font-bold text-[18px] text-[#a31e46] text-center mb-3">{t.subtitle}</p>
        <p className="font-['Inter',sans-serif] font-light text-[15px] text-[#2d1b1b] text-center">{t.description}</p>
      </div>

      <div className="w-full h-[1px] bg-black mb-8" />

      <div className="mx-5 bg-[rgba(255,255,255,0.8)] rounded-[15px] p-7 space-y-6 shadow-lg">
        {showEmailField && (
          <div>
            <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">{t.emailLabel}</label>
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
          <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">{t.enterNewPin}</label>
          <input
            type="password"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.slice(0,6))}
            className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] text-[18px] text-[#2d1b1b]
                       text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
            placeholder="6 ••••••"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="font-['Inter',sans-serif] font-medium text-[14px] text-[#2d1b1b] mb-2 block">{t.confirmNewPin}</label>
          <input
            type="password"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.slice(0,6))}
            className="w-full bg-white border-2 border-[#db8c8f] rounded-[10px] h-[54px] px-4 font-['Inter',sans-serif] text-[18px] text-[#2d1b1b]
                       text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#a31e46]"
            placeholder="6 ••••••"
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
            !/^[A-Za-z0-9]{6}$/.test(newPin) ||
            !/^[A-Za-z0-9]{6}$/.test(confirmPin) ||
            (showEmailField && !validateEmail(email))
          }
          className="w-full bg-[#a31e46] hover:bg-[#8b1838] text-white font-['Inter',sans-serif] font-bold text-[18px]
                     rounded-[10px] h-[54px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileTap={!isSubmitting ? { scale: 0.97 } : {}}
        >
          {isSubmitting ? t.creating : t.createButton}
        </motion.button>
      </div>
    </div>
  );
}