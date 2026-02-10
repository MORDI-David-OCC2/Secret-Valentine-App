import type { LetterType } from '../types';

export function formatWhen(ts?: string | number): string {
  try {
    if (!ts) return '';
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleString();
  } catch {
    return '';
  }
}

export function mapTypeToUi(type?: LetterType): 'love' | 'crush' | 'family' | 'friend' {
  if (type === 'friendship') return 'friend';
  return (type || 'crush') as 'love' | 'crush' | 'family' | 'friend';
}

export function typeLabel(type?: LetterType): string {
  switch (type) {
    case 'love':
      return 'love';
    case 'family':
      return 'family';
    case 'friendship':
      return 'friend';
    case 'crush':
    default:
      return 'crush';
  }
}
