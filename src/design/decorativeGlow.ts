import { glow } from '@/design/tokens';

export type GlowTier = keyof typeof glow;
export type DecorativeGlow<Tier extends GlowTier = GlowTier> = Tier extends GlowTier
  ? Readonly<{
    /** Le tier réserve aussi le viewport SVG : il ne peut pas diverger de son effet. */
    readonly tier: Tier;
    /** Masqué pour Réduire les animations, mais le tier reste connu. */
    readonly effect: (typeof glow)[Tier] | undefined;
  }>
  : never;

/**
 * Les halos sont décoratifs : la préférence système les coupe sans toucher aux informations
 * ni à leur mouvement. La décision pure reste testable hors de React Native.
 */
export function decorativeGlow<const Tier extends GlowTier>(
  tier: Tier,
  reducedMotion: boolean | null,
): DecorativeGlow<Tier> {
  return Object.freeze({
    tier,
    effect: reducedMotion === false ? glow[tier] : undefined,
  }) as DecorativeGlow<Tier>;
}
