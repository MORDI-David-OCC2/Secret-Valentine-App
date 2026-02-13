import { motion } from "motion/react";
import AppFrame from "./ui/AppFrame";

interface CreditsPageProps {
  onBack: () => void;
  language: "en" | "fr";
}

export default function CreditsPage({ onBack, language }: CreditsPageProps) {
  const LINKS = {
    dLinkedIn: "https://www.linkedin.com/in/david-mordi/",
    fLinkedIn: "https://www.linkedin.com/in/fleuriane-lam-b6ab66259/",
    fPortfolio: "https://fleuriane-s-portfolio.vercel.app/",
    appInstagram:
      "https://www.instagram.com/secrets_valentines?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  };

  const translations = {
    en: {
      title: "Credits",
      subtitle: "Built with love, mystery, and a bit of magic.",
      creatorsTitle: "Creators",

      dName: "David MORDI",
      dRole: "Backend & Product Engineering",
      dDesc:
        "Responsible for the core app logic, Netlify Functions, Firebase, encryption/session flows, and overall integration.",

      fName: "Fleurine LAM",
      fRole: "UI/UX Design & Frontend",
      fDesc:
        "Designed the UI1 visual style and helped implement the frontend interactions, animations, and overall polish.",

      links: "Links",
      linkedIn: "LinkedIn",
      instagram: "Instagram",
      portfolio: "Portfolio",

      techTitle: "Tech Stack",
      tech: "Vite · React · Netlify Functions · Firebase · Web Push",

      thanksTitle: "Thanks",
      thanks:
        "To everyone who tested the app. If you have any feedback to give us, you can reach us here:",

      back: "Back",
      footer: "made by D&F with",
    },
    fr: {
      title: "Crédits",
      subtitle: "Créé avec amour, mystère, et un peu de magie.",
      creatorsTitle: "Créateurs",

      dName: "David MORDI",
      dRole: "Backend & Ingénierie produit",
      dDesc:
        "Responsable de la logique principale, des Netlify Functions, de Firebase, du chiffrement/sessions et de l’intégration globale.",

      fName: "Fleuriane LAM",
      fRole: "UI/UX Design & Frontend",
      fDesc:
        "A conçu l’identité UI1 et a participé au frontend : interactions, animations, et finitions visuelles.",

      links: "Liens",
      linkedIn: "LinkedIn",
      instagram: "Instagram",
      portfolio: "Portfolio",

      techTitle: "Tech",
      tech: "Vite · React · Netlify Functions · Firebase · Web Push",

      thanksTitle: "Merci",
      thanks:
        "À tous ceux qui ont testé l’app. Si vous avez des retours à nous faire, vous pouvez nous écrire ici :",

      back: "Retour",
      footer: "créé par D&F avec",
    },
  };

  const t = translations[language];

  function LinkButton({ href, label }: { href: string; label: string }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="
          inline-flex items-center justify-center
          rounded-[14px] px-4 py-3
          bg-white/55 border border-white/70
          shadow-[0_10px_25px_rgba(180,90,130,.10)]
          font-['Cormorant_Garamond',serif] italic text-[16px]
          text-[color:var(--rose-deep)]
          hover:bg-white/70 hover:-translate-y-[1px]
          active:scale-[0.99]
          transition
        "
      >
        {label} ↗
      </a>
    );
  }

  function PersonCard({
    emoji,
    name,
    role,
    desc,
    links,
  }: {
    emoji: string;
    name: string;
    role: string;
    desc: string;
    links: { label: string; href: string }[];
  }) {
    return (
      <div className="rounded-[20px] bg-white/55 border border-white/60 shadow-[0_12px_32px_rgba(180,90,130,.12)] px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="size-20 rounded-[18px] bg-white/35 border border-white/60 flex items-center justify-center text-[45px] shrink-0">
            {emoji}
          </div>

          <div className="min-w-0 flex-1">
              <div className="font-['Playfair_Display',serif] italic bold text-[25px] text-[color:var(--text-light)] leading-relaxed">
                {name}
              </div>
            <div className="mt-2 font-['Cormorant_Garamond',serif] text-[17px] text-[color:var(--text-light)] leading-relaxed">
                {role}
              </div>            

            <p className="font-['PlayFair_Display',serif] text-[16px] text-[color:var(--text-light)] leading-relaxed">
              {desc}
            </p>

            <div className="mt-4">
              <div className="mt-2 font-['Cormorant_Garamond',serif] text-[16px] text-[color:var(--text-light)] leading-relaxed">
                {t.links}
              </div>
              <div className="flex flex-wrap gap-3">
                {links.map((l) => (
                  <LinkButton key={l.href} href={l.href} label={l.label} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="mt-4 text-center">
          <motion.div
            className="text-6xl"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            ✨
          </motion.div>

          <h1 className="mt-2 font-['Playfair_Display',serif] italic font-bold text-[28px] text-[color:var(--rose-deep)] drop-shadow-[0_2px_12px_rgba(200,90,130,.18)]">
            {t.title}
          </h1>

          <p className="mt-2 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
            {t.subtitle}
          </p>

          <div className="mt-5 mb-4 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
            <div className="text-[13px] text-[color:var(--rose-deep)]">♥</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[color:var(--rose)] to-transparent" />
          </div>
        </div>

        {/* Creators */}
        <div className="mt-2">
          <div className="mb-3 text-center">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
              {t.creatorsTitle}
            </div>
          </div>

          <div className="space-y-4">
            <PersonCard
              emoji="🧠"
              name={t.dName}
              role={t.dRole}
              desc={t.dDesc}
              links={[{ label: t.linkedIn, href: LINKS.dLinkedIn }]}
            />

            <PersonCard
              emoji="🎨"
              name={t.fName}
              role={t.fRole}
              desc={t.fDesc}
              links={[
                { label: t.linkedIn, href: LINKS.fLinkedIn },
                { label: t.portfolio, href: LINKS.fPortfolio },
              ]}
            />
          </div>
        </div>

        {/* Tech + Thanks */}
        <div className="mt-5 space-y-4">
          <div className="rounded-[20px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.10)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
              {t.techTitle}
            </div>
            <div className="mt-1 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
              {t.tech}
            </div>
          </div>

          <div className="rounded-[20px] bg-white/55 border border-white/60 shadow-[0_10px_30px_rgba(180,90,130,.10)] px-5 py-4">
            <div className="font-['Playfair_Display',serif] italic font-bold text-[18px] text-[color:var(--rose-deep)]">
              {t.thanksTitle}
            </div>

            <p className="mt-1 font-['Cormorant_Garamond',serif] italic text-[16px] text-[color:var(--text-light)]">
              {t.thanks}
            </p>

            <div className="mt-4 flex justify-center">
              <LinkButton href={LINKS.appInstagram} label={t.instagram} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <button className="mt-7 w-full text-center text-[12px] italic text-[color:var(--text-light)] opacity-80 underline decoration-[color:var(--rose)] decoration-dotted underline-offset-4 hover:opacity-100 transition">
          {t.footer} ♥
        </button>
      </div>
    </AppFrame>
  );
}