import { Pressable, StyleSheet, Text } from 'react-native';

import { color, fontFamily, opacity, radius, stroke } from '@/design/tokens';

export type TacticalBackButtonProps = {
  onPress?: () => void;
  testID?: string;
};

/**
 * Bouton retour tactique rectangulaire pour la navigation.
 *
 * Remplace les boutons ronds par un contrôle technique compact aux proportions
 * biométriques, garantissant la cible tactile minimale accessible de 44x44.
 *
 * @param props - Propriétés du bouton retour.
 * @returns Le contrôle de navigation arrière.
 */
export function TacticalBackButton({ onPress, testID }: TacticalBackButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: radius.technical,
    borderWidth: stroke.thin,
    borderColor: color.border,
    backgroundColor: 'rgba(22, 33, 61, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chevron: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    color: color.accent,
    lineHeight: 24,
    textAlign: 'center',
  },
  pressed: {
    opacity: opacity.pressed,
    borderColor: color.accent,
  },
});
