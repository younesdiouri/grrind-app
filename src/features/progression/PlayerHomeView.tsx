import { StyleSheet, Text, View } from 'react-native';

import { SessionCard } from '@/components/SessionCard';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar } from '@/components/XpBar';
import { color, radius, space, type } from '@/design/tokens';
import {
  formatCalories,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatWhen,
} from '@/features/progression/format';
import type { Progression, Workout } from '@/features/progression/usePlayerHome';

/**
 * L'état du joueur et ce qui l'a produit — l'écran qui prouve que la chaîne a marché.
 *
 * Il n'anime rien. `SyncSummaryView` est la mise en scène, celui-ci est le constat : on y
 * revient après, ou sans être passé par elle du tout, et il doit dire la même chose dans
 * les deux cas. « La même chose » veut dire les **mêmes composants** : la barre, la carte de
 * séance et le badge de titre sont ceux du design system, pas des copies qui divergeraient
 * au premier ajustement.
 */

export function LevelCard({ progression }: { progression: Progression }) {
  // `xpToNextLevel` est `null` au niveau maximum. La barre est alors pleine — il n'y a plus
  // de palier à remplir, et une barre vide dirait le contraire de ce qui s'est passé.
  const total =
    progression.xpToNextLevel === null
      ? progression.xpIntoLevel
      : progression.xpIntoLevel + progression.xpToNextLevel;

  const filled = total === 0 ? 1 : progression.xpIntoLevel / total;

  return (
    <View style={styles.level}>
      <View style={styles.levelHead}>
        <Text style={styles.levelNumber}>Niveau {progression.level}</Text>
        <Text style={styles.levelTotal}>{progression.totalXp} XP</Text>
      </View>

      {progression.activeTitle === null ? null : (
        <TitleBadge name={progression.activeTitle.name} />
      )}

      <XpBar fill={filled} />

      <Text style={styles.levelFoot}>
        {progression.xpToNextLevel === null
          ? 'Niveau maximum'
          : `${progression.xpIntoLevel} / ${total} XP vers le niveau ${progression.level + 1}`}
      </Text>

      {/* Deux nombres qui valent la même chose aujourd'hui, et le contrat explique
          pourquoi : les arbres de compétences feront baisser `available` sans toucher à
          `earned`. On affiche le solde, celui qui bougera. */}
      {progression.skillPoints.available > 0 ? (
        <Text style={styles.levelFoot}>
          {progression.skillPoints.available} point
          {progression.skillPoints.available > 1 ? 's' : ''} de compétence
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Une séance de l'historique.
 *
 * Les mesures sont **toutes optionnelles**, et pas par prudence : aucun appareil ne fournit
 * tout. Le tri se fait ici, où l'on sait ce qui est absent ; la carte, elle, reçoit une
 * liste déjà propre — un `0 bpm` serait une donnée fausse là où il n'y a pas de donnée.
 */
export function WorkoutRow({ workout, now }: { workout: Workout; now: Date }) {
  const measures = [
    formatDistance(workout.distanceMeters),
    formatElevation(workout.elevationGainMeters),
    formatCalories(workout.calories),
    formatHeartRate(workout.averageHeartRate),
  ].filter((measure): measure is string => measure !== null);

  return (
    <SessionCard
      discipline={workout.discipline}
      duration={formatDuration(workout.durationSeconds)}
      when={formatWhen(workout.startedAt, now)}
      measures={measures}
    />
  );
}

const styles = StyleSheet.create({
  level: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  levelNumber: { ...type.title, color: color.text },
  levelTotal: { ...type.body, color: color.accent },
  levelFoot: { ...type.label, color: color.textMuted },
});
