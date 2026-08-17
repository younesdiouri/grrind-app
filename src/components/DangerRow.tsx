import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { color, opacity, space, type } from '@/design/tokens';

type DangerRowProps = {
  label: string;
  onPress: () => void;
  /** Une action en cours : le libellé cède la place au témoin, l'appui ne passe plus. */
  busy?: boolean;
  disabled?: boolean;
};

/**
 * Une action qui ne se rattrape pas : quitter, exclure, dissoudre.
 *
 * `color.danger`, jamais `color.loss` — celui-ci parle d'une XP perdue, celui-là d'un refus
 * ou d'un geste qui retire quelque chose pour de bon. Le rouge est le même dans la palette,
 * le rôle ne l'est pas.
 *
 * Elle ne prend jamais le style de `Button` : un fondateur qui dissout sa guilde ne doit pas
 * appuyer sur ce qui ressemble au bouton qui synchronise ses séances. L'écran qui la pose la
 * garde donc seule dans sa section, jamais mêlée à une action ordinaire.
 */
export function DangerRow({ label, onPress, busy = false, disabled = false }: DangerRowProps) {
  const inert = busy || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, inert && styles.inert]}
    >
      {busy ? (
        <ActivityIndicator color={color.danger} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: space.xl,
  },
  pressed: { opacity: opacity.pressed },
  inert: { opacity: opacity.inert },
  label: { ...type.body, color: color.danger },
});
