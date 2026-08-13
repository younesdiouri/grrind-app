import { StyleSheet, Text, View } from 'react-native';

import { color, disciplineLabel, radius, space, type } from '@/design/tokens';
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
 * les deux cas.
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
        <Text style={styles.title}>{progression.activeTitle.name}</Text>
      )}

      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.round(filled * 100)}%` }]} />
      </View>

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
 * tout. Une mesure absente disparaît de la ligne au lieu de s'afficher à zéro — un `0 bpm`
 * serait une donnée fausse là où il n'y a pas de donnée.
 */
export function WorkoutRow({ workout, now }: { workout: Workout; now: Date }) {
  const measures = [
    formatDistance(workout.distanceMeters),
    formatElevation(workout.elevationGainMeters),
    formatCalories(workout.calories),
    formatHeartRate(workout.averageHeartRate),
  ].filter((measure): measure is string => measure !== null);

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.rowTitle}>{disciplineLabel[workout.discipline]}</Text>
        <Text style={styles.rowDuration}>{formatDuration(workout.durationSeconds)}</Text>
      </View>

      <Text style={styles.rowWhen}>{formatWhen(workout.startedAt, now)}</Text>

      {measures.length > 0 ? (
        <Text style={styles.rowMeasures}>{measures.join(' · ')}</Text>
      ) : null}
    </View>
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
  title: { ...type.label, color: color.celebrate },
  bar: {
    height: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceRaised,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: color.accent },
  levelFoot: { ...type.label, color: color.textMuted },
  row: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowTitle: { ...type.body, color: color.text },
  rowDuration: { ...type.body, color: color.textMuted },
  rowWhen: { ...type.label, color: color.textMuted },
  rowMeasures: { ...type.label, color: color.textMuted },
});
