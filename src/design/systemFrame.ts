import { color, frame } from './tokens.ts';

export type FrameTier = 'standard' | 'hero' | 'event';
export type FrameAccent = 'accent' | 'celebrate' | 'gain' | 'coin';

const accentColor: Record<FrameAccent, string> = {
  accent: color.accent,
  celebrate: color.celebrate,
  gain: color.gain,
  coin: color.coin,
};

/** Résout la sémantique d'un cadre sans dépendre de React Native ni de Reanimated. */
export function framePresentation(tier: FrameTier, accent: FrameAccent) {
  return {
    ...frame[tier],
    accentColor: accentColor[accent],
    outerColor: tier === 'standard' ? color.border : accentColor[accent],
    innerColor: color.border,
  };
}
