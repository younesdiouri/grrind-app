import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { color, disciplineLabel, radius, space, type } from '@/design/tokens';

/**
 * La discipline d'une séance, nommée.
 *
 * Le composant prend l'**enum du contrat**, pas une chaîne déjà traduite : `disciplineLabel`
 * vit dans les tokens, et c'est lui qui casse la compilation le jour où le back ouvre un
 * sport. Passer une chaîne ici ferait sauter ce garde-fou d'un cran, jusqu'à l'appelant, qui
 * n'a aucune raison de le porter.
 *
 * C'est une pastille et pas un titre parce que la discipline est un vocabulaire **fermé** :
 * elle se reconnaît d'un coup d'œil dans une liste, elle ne se lit pas.
 */
export function DisciplineChip({
  discipline,
}: {
  discipline: components['schemas']['Discipline'];
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{disciplineLabel[discipline].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  label: { ...type.label, color: color.text },
});
