import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { computeFrameStyles } from '@/design/systemFrame';
import type { FrameAccent, FrameTier } from '@/design/tokens';

export type SystemFrameProps = PropsWithChildren<{
  tier?: FrameTier;
  accent?: FrameAccent;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

/**
 * Cadre biométrique tactique GRRIND réutilisable.
 *
 * Applique une hiérarchie de contours extérieure, une doublure intérieure discrète,
 * et des repères asymétriques d'angle selon le palier (standard, hero, event).
 *
 * @param props - Propriétés du cadre: tier, accent, style et enfants.
 * @returns Le composant de conteneur encadré.
 */
export function SystemFrame({
  tier = 'standard',
  accent,
  style,
  testID,
  children,
}: SystemFrameProps) {
  const frameStyles = computeFrameStyles(tier, accent);

  return (
    <View
      testID={testID}
      style={[
        styles.outer,
        {
          borderWidth: frameStyles.outer.borderWidth,
          borderColor: frameStyles.outer.borderColor,
          borderRadius: frameStyles.outer.borderRadius,
          backgroundColor: frameStyles.outer.backgroundColor,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.inner,
          {
            top: frameStyles.inner.inset,
            left: frameStyles.inner.inset,
            right: frameStyles.inner.inset,
            bottom: frameStyles.inner.inset,
            borderWidth: frameStyles.inner.borderWidth,
            borderColor: frameStyles.inner.borderColor,
            borderRadius: frameStyles.inner.borderRadius,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.accentCornerHorizontal,
          {
            backgroundColor: frameStyles.accentSegment.color,
            height: frameStyles.accentSegment.width,
            width: frameStyles.accentSegment.length,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.accentCornerVertical,
          {
            backgroundColor: frameStyles.accentSegment.color,
            width: frameStyles.accentSegment.width,
            height: frameStyles.accentSegment.length / 2,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
    overflow: 'hidden',
  },
  inner: {
    position: 'absolute',
  },
  accentCornerHorizontal: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  accentCornerVertical: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
