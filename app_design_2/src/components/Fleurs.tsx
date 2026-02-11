import yellowRose from "../assets/Fleurs/YellowRose.webp";
import redRose from "../assets/Fleurs/RedRose.png";
import whiteRose from "../assets/Fleurs/WhiteRose.png";
import whiteLily from "../assets/Fleurs/WhiteLily.png";

interface FlowerIconProps {
  type: "love" | "friend" | "family" | "crush";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizePxMap = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
} as const;

export default function FlowerIcon({
  type,
  className = "",
  size = "sm",
}: FlowerIconProps) {
  const flower =
    type === "love"
      ? { src: redRose, alt: "Rose Rouge - Amour" }
      : type === "friend"
      ? { src: yellowRose, alt: "Rose Jaune - Amitié" }
      : type === "crush"
      ? { src: whiteRose, alt: "Rose Blanche - Coup de Cœur" }
      : { src: whiteLily, alt: "Lys Blanc - Famille" };

  const px = sizePxMap[size];

  return (
    <img
      src={flower.src}
      alt={flower.alt}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      className={`block shrink-0 object-contain ${className}`}
      style={{ width: px, height: px }}
    />
  );
}
