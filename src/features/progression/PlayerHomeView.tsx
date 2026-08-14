import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { SessionCard } from '@/components/SessionCard';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar, xpBarFill } from '@/components/XpBar';
import { color, curve, duration, radius, space, type } from '@/design/tokens';
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

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Le joueur, en une carte : où il en est, et ce qu'il lui reste.
 *
 * **Elle se remplit au montage.** La barre part de zéro et rejoint sa fraction, le total
 * compte jusqu'au sien, après un temps d'attente. Ce n'est pas une décoration : l'accueil est
 * l'écran où l'on revient *sans* venir de chercher sa progression, et une barre déjà pleine
 * à l'ouverture ne dit rien du chemin parcouru. C'est la même anticipation que le
 * séquenceur, avec la même échelle de temps — `breath` puis `settle`.
 *
 * Une seule valeur animée, comme là-bas, et le compteur passe par `useAnimatedProps` : le
 * texte d'un `Animated.Text` ne s'anime pas, et un `setState` par frame est interdit ici
 * comme ailleurs.
 */
export function LevelCard({ progression }: { progression: Progression }) {
  // `xpToNextLevel` est `null` au niveau maximum. La barre est alors pleine — il n'y a plus
  // de palier à remplir, et une barre vide dirait le contraire de ce qui s'est passé.
  const total =
    progression.xpToNextLevel === null
      ? progression.xpIntoLevel
      : progression.xpIntoLevel + progression.xpToNextLevel;

  const filled = total === 0 ? 1 : progression.xpIntoLevel / total;

  const progress = useSharedValue(0);

  const play = () => {
    progress.value = 0;
    progress.value = withDelay(
      duration.breath,
      withTiming(1, { duration: duration.settle, easing: Easing.bezier(...curve.enter) }),
    );
  };

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * filled * 100}%`,
  }));

  const totalProps = useAnimatedProps(() => {
    const text = `${Math.round(progress.value * progression.totalXp)} XP`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <View style={styles.level} onLayout={play}>
      {/* Le niveau devant, le cumul à droite : c'est le niveau qu'on vient voir, et le
          total qui le justifie. Le titre porté se range sous le total parce qu'il se gagne
          par l'XP, pas par le palier. */}
      <View style={styles.levelHead}>
        <View style={styles.levelIdentity}>
          <Text style={styles.overline}>NIVEAU</Text>
          <Text style={styles.levelNumber}>{progression.level}</Text>
        </View>

        <View style={styles.levelTally}>
          <AnimatedTextInput
            style={styles.levelTotal}
            editable={false}
            animatedProps={totalProps}
            defaultValue="0 XP"
          />
          {progression.activeTitle === null ? null : (
            <TitleBadge name={progression.activeTitle.name} />
          )}
        </View>
      </View>

      <View style={styles.levelProgress}>
        <XpBar size="hero">
          <Animated.View style={[xpBarFill, barStyle]} />
        </XpBar>

        <View style={styles.levelScale}>
          <Text style={styles.levelFoot}>
            {progression.xpToNextLevel === null
              ? 'Niveau maximum'
              : `${progression.xpIntoLevel} / ${total} XP vers le niveau ${progression.level + 1}`}
          </Text>

          {/* Ce qui reste à faire, plus lisible que ce qui est fait : c'est lui qui donne
              envie d'y retourner. Rien à afficher au niveau maximum — il ne reste rien. */}
          {progression.xpToNextLevel === null ? null : (
            <Text style={styles.levelRemaining}>{progression.xpToNextLevel} restants</Text>
          )}
        </View>
      </View>

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
  levelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  levelIdentity: { gap: space.xs },
  levelTally: { alignItems: 'flex-end', gap: space.xs },
  overline: { ...type.label, color: color.textMuted },
  levelNumber: { ...type.display, color: color.celebrate },
  levelTotal: { ...type.title, color: color.accent, padding: 0, textAlign: 'right' },
  levelProgress: { gap: space.sm },
  levelScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.sm,
  },
  levelFoot: { ...type.label, color: color.textMuted },
  levelRemaining: { ...type.label, color: color.text },
});
