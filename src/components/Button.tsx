import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { color, fontFamily, opacity, radius, stroke } from '@/design/tokens';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'quiet';
  testID?: string;
};

/**
 * Bouton de commande biométrique tactique.
 *
 * Présente une silhouette presque rectangulaire encadrée d'un trait technique,
 * un libellé typé en Oxanium display et un retour d'appui réactif, tout en préservant
 * la cible tactile minimale accessible de 44pt.
 *
 * @param props - Propriétés du bouton: label, callback onPress, états busy/disabled et variante.
 * @returns Le contrôle d'action tactile.
 */
export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = 'solid',
  testID,
}: ButtonProps) {
  const inert = busy || disabled;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy }}
      style={({ pressed }) => [
        styles.button,
        variant === 'solid' ? styles.solid : styles.quiet,
        pressed && (variant === 'solid' ? styles.pressedSolid : styles.pressedQuiet),
        inert && styles.inert,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'solid' ? color.background : color.text} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'solid' ? styles.labelSolid : styles.labelQuiet,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 44,
    borderRadius: radius.technical,
    borderWidth: stroke.thin,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  quiet: {
    backgroundColor: 'rgba(22, 33, 61, 0.45)',
    borderColor: color.border,
  },
  pressedSolid: {
    opacity: opacity.pressed,
  },
  pressedQuiet: {
    opacity: opacity.pressed,
    borderColor: color.accent,
  },
  inert: {
    opacity: opacity.inert,
  },
  label: {
    fontFamily: fontFamily.displayBold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  labelSolid: {
    color: color.background,
  },
  labelQuiet: {
    color: color.text,
  },
});
