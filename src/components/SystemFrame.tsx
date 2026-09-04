import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  framePresentation,
  type FrameAccent,
  type FrameTier,
} from '@/design/systemFrame';
import { color, frame, glow } from '@/design/tokens';

type SystemFrameProps = PropsWithChildren<{
  tier?: FrameTier;
  accent?: FrameAccent;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Les deux segments, **quand quelqu'un les anime** (#159).
   *
   * `seam` fait respirer leur opacité sur l'horloge partagée, et une opacité pilotée par une
   * valeur partagée demande un `Animated.View` : elle ne peut donc pas passer par un style. Le
   * cadre prête ses deux places, l'appelant fournit ce qui les occupe — la même porte que
   * `XpBar.children` et `AttributeRing.children`, pour la même raison, qui est que Reanimated
   * doit rester **hors** du design system, donc hors des previews, qui se rendent dans Node.
   *
   * La géométrie ne se recopie pas pour autant : `framePresentation` donne la couleur et la
   * longueur, `frameSegment` donne les trois styles. Voir `Seam`, dans `SystemMotion`.
   *
   * Absent, le cadre pose ses deux segments fixes — c'est l'état sous « Réduire les animations »,
   * et ils y restent à **opacité 1**, pas à `motion.seam.from`.
   */
  segments?: ReactNode;
  /**
   * Les calques décoratifs du cadre : le ruban de graduations (`tick`) et le trait de lecture
   * (`scan`).
   *
   * Posés **dans** le cadre, donc sous son masque : rien n'en déborde, et rien n'entre dans
   * l'arbre d'accessibilité. Ils se dessinent au-dessus des segments et sous le contenu — un
   * balayage qui passerait par-dessus le texte le rendrait illisible une fois par lecture.
   */
  overlay?: ReactNode;
}>;

/**
 * Un panneau de télémétrie GRRIND. Les segments sont purement décoratifs : le contenu garde
 * seul sa place dans l'arbre d'accessibilité et toute l'interaction reste chez l'appelant.
 */
export function SystemFrame({
  tier = 'standard',
  accent = 'accent',
  style,
  contentStyle,
  segments,
  overlay,
  children,
}: SystemFrameProps) {
  const presentation = framePresentation(tier, accent);

  return (
    <View
      style={[
        styles.frame,
        {
          borderColor: presentation.outerColor,
          borderRadius: presentation.radius,
          borderWidth: presentation.borderWidth,
        },
        presentation.glow && { boxShadow: glow.soft.boxShadow },
        style,
      ]}
    >
      {presentation.double ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.inner,
            {
              borderColor: presentation.innerColor,
              borderRadius: presentation.radius,
              borderWidth: presentation.borderWidth,
              inset: presentation.inset,
            },
          ]}
        />
      ) : null}

      {segments ?? (
        <>
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.segment,
              styles.segmentTop,
              {
                backgroundColor: presentation.accentColor,
                width: presentation.accentLength,
              },
            ]}
          />
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.segment,
              styles.segmentBottom,
              {
                backgroundColor: presentation.accentColor,
                width: presentation.accentLength,
              },
            ]}
          />
        </>
      )}

      {overlay}

      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  inner: { position: 'absolute' },
  content: { flexGrow: 1 },
  segment: {
    position: 'absolute',
    height: frame.segmentThickness,
  },
  segmentTop: { top: frame.segmentOffset, left: frame.segmentOffset },
  segmentBottom: { bottom: frame.segmentOffset, right: frame.segmentOffset },
});

/**
 * Les trois styles d'un segment, pour qui les anime lui-même. Voir `segments`, et `xpBarFill`
 * dont c'est le modèle : la géométrie n'existe qu'une fois, ici, et l'appelant l'emprunte au
 * lieu d'en tenir une copie qui divergerait au premier ajustement de `frame`.
 */
export const frameSegment = {
  base: styles.segment,
  top: styles.segmentTop,
  bottom: styles.segmentBottom,
} as const;
