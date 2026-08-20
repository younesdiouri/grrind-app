import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { color, opacity, space, type } from '@/design/tokens';

type ToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Le réglage part vers le serveur : l'interrupteur cède la place au témoin, l'appui ne passe plus. */
  busy?: boolean;
  disabled?: boolean;
};

/**
 * Une ligne de réglage à bascule — les catégories de notification (#57), et tout ce qui leur
 * ressemblera : un libellé, un interrupteur, rien d'autre.
 *
 * Le composant natif `Switch` porte lui-même l'appui et l'état visuel : contrairement à
 * `Button`/`DangerRow`, il n'y a pas de `Pressable` à envelopper ici, seulement ses couleurs à
 * accorder aux tokens.
 */
export function ToggleRow({
  label,
  value,
  onValueChange,
  busy = false,
  disabled = false,
}: ToggleRowProps) {
  const inert = busy || disabled;

  return (
    <View style={[styles.row, inert && styles.inert]}>
      <Text style={styles.label}>{label}</Text>

      {busy ? (
        <ActivityIndicator color={color.accent} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={inert}
          trackColor={{ false: color.surfaceRaised, true: color.accent }}
          thumbColor={color.text}
          ios_backgroundColor={color.surfaceRaised}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm,
  },
  inert: { opacity: opacity.inert },
  label: { ...type.body, color: color.text, flexShrink: 1 },
});
