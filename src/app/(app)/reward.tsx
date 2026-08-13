import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { color, space, type } from '@/design/tokens';
import { getSyncStatus } from '@/features/health/sync';
import { FIXTURES, type FixtureName } from '@/features/reward/fixtures';
import { SyncSummaryView } from '@/features/reward/SyncSummaryView';

/**
 * L'écran qui joue une synchronisation.
 *
 * Deux entrées, et la seconde n'est pas du décor : avec un paramètre `fixture`, il joue une
 * réponse capturée — c'est le banc d'essai, qui tourne sans réseau et sans montre. Sans
 * paramètre, il joue **la vraie**, celle que la dernière synchronisation a rapportée.
 *
 * Le résumé se lit dans le magasin plutôt que de traverser la navigation : un `SyncSummary` de
 * quinze workouts ne passe pas par un paramètre de route, et il vit déjà hors de l'arbre.
 */
export default function RewardScreen() {
  const { fixture } = useLocalSearchParams<{ fixture?: FixtureName }>();

  if (fixture !== undefined) {
    // `key` force un remontage à chaque fixture : la séquence se rejoue depuis le début
    // plutôt que de reprendre l'horloge de la précédente.
    return <SyncSummaryView key={fixture} summary={FIXTURES[fixture] ?? FIXTURES.unWorkout} />;
  }

  const status = getSyncStatus();
  const summary =
    status.phase === 'settled' && status.result.kind === 'summary' ? status.result.summary : null;

  if (summary === null) {
    return (
      <View style={styles.empty}>
        <Text style={styles.body}>Rien à jouer pour le moment.</Text>
      </View>
    );
  }

  return <SyncSummaryView summary={summary} />;
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    backgroundColor: color.background,
  },
  body: { ...type.body, color: color.textMuted },
});
