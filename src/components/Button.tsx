import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, control, opacity, space, type, typography } from '@/design/tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Une action en cours : le libellé cède la place au témoin, et l'appui ne passe plus. */
  busy?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'quiet';
};

export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = 'solid',
}: ButtonProps) {
  const inert = busy || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy }}
      style={({ pressed }) => [
        styles.button,
        variant === 'solid' ? styles.solid : styles.quiet,
        pressed && styles.pressed,
        inert && styles.inert,
      ]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.accent,
          styles.accentTop,
          variant === 'solid' ? styles.accentSolid : styles.accentQuiet,
        ]}
      />
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.accent,
          styles.accentBottom,
          variant === 'solid' ? styles.accentSolid : styles.accentQuiet,
        ]}
      />
      {busy ? (
        <ActivityIndicator color={variant === 'solid' ? color.accent : color.textMuted} />
      ) : (
        <Text style={[styles.label, variant === 'solid' ? styles.labelSolid : styles.labelQuiet]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: control.radius,
    borderWidth: control.borderWidth,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    // Le témoin d'activité est plus court qu'une ligne de texte : sans hauteur minimale, le
    // bouton se rétracte au moment de l'appui, et l'écran sursaute.
    minHeight: control.minHeight,
  },
  solid: { backgroundColor: color.surfaceRaised, borderColor: color.accent },
  quiet: { backgroundColor: 'transparent', borderColor: color.border },
  pressed: { opacity: opacity.pressed },
  inert: { opacity: opacity.inert },
  label: {
    ...type.body,
    fontFamily: typography.display.semibold,
    letterSpacing: type.label.letterSpacing,
    textTransform: 'uppercase',
  },
  labelSolid: { color: color.accent },
  labelQuiet: { color: color.textMuted },
  accent: {
    position: 'absolute',
    width: control.accentWidth,
    height: control.accentHeight,
  },
  accentTop: { top: 0, left: 0 },
  accentBottom: { right: 0, bottom: 0 },
  accentSolid: { backgroundColor: color.accent },
  accentQuiet: { backgroundColor: color.textMuted },
});
