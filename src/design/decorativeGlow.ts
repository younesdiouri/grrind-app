import { glow } from '@/design/tokens';

export type GlowTier = keyof typeof glow;

/**
 * Les halos sont décoratifs : la préférence système les coupe sans toucher aux informations
 * ni à leur mouvement. La décision pure reste testable hors de React Native.
 */
export function decorativeGlow(tier: GlowTier, reducedMotion: boolean) {
  return reducedMotion ? undefined : glow[tier];
}
