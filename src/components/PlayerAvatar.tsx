import { StyleSheet, Text, View } from 'react-native';

import { initialsOf } from '@/components/initials';
import { color, radius, space, type } from '@/design/tokens';

type PlayerAvatarProps = {
  /**
   * Le nom dont on tire les initiales — jamais une clé.
   *
   * **Deux membres homonymes sont un cas normal** : rien ici ne suppose le nom unique, et
   * l'appelant qui liste des membres doit clé sur `id`, pas sur `displayName`.
   */
  name: string;
};

export function PlayerAvatar({ name }: PlayerAvatarProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.initials}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: space.xl,
    height: space.xl,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...type.label, color: color.text, letterSpacing: 0 },
});
