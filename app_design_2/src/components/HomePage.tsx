import { useMemo } from "react";
import { useSession } from "../contexts/SessionContext";

interface HomePageProps {
  onNavigate: (page: "home" | "letters" | "compose" | "settings" | "credits" | "claim") => void;
  language: "en" | "fr";
}

export default function HomePage({ onNavigate, language }: HomePageProps) {
  const { isAuthenticated } = useSession();

  const t = useMemo(() => {
    const translations = {
      en: {
        title: "Secret Valentine",
        taglineTop: "Reveal your heart,",
        taglineEm: "keep your mystery.",
        writeTitle: "Write a message",
        writeSub: "Send anonymous love",
        inboxTitle: "Check my letters",
        inboxSub: "Someone is thinking of you…",
        settings: "Settings",
        footer: "made by D&F with ♥",
      },
      fr: {
        title: "Secret Valentine",
        taglineTop: "Révèle ton cœur,",
        taglineEm: "garde ton mystère.",
        writeTitle: "Écrire un message",
        writeSub: "Envoyer un mot secret",
        inboxTitle: isAuthenticated ? "Voir mes lettres" : "Accéder à ma boîte",
        inboxSub: isAuthenticated ? "Quelqu’un pense à toi…" : "Réclame ta boîte de réception",
        settings: "Réglages",
        footer: "créé par D&F avec ♥",
      },
    } as const;

    return translations[language];
  }, [language, isAuthenticated]);

  return (
    <div className="screen screen-home active">
      {/* Settings (top-right) */}
      <button
        onClick={() => onNavigate("settings")}
        aria-label={t.settings}
        style={{
          position: "absolute",
          top: "calc(14px + env(safe-area-inset-top))",
          right: "16px",
          zIndex: 20,
        }}
        className="back-btn"
      >
        <span style={{ fontSize: "1.2rem" }}>⚙️</span>
      </button>

      <div className="header">
        <div className="hearts-row">
          <span>🤍</span>
          <span>🌸</span>
          <span>🤍</span>
        </div>
        <h1>{t.title}</h1>
      </div>

      <p className="tagline">
        {t.taglineTop}
        <br />
        <em>{t.taglineEm}</em>
      </p>

      <div className="divider">
        <div className="divider-line" />
        <div className="divider-icon">♥</div>
        <div className="divider-line" />
      </div>

      {/* Write */}
      <button className="home-btn home-btn-write" onClick={() => onNavigate("compose")}>
        <div className="hbtn-icon">✍️</div>
        <div className="hbtn-text">
          <span className="hbtn-title">{t.writeTitle}</span>
          <span className="hbtn-sub">{t.writeSub}</span>
        </div>
        <span className="hbtn-arrow">→</span>
      </button>

      {/* Inbox / Claim */}
      <button
        className="home-btn home-btn-read"
        onClick={() => onNavigate(isAuthenticated ? "letters" : "claim")}
      >
        <div className="hbtn-icon">💌</div>
        <div className="hbtn-text">
          <span className="hbtn-title">{t.inboxTitle}</span>
          <span className="hbtn-sub">{t.inboxSub}</span>
        </div>
        <span className="hbtn-arrow">→</span>
      </button>

      {/* Footer -> credits */}
      <button
        onClick={() => onNavigate("credits")}
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <p className="footer" style={{ textDecoration: "underline dotted" }}>
          {t.footer}
        </p>
      </button>
    </div>
  );
}