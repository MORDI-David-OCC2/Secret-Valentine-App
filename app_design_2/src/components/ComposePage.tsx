import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import svgPaths from "../imports/svg-kcw2rymt7y";
import { sendMessage } from "../services/api";
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

interface ComposePageProps {
  onBack: () => void;
  language: "en" | "fr";
}

export default function ComposePage({ onBack, language }: ComposePageProps) {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedType, setSelectedType] = useState<"love" | "friend" | "family" | "crush" | null>("love");
  const [isSending, setIsSending] = useState(false);

  // backend fields
  const [toEmail, setToEmail] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyAllowed, setReplyAllowed] = useState(false);

  const translations = {
    en: {
      back: "Back",
      title: "Compose your letter",
      subtitle: "Write a heartful message to someone special",
      to: "To:",
      toInput: "Olivia...",
      from: "From:",
      fromInput: "Your name...",
      anonymous: "Send anonymously",
      type: "Type:",
      love: "Love",
      friend: "Friend",
      family: "Family",
      crush: "Crush",
      message: "Message:",
      messagePlaceholder: "Write your heartfelt message here...",
      sendLetter: "Send Letter",
      sending: "Sending...",
      footer: "made by D&F with",
    },
    fr: {
      back: "Retour",
      title: "Composez votre lettre",
      subtitle: "Écrivez un message sincère à quelqu'un de spécial",
      to: "À :",
      toInput: "Olivia...",
      from: "De :",
      fromInput: "Votre nom...",
      anonymous: "Envoyer anonymement",
      type: "Type :",
      love: "Amour",
      friend: "Ami",
      family: "Famille",
      crush: "Béguin",
      message: "Message :",
      messagePlaceholder: "Écrivez votre message sincère ici...",
      sendLetter: "Envoyer la Lettre",
      sending: "Envoi...",
      footer: "créé par D&F avec",
    },
  };

  const t = translations[language];

  const handleSubmit = async () => {
    if (!toEmail || !toEmail.includes("@")) {
      toast.error(language === "en" ? "Invalid email address" : "Email invalide");
      return;
    }

    if (!message || message.length > 2000) {
      toast.error(
        language === "en" ? "Message required (max 2000 chars)" : "Message requis (max 2000 caractères)"
      );
      return;
    }

    if (!selectedType) {
      toast.error(language === "en" ? "Please select a type" : "Veuillez sélectionner un type");
      return;
    }

    if (replyAllowed && !fromEmail) {
      toast.error(language === "en" ? "Email required to allow replies" : "Email requis pour autoriser les réponses");
      return;
    }

    setIsSending(true);

    try {
      const typeMapping = {
        love: "love" as const,
        friend: "friendship" as const,
        family: "family" as const,
        crush: "crush" as const,
      };

      const response = await sendMessage({
        toEmail: toEmail.trim().toLowerCase(),
        fromName: isAnonymous ? "Secret Admirer" : from || "Anonymous",
        fromEmail: replyAllowed ? fromEmail.trim().toLowerCase() : undefined,
        replyAllowed,
        type: typeMapping[selectedType],
        body: message.trim(),
      });

      if (response.quarantined) {
        toast.warning(language === "en" ? "Message sent but pending moderation" : "Message envoyé mais en attente de modération");
      } else if (response.emailed) {
        toast.success(language === "en" ? "Message sent! 💌 They will receive an email." : "Message envoyé! 💌 Ils recevront un email.");
      }

      setTimeout(() => onBack(), 1200);
    } catch (error: any) {
      const msg = String(error?.message || "");
      if (msg.includes("429")) {
        toast.error(language === "en" ? "Too many messages. Please wait a moment." : "Trop de messages. Attendez un moment.");
      } else if (msg.includes("block")) {
        toast.error(language === "en" ? "Message blocked by moderation" : "Message bloqué par la modération");
      } else {
        toast.error(error?.message || (language === "en" ? "Failed to send" : "Échec d'envoi"));
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="screen screen-compose active">
      {/* UI1 back */}
      <button className="back-btn" onClick={onBack}>
        ← {t.back}
      </button>

      {/* Header (keep your EnvelopeIcon element) */}
      <div className="compose-header">
        <motion.div
          className="mail-icon"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
        >
          <EnvelopeIcon />
        </motion.div>
        <h3>{t.title}</h3>
      </div>

      <p className="compose-sub">{t.subtitle}</p>

      {/* UI1 card wrapper, BUT KEEP your internal elements */}
      <div className="compose-card">
        {/* To */}
        <div className="field-group">
          <span className="field-label">{t.to}</span>
          <input className="field-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder={t.toInput} />
        </div>

        {/* Recipient email */}
        <div className="field-group">
          <span className="field-label">Email:</span>
          <input
            className="field-input"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="olivia@example.com"
          />
        </div>

        {/* From */}
        <div className="field-group">
          <span className="field-label">{t.from}</span>
          <input
            className="field-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={t.fromInput}
            disabled={isAnonymous}
            style={{ opacity: isAnonymous ? 0.6 : 1 }}
          />
        </div>

        {/* Anonymous checkbox (same logic) */}
        <label className="anon-row">
          <input className="anon-check" type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          <span className="anon-label">{t.anonymous}</span>
        </label>

        {/* Allow replies checkbox (same logic) */}
        <label className="anon-row">
          <input className="anon-check" type="checkbox" checked={replyAllowed} onChange={(e) => setReplyAllowed(e.target.checked)} />
          <span className="anon-label">{language === "en" ? "Allow replies" : "Autoriser les réponses"}</span>
        </label>

        {/* From email (if reply allowed) */}
        {replyAllowed && (
          <div className="field-group">
            <span className="field-label">
              {language === "en" ? "Your Email:" : "Votre email:"}{" "}
              <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-light)" }}>
                {language === "en" ? "For replies" : "Pour réponses"}
              </span>
            </span>
            <input
              className="field-input"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>
        )}

        {/* Type (KEEP your flower buttons exactly) */}
        <span className="field-label">{t.type}</span>
        <div className="grid grid-cols-2 gap-4" style={{ marginTop: 6 }}>
          <motion.button
            onClick={() => setSelectedType("love")}
            type="button"
            className={`bg-gradient-to-br from-pink-200 to-amber-100 border-2 border-pink-400 rounded-[14px] h-[90px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
              selectedType === "love" ? "ring-4 ring-pink-400 scale-105" : ""
            }`}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <FlowerIcon type="love" size="sm" />
            <p className="font-['Inter',sans-serif] font-bold text-[15px] text-pink-700">{t.love}</p>
          </motion.button>

          <motion.button
            onClick={() => setSelectedType("friend")}
            type="button"
            className={`bg-gradient-to-br from-yellow-100 via-lime-100 to-green-100 border-2 border-lime-400 rounded-[14px] h-[90px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
              selectedType === "friend" ? "ring-4 ring-lime-400 scale-105" : ""
            }`}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <FlowerIcon type="friend" size="sm" />
            <p className="font-['Inter',sans-serif] font-bold text-[15px] text-black">{t.friend}</p>
          </motion.button>

          <motion.button
            onClick={() => setSelectedType("family")}
            type="button"
            className={`bg-gradient-to-br from-amber-300 to-rose-300 border-2 border-amber-400 rounded-[14px] h-[90px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
              selectedType === "family" ? "ring-4 ring-amber-400 scale-105" : ""
            }`}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <FlowerIcon type="family" size="sm" />
            <p className="font-['Inter',sans-serif] font-bold text-[15px] text-amber-800">{t.family}</p>
          </motion.button>

          <motion.button
            onClick={() => setSelectedType("crush")}
            type="button"
            className={`bg-gradient-to-br from-pink-200 via-violet-200 to-white border-2 border-violet-300 rounded-[14px] h-[90px] flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
              selectedType === "crush" ? "ring-4 ring-violet-300 scale-105" : ""
            }`}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <FlowerIcon type="crush" size="sm" />
            <p className="font-['Inter',sans-serif] font-bold text-[15px] text-violet-700">{t.crush}</p>
          </motion.button>
        </div>

        {/* Message */}
        <div className="field-group" style={{ marginTop: 12 }}>
          <span className="field-label">{t.message}</span>
          <textarea
            className="field-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            maxLength={2000}
          />
        </div>
      </div>

      {/* Send button (UI1) */}
      <button className="send-btn" onClick={handleSubmit} disabled={isSending}>
        {isSending ? t.sending : t.sendLetter}
      </button>

      {/* footer (keep your heart icon element) */}
      <div style={{ marginTop: 10 }}>
        <p className="footer">
          {t.footer} <MdiHeart className="inline-block align-[-4px] size-[18px]" />
        </p>
      </div>
    </div>
  );
}