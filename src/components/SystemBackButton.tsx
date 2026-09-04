import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, control, opacity, type, typography } from '@/design/tokens';

/** La commande de retour des écrans connectés, carrée mais toujours large de 44 points. */
export function SystemBackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View pointerEvents="none" style={styles.accent} />
      <Text style={styles.glyph}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: control.backSize,
    height: control.backSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: control.radius,
    borderWidth: control.borderWidth,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: control.accentWidth,
    height: control.accentHeight,
    backgroundColor: color.accent,
  },
  glyph: {
    ...type.title,
    fontFamily: typography.display.semibold,
    color: color.text,
  },
  pressed: { opacity: opacity.pressed },
});
