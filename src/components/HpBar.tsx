import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, radius, space } from '@/design/tokens';

type HpBarProps = {
  /** Le camp — c'est lui qui donne la couleur, jamais l'appelant. */
  side: 'player' | 'enemy';
  /**
   * Le remplissage, entre 0 et 1. Ignoré quand un enfant est fourni.
   *
   * Une **fraction**, jamais des points de vie : la barre ne connaît pas le maximum du
   * combattant, et le lui donner l'obligerait à faire une division que l'appelant a déjà en
   * main. Même partage que `XpBar`.
   */
  fill?: number;
  /**
   * Le remplissage **animé**, quand il y en a un.
   *
   * La barre d'un combat est pilotée par une valeur partagée sur le thread UI, pas par un
   * rendu React : elle ne peut donc pas passer par `fill`. Le composant prête sa piste et son
   * masque, l'appelant fournit ce qui la remplit. C'est ce qui garde Reanimated **hors** du
   * design system, donc hors des previews, qui se rendent dans Node.
   */
  children?: ReactNode;
};

/**
 * Les points de vie d'un combattant.
 *
 * Plus haute que `XpBar` : elle porte le suspense d'un combat, là où la barre d'XP accompagne
 * un décompte. Et elle ne se vide **jamais** de la droite — la course va toujours de plein à
 * vide dans le même sens, pour les deux camps, parce qu'une barre qui se viderait en miroir
 * demanderait de lire sa direction avant de lire sa valeur.
 */
export function HpBar({ side, fill = 1, children }: HpBarProps) {
  const width = `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%` as const;

  return (
    <View style={styles.track}>
      {children ?? (
        <View style={[styles.fill, side === 'player' ? styles.player : styles.enemy, { width }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: space.md,
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    // Sans masque, un remplissage à angles ronds dépasse la piste sur ses deux bouts.
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  player: { backgroundColor: color.hpPlayer },
  enemy: { backgroundColor: color.hpEnemy },
});

/** Les deux fonds, pour qui anime la barre lui-même. Voir `children`. */
export const hpBarFill = {
  player: [styles.fill, styles.player],
  enemy: [styles.fill, styles.enemy],
} as const;
