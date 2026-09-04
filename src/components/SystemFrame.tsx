import type { PropsWithChildren } from 'react';
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
