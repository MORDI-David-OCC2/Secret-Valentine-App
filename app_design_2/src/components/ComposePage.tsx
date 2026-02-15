import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import svgPaths from "../imports/svg-kcw2rymt7y";
import { sendMessage } from "../services/api";
import FlowerIcon from "./Fleurs";
import AppFrame from "./ui/AppFrame";

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

type PageName = "home" | "letters" | "compose" | "settings" | "credits" | "claim";
type DeliveryMode = "email" | "share" | "instagram";

interface ComposePageProps {
  onBack: () => void;
  language: "en" | "fr";
  onNavigate?: (page: PageName) => void;
}

export default function ComposePage({ onBack, language, onNavigate }: ComposePageProps) {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");

  const [isAnonymous, setIsAnonymous] = useState(false);

  const [selectedType, setSelectedType] = useState<"love" | "friend" | "family" | "crush" | null>(null);
  const [isSending, setIsSending] = useState(false);

  // delivery
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("email");
  const [toEmail, setToEmail] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  // replies
  const [replyAllowed, setReplyAllowed] = useState(false);
  const [fromEmail, setFromEmail] = useState("");

  // share link
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const translations = {
    en: {
      back: "Back",
      title: "Compose your letter",
      subtitle: "Write a heartful message to someone special",

      delivery: "Delivery",
      deliveryEmail: "1) I know the email (send it)",
      deliveryShare: "2) I’ll share the link myself",
      deliveryInstagram: "3) I don’t know the email (Instagram relay)",

      to: "To:",
      toInput: "Olivia...",

      emailTo: "Recipient email",
      emailToPlaceholder: "olivia@example.com",

      instaTo: "Recipient Instagram @",
      instaToPlaceholder: "@theirname",

      from: "From:",
      fromInput: "Your name...",

      anonymous: "Send anonymously",

      allowReplies: "Allow replies",
      yourEmail: "Your email (for replies)",
      yourEmailPlaceholder: "your.email@example.com",

      type: "Type:",
      love: "Love",
      friend: "Friend",
      family: "Family",
      crush: "Crush",

      message: "Message:",
      messagePlaceholder: "Write your heartfelt message here...",

      sendLetter: "Send Letter",
      generateLink: "Generate link",
      sending: "Sending...",

      linkReady: "Your link is ready ✨",
      copyLink: "Copy link",
      close: "Close",

      footer: "made by D&F with",

      errors: {
        invalidRecipientEmail: "Invalid recipient email",
        invalidReplyEmail: "Valid email required to allow replies",
        invalidInstagram: "Please enter a valid Instagram @",
        messageRequired: "Message required (max 2000 chars)",
        typeRequired: "Please select a type",
        noLinkReturned: "Server did not return a link (res.link).",
      },
    },
    fr: {
      back: "Retour",
      title: "Composez votre lettre",
      subtitle: "Écrivez un message sincère à quelqu'un de spécial",

      delivery: "Envoi",
      deliveryEmail: "1) Je connais l’email (envoyer)",
      deliveryShare: "2) Je partage le lien moi-même",
      deliveryInstagram: "3) Je ne connais pas l’email (relais Instagram)",

      to: "À :",
      toInput: "Olivia...",

      emailTo: "Email du destinataire",
      emailToPlaceholder: "olivia@example.com",

      instaTo: "Instagram du destinataire @",
      instaToPlaceholder: "@sonpseudo",

      from: "De :",
      fromInput: "Votre nom...",

      anonymous: "Envoyer anonymement",

      allowReplies: "Autoriser les réponses",
      yourEmail: "Ton email (pour répondre)",
      yourEmailPlaceholder: "ton.email@exemple.com",

      type: "Type :",
      love: "Amour",
      friend: "Ami",
      family: "Famille",
      crush: "Crush",

      message: "Message :",
      messagePlaceholder: "Écrivez votre message sincère ici...",

      sendLetter: "Envoyer la Lettre",
      generateLink: "Générer le lien",
      sending: "Envoi...",

      linkReady: "Ton lien est prêt ✨",
      copyLink: "Copier le lien",
      close: "Fermer",

      footer: "créé par D&F avec",

      errors: {
        invalidRecipientEmail: "Email destinataire invalide",
        invalidReplyEmail: "Email valide requis pour autoriser les réponses",
        invalidInstagram: "Veuillez entrer un @Instagram valide",
        messageRequired: "Message requis (max 2000 caractères)",
        typeRequired: "Veuillez sélectionner un type",
        noLinkReturned: "Le serveur n’a pas renvoyé de lien (res.link).",
      },
    },
  };

  const t = translations[language];

  const validateEmail = (v: string) => v.includes("@") && v.includes(".");
  const normalizeHandle = (h: string) => {
    const s = String(h || "").trim();
    if (!s) return "";
    return s.startsWith("@") ? s : "@" + s;
  };

  const handleCopy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success(language === "fr" ? "Lien copié ✅" : "Link copied ✅");
    } catch {
      toast.error(language === "fr" ? "Impossible de copier" : "Copy failed");
    }
  };

  const handleSubmit = async () => {
    // reset link when switching away from share
    if (deliveryMode !== "share") setGeneratedLink(null);

    // validations
    if (!message || message.length > 2000) {
      toast.error(t.errors.messageRequired);
      return;
    }
    if (!selectedType) {
      toast.error(t.errors.typeRequired);
      return;
    }
    if (replyAllowed && !validateEmail(fromEmail)) {
      toast.error(t.errors.invalidReplyEmail);
      return;
    }

    if (deliveryMode === "email" && !validateEmail(toEmail)) {
      toast.error(t.errors.invalidRecipientEmail);
      return;
    }

    if (deliveryMode === "instagram") {
      const handle = normalizeHandle(instagramHandle);
      if (!handle || handle.length < 2) {
        toast.error(t.errors.invalidInstagram);
        return;
      }
    }

    setIsSending(true);

    try {
      const typeMapping = {
        love: "love" as const,
        friend: "friendship" as const,
        family: "family" as const,
        crush: "crush" as const,
      };

      const res: any = await sendMessage({
        // NEW: delivery info
        deliveryMode,
        instagramHandle: deliveryMode === "instagram" ? normalizeHandle(instagramHandle) : undefined,

        // recipient email only if email mode
        toEmail: deliveryMode === "email" ? toEmail.trim().toLowerCase() : undefined,

        // sender identity
        fromName: isAnonymous ? "Secret Admirer" : (from || "Anonymous"),
        replyAllowed,
        fromEmail: replyAllowed ? fromEmail.trim().toLowerCase() : undefined,

        // content
        type: typeMapping[selectedType],
        body: message.trim(),

        // optional hint for relay/admin (safe)
        toNameHint: to.trim() || undefined,
      });

      // SHARE mode: show link and stay on page
      if (deliveryMode === "share") {
        if (res?.link) {
          setGeneratedLink(res.link);
          toast.success(language === "fr" ? "Lien généré ✨" : "Link generated ✨");
          return;
        }
        toast.error(t.errors.noLinkReturned);
        return;
      }

      // Instagram relay: success then go back
      if (deliveryMode === "instagram") {
        toast.success(language === "fr" ? "Envoyé à l’équipe ✨" : "Sent to the team ✨");
        setTimeout(() => onBack(), 1200);
        return;
      }

      // Email classic
      if (res?.quarantined) {
        toast.warning(language === "en" ? "Message sent but pending moderation" : "Message envoyé mais en attente de modération");
      } else {
        toast.success(language === "en" ? "Message sent! 💌" : "Message envoyé ! 💌");
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
    <AppFrame>
      <div className="relative">
        {/* Back */}
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

        {/* Header */}
        <motion.div className="flex flex-col items-center mt-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }} className="mb-2">
            <EnvelopeIcon />
          </motion.div>

          <h1 className="font-['Playfair_Display',serif] italic font-bold text-[28px] text-[color:var(--rose-deep)] text-center drop-shadow-[0_2px_12px_rgba(200,90,130,.18)]">
            {t.title}
          </h1>

          <p className="mt-2 text-center italic text-[14px] text-[color:var(--text-light)] leading-relaxed">
            {t.subtitle}
          </p>

          <div className="mt-5 mb-5 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            <div className="text-[13px] text-[color:var(--rose-deep)]">♥</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          </div>
        </motion.div>

        {/* Share link box */}
        {deliveryMode === "share" && generatedLink && (
          <div className="mb-4 rounded-[20px] bg-white/70 border border-white/70 shadow-[0_10px_35px_rgba(180,90,130,.12)] p-5">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
              {t.linkReady}
            </div>

            <div className="mt-3 break-all rounded-[14px] bg-white/60 border border-white/70 px-4 py-3 text-[14px] text-[color:var(--text)] font-['Cormorant_Garamond',serif] italic">
              {generatedLink}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => handleCopy(generatedLink)}
                className="flex-1 rounded-[14px] px-4 py-3 bg-gradient-to-br from-[#9b2d5a] to-[#7a1a45] text-white font-['Playfair_Display',serif] italic font-bold shadow-[0_8px_24px_rgba(155,45,90,.25)] active:scale-[0.99] transition"
              >
                {t.copyLink}
              </button>

              <button
                type="button"
                onClick={() => setGeneratedLink(null)}
                className="rounded-[14px] px-4 py-3 bg-white/60 border border-white/70 text-[color:var(--text-light)] italic font-['Cormorant_Garamond',serif] active:scale-[0.99] transition"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}

        {/* Form card */}
        <motion.div
          className="bg-white/60 backdrop-blur-md rounded-[20px] p-5 sm:p-6 space-y-5 border border-white/70 shadow-[0_10px_35px_rgba(180,90,130,.12)]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {/* Delivery selector */}
          <div>
            <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-3 font-['Cormorant_Garamond',serif]">
              {t.delivery}
            </p>

            <div className="space-y-2">
              {(["email", "share", "instagram"] as DeliveryMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setDeliveryMode(m);
                    setGeneratedLink(null);
                  }}
                  className={[
                    "w-full text-left rounded-[14px] px-4 py-3 border shadow-sm transition",
                    "bg-white/55 border-white/70",
                    deliveryMode === m ? "ring-2 ring-[color:var(--rose-deep)]" : "hover:bg-white/70",
                  ].join(" ")}
                >
                  <div className="font-['Playfair_Display',serif] italic font-bold text-[16px] text-[color:var(--rose-deep)]">
                    {m === "email" ? t.deliveryEmail : m === "share" ? t.deliveryShare : t.deliveryInstagram}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* To */}
          <div>
            <p className="text-[16px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-2 font-['Cormorant_Garamond',serif]">
              {t.to}
            </p>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={t.toInput}
              className="w-full bg-[rgba(247,221,230,.45)] border border-[rgba(232,160,180,.55)] rounded-[12px] h-[46px] px-4 text-[14px] text-[color:var(--text)] font-['Cormorant_Garamond',serif] placeholder:italic placeholder:text-[rgba(158,107,128,.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(201,102,122,.25)]"
            />
          </div>

          {/* Recipient details by mode */}
          {deliveryMode === "email" && (
            <div>
              <p className="text-[16px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-2 font-['Cormorant_Garamond',serif]">
                {t.emailTo}
              </p>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder={t.emailToPlaceholder}
                className="w-full bg-[rgba(247,221,230,.45)] border border-[rgba(232,160,180,.55)] rounded-[12px] h-[46px] px-4 text-[14px] text-[color:var(--text)] font-['Cormorant_Garamond',serif] placeholder:italic placeholder:text-[rgba(158,107,128,.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(201,102,122,.25)]"
              />
            </div>
          )}

          {deliveryMode === "instagram" && (
            <div>
              <p className="text-[16px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-2 font-['Cormorant_Garamond',serif]">
                {t.instaTo}
              </p>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder={t.instaToPlaceholder}
                className="w-full bg-[rgba(247,221,230,.45)] border border-[rgba(232,160,180,.55)] rounded-[12px] h-[46px] px-4 text-[14px] text-[color:var(--text)] font-['Cormorant_Garamond',serif] placeholder:italic placeholder:text-[rgba(158,107,128,.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(201,102,122,.25)]"
              />
            </div>
          )}

          {/* From name */}
          <div>
            <p className="text-[16px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-2 font-['Cormorant_Garamond',serif]">
              {t.from}
            </p>
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={t.fromInput}
              disabled={isAnonymous}
              className="w-full bg-[rgba(247,221,230,.45)] border border-[rgba(232,160,180,.55)] rounded-[12px] h-[46px] px-4 text-[14px] text-[color:var(--text)] font-['Cormorant_Garamond',serif] placeholder:italic placeholder:text-[rgba(158,107,128,.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(201,102,122,.25)] disabled:opacity-50"
            />
          </div>

          {/* Anonymous + Replies */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={() => setIsAnonymous(!isAnonymous)}
                className="size-4 rounded border border-[color:var(--rose)] accent-[color:var(--rose-deep)]"
              />
              <span className="italic text-[14px] text-[color:var(--text-light)] font-['Cormorant_Garamond',serif]">
                {t.anonymous}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replyAllowed}
                onChange={() => setReplyAllowed(!replyAllowed)}
                className="size-4 rounded border border-[color:var(--rose)] accent-[color:var(--rose-deep)]"
              />
              <span className="italic text-[14px] text-[color:var(--text-light)] font-['Cormorant_Garamond',serif]">
                {t.allowReplies}
              </span>
            </label>

            {replyAllowed && (
              <div>
                <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-2 font-['Cormorant_Garamond',serif]">
                  {t.yourEmail}
                </p>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder={t.yourEmailPlaceholder}
                  className="w-full bg-[rgba(247,221,230,.45)] border border-[rgba(232,160,180,.55)] rounded-[12px] h-[46px] px-4 text-[14px] text-[color:var(--text)] font-['Cormorant_Garamond',serif] placeholder:italic placeholder:text-[rgba(158,107,128,.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(201,102,122,.25)]"
                />
              </div>
            )}
          </div>

          {/* Type */}
          <div>
            <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-3 font-['Cormorant_Garamond',serif]">
              {t.type}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedType("love")}
                className={`rounded-[14px] h-[78px] flex flex-col items-center justify-center gap-1 shadow-md border transition ${
                  selectedType === "love" ? "ring-2 ring-[color:var(--rose-deep)]" : ""
                } bg-gradient-to-br from-pink-200 to-amber-100 border-pink-300`}
              >
                <FlowerIcon type="love" size="sm" />
                <span className="font-['Playfair_Display',serif] italic font-bold text-[14px] text-pink-700">{t.love}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("friend")}
                className={`rounded-[14px] h-[78px] flex flex-col items-center justify-center gap-1 shadow-md border transition ${
                  selectedType === "friend" ? "ring-2 ring-[color:var(--rose-deep)]" : ""
                } bg-gradient-to-br from-yellow-100 via-lime-100 to-green-100 border-lime-300`}
              >
                <FlowerIcon type="friend" size="sm" />
                <span className="font-['Playfair_Display',serif] italic font-bold text-[14px] text-[color:var(--text)]">
                  {t.friend}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("family")}
                className={`rounded-[14px] h-[78px] flex flex-col items-center justify-center gap-1 shadow-md border transition ${
                  selectedType === "family" ? "ring-2 ring-[color:var(--rose-deep)]" : ""
                } bg-gradient-to-br from-amber-300 to-rose-300 border-amber-300`}
              >
                <FlowerIcon type="family" size="sm" />
                <span className="font-['Playfair_Display',serif] italic font-bold text-[14px] text-amber-900">{t.family}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("crush")}
                className={`rounded-[14px] h-[78px] flex flex-col items-center justify-center gap-1 shadow-md border transition ${
                  selectedType === "crush" ? "ring-2 ring-[color:var(--rose-deep)]" : ""
                } bg-gradient-to-br from-pink-200 via-violet-200 to-white border-violet-200`}
              >
                <FlowerIcon type="crush" size="sm" />
                <span className="font-['Playfair_Display',serif] italic font-bold text-[14px] text-violet-700">{t.crush}</span>
              </button>
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-[16px] font-bold tracking-[0.08em] uppercase text-[color:var(--rose-deep)] mb-2 font-['Cormorant_Garamond',serif]">
              {t.message}
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              rows={6}
              className="w-full bg-[rgba(247,221,230,.45)] border border-[rgba(232,160,180,.55)] rounded-[12px] p-4 text-[14px] text-[color:var(--text)] font-['Cormorant_Garamond',serif] placeholder:italic placeholder:text-[rgba(158,107,128,.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(201,102,122,.25)] resize-none"
            />
          </div>

          {/* Action button area */}
          {deliveryMode === "share" ? (
            generatedLink ? (
              <motion.button
                type="button"
                onClick={() => handleCopy(generatedLink)}
                className="w-full rounded-[16px] h-[50px] text-white font-['Playfair_Display',serif] italic font-bold text-[16px] shadow-[0_8px_28px_rgba(155,45,90,.35)] bg-gradient-to-br from-[#8b1f4e] to-[#6b1238]"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {t.copyLink}
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isSending}
                className="w-full rounded-[16px] h-[50px] text-white font-['Playfair_Display',serif] italic font-bold text-[16px] shadow-[0_8px_28px_rgba(155,45,90,.35)] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-[#8b1f4e] to-[#6b1238]"
                whileHover={!isSending ? { y: -2 } : {}}
                whileTap={!isSending ? { scale: 0.98 } : {}}
              >
                {isSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t.sending}
                  </span>
                ) : (
                  t.generateLink
                )}
              </motion.button>
            )
          ) : (
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={isSending}
              className="w-full rounded-[16px] h-[50px] text-white font-['Playfair_Display',serif] italic font-bold text-[16px] shadow-[0_8px_28px_rgba(155,45,90,.35)] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-[#8b1f4e] to-[#6b1238]"
              whileHover={!isSending ? { y: -2 } : {}}
              whileTap={!isSending ? { scale: 0.98 } : {}}
            >
              {isSending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.sending}
                </span>
              ) : (
                t.sendLetter
              )}
            </motion.button>
          )}
        </motion.div>

        {/* Footer */}
        <button
          onClick={() => onNavigate?.("credits")}
          className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80 underline decoration-[color:var(--rose)] decoration-dotted underline-offset-4 hover:opacity-100 transition"
        >
          {t.footer} ♥
        </button>
      </div>
    </AppFrame>
  );
}