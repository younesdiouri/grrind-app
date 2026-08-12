import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { color, radius, space, type } from '@/design/tokens';

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
      {busy ? (
        <ActivityIndicator color={variant === 'solid' ? color.background : color.text} />
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
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    // Le témoin d'activité est plus court qu'une ligne de texte : sans hauteur minimale, le
    // bouton se rétracte au moment de l'appui, et l'écran sursaute.
    minHeight: space.xl + space.md,
  },
  solid: { backgroundColor: color.accent },
  quiet: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.7 },
  inert: { opacity: 0.5 },
  label: { ...type.body },
  labelSolid: { color: color.background },
  labelQuiet: { color: color.textMuted },
});
