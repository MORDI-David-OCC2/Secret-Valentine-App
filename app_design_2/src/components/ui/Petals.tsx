import { useEffect, useMemo, useState } from "react";

type Petal = {
  id: string;
  emoji: string;
  left: string;
  fontSize: string;
  duration: string;
  delay: string;
};

const EMOJIS = ["🌸", "🌺", "✿", "❀", "🌷", "♥", "💕"];

export function Petals({ count = 22 }: { count?: number }) {
  const [petals, setPetals] = useState<Petal[]>([]);
  const seed = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    setPetals(
      Array.from({ length: count }).map((_, i) => ({
        id: `${seed}-${i}`,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        left: `${Math.random() * 100}vw`,
        fontSize: `${0.6 + Math.random() * 0.9}rem`,
        duration: `${6 + Math.random() * 10}s`,
        delay: `${Math.random() * 8}s`,
      }))
    );
  }, [count, seed]);

  return (
    <div className="petals" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: p.left,
            fontSize: p.fontSize,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
