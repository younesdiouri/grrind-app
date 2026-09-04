import { motion } from '@/design/tokens';

export type MotionName = keyof typeof motion;
export type DecorativeMotion<Name extends MotionName = MotionName> = Name extends MotionName
  ? Readonly<{
    /** Le nom réserve aussi la géométrie : il ne peut pas diverger de son effet. */
    readonly name: Name;
    /** Masqué pour Réduire les animations, mais le nom reste connu. */
    readonly effect: (typeof motion)[Name] | undefined;
  }>
  : never;

/**
 * Le mouvement de fond est décoratif au même titre que le halo : la préférence système le coupe
 * sans toucher aux informations, aux couleurs, aux cadres ni aux segments — qui restent visibles
 * à **opacité 1**, pas à `motion.seam.from`. Un écran sans mouvement doit rester complet et
 * lisible, pas dégradé.
 *
 * Jumeau exact de `decorativeGlow`, pour ses deux exigences, qui ne sont pas négociables :
 *
 * - **Le nom survit à la coupure de l'effet**, pour que les réservations d'espace ne bougent pas.
 *   La couronne d'`orbit` agrandit le viewport SVG du cercle de vie ; sans mouvement elle
 *   disparaît, mais le viewport garde sa taille et le contenu ne se déplace pas d'un point.
 *   C'est pour ça que `ringViewport` lit `motion[name]` par le nom et jamais `effect`.
 * - **La décision reste pure et testable hors React Native**, dans `decorativeMotion.test.ts`.
 */
export function decorativeMotion<const Name extends MotionName>(
  name: Name,
  reducedMotion: boolean | null,
): DecorativeMotion<Name> {
  return Object.freeze({
    name,
    effect: reducedMotion === false ? motion[name] : undefined,
  }) as DecorativeMotion<Name>;
}
