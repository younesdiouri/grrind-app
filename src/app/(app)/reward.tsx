import { useLocalSearchParams } from 'expo-router';

import { FIXTURES, type FixtureName } from '@/features/reward/fixtures';
import { SyncSummaryView } from '@/features/reward/SyncSummaryView';

export default function RewardScreen() {
  const { fixture } = useLocalSearchParams<{ fixture: FixtureName }>();
  const summary = FIXTURES[fixture] ?? FIXTURES.unWorkout;

  // `key` force un remontage à chaque fixture : la séquence se rejoue depuis le début
  // plutôt que de reprendre l'horloge de la précédente.
  return <SyncSummaryView key={fixture} summary={summary} />;
}
