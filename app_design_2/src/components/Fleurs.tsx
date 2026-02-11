import yellowRose from "../assets/Fleurs/YellowRose.webp";
import redRose from "../assets/Fleurs/RedRose.png";
import whiteRose from "../assets/Fleurs/WhiteRose.png";
import whiteLily from "../assets/Fleurs/WhiteLily.png";

interface FlowerIconProps {
  type: 'love' | 'friend' | 'family' | 'crush';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
};

export default function FlowerIcon({ type, className = '', size = 'sm' }: FlowerIconProps) {
  const getFlowerImage = () => {
    switch (type) {
      case 'love':
        return { src: redRose, alt: 'Rose Rouge - Amour' };
      case 'friend':
        return { src: yellowRose, alt: 'Rose Jaune - Amitié' };
      case 'crush':
        return { src: whiteRose, alt: 'Rose Blanche - Coup de Cœur' };
      case 'family':
        return { src: whiteLily, alt: 'Lys Blanc - Famille' };
      default:
        return { src: redRose, alt: 'Fleur' };
    }
  };

  const flower = getFlowerImage();
  const sizeClass = sizeClasses[size];

  return (
    <img 
      src={flower.src} 
      alt={flower.alt}
      className={`${sizeClass} object-contain ${className}`}
    />
  );
}
