import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, radius, space } from '@/design/tokens';

type XpBarProps = {
  /**
   * Le remplissage, entre 0 et 1. Ignoré quand un enfant est fourni.
   *
   * C'est une **fraction déjà calculée**, jamais une XP : la largeur d'un palier est une
   * règle de jeu, et le client n'en a aucune.
   */
  fill?: number;
  /** La barre de tête d'un écran, ou la ligne d'un résumé. */
  size?: 'inline' | 'hero';
  /**
   * Le remplissage **animé**, quand il y en a un.
   *
   * La barre du séquenceur est pilotée par une valeur partagée sur le thread UI, pas par un
   * rendu React : elle ne peut donc pas passer par `fill`. Le composant prête sa piste et son
   * masque, l'appelant fournit ce qui la remplit — un `Animated.View` portant `xpBarFill`.
   * C'est ce qui garde Reanimated **hors** du design system, donc hors des previews, qui se
   * rendent dans Node.
   */
  children?: ReactNode;
};

export function XpBar({ fill = 0, size = 'inline', children }: XpBarProps) {
  const width = `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%` as const;

  return (
    <View style={[styles.track, size === 'hero' ? styles.hero : styles.inline]}>
      {children ?? <View style={[xpBarFill, { width }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    // Sans masque, un remplissage à angles ronds dépasse la piste sur ses deux bouts.
    overflow: 'hidden',
  },
  inline: { height: space.sm },
  hero: { height: space.md },
  fill: { height: '100%', backgroundColor: color.accent, borderRadius: radius.pill },
});

/** Le fond de la barre, pour qui l'anime lui-même. Voir `children`. */
export const xpBarFill = styles.fill;
