import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '@/design/tokens';

type TitleBadgeProps = {
  name: string;
  /**
   * Le surtitre — « TITRE DÉBLOQUÉ ».
   *
   * Il ne décore pas : il dit que le titre **vient d'arriver**. Sans lui, le badge est une
   * mention discrète, celle du titre déjà porté sur l'accueil. Un titre qui tombe et un
   * titre qu'on porte ne se célèbrent pas deux fois de la même façon.
   */
  caption?: string;
};

export function TitleBadge({ name, caption }: TitleBadgeProps) {
  if (caption === undefined) {
    return <Text style={styles.worn}>{name}</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>{caption.toUpperCase()}</Text>
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  worn: { ...type.label, color: color.celebrate },
  card: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  caption: { ...type.label, color: color.celebrate },
  name: { ...type.title, color: color.text },
});
