import { glow } from '@/design/tokens';

export type GlowTier = keyof typeof glow;
export type DecorativeGlow = {
  [Tier in GlowTier]: {
    /** Le tier réserve aussi le viewport SVG : il ne peut pas diverger de son effet. */
    tier: Tier;
    /** Masqué pour Réduire les animations, mais le tier reste connu. */
    effect: (typeof glow)[Tier] | undefined;
  };
}[GlowTier];

/**
 * Les halos sont décoratifs : la préférence système les coupe sans toucher aux informations
 * ni à leur mouvement. La décision pure reste testable hors de React Native.
 */
export function decorativeGlow(tier: GlowTier, reducedMotion: boolean | null): DecorativeGlow {
  return {
    tier,
    effect: reducedMotion === false ? glow[tier] : undefined,
  } as DecorativeGlow;
}
