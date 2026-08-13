import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { color, disciplineLabel, radius, space, type, xpSourceLabel } from '@/design/tokens';
import { buildTimeline, type RewardSummary, type SkippedWorkout, type SyncSummary } from './timeline';

/**
 * L'écran du produit : le moment dopamine, désormais sur **un lot** de séances.
 *
 * **Une seule horloge.** `clock` est la seule valeur animée du composant ; tout le reste en
 * est *dérivé* par `interpolate`. C'est ce qui garantit que rien ne désynchronise, que le
 * saut est instantané et exact — il suffit de poser l'horloge à la fin — et que l'ensemble
 * tourne sur le thread UI sans un seul rendu React pendant la séquence.
 *
 * **Aucun `setState` dans une boucle.** Les compteurs numériques passent par
 * `useAnimatedProps` sur un `TextInput` : c'est le seul moyen d'écrire du texte depuis un
 * worklet, `Animated.Text` n'anime pas son contenu.
 *
 * Le retour vers JS est réservé à l'haptique, via `scheduleOnRN` — `runOnJS` est déprécié
 * depuis Reanimated 4.
 *
 * Ce que ce composant **ne fait plus** : construire les rampes. Elles sont sorties dans
 * `timeline.ts` quand la séquence est passée à plusieurs workouts — c'est de la mise en
 * scène, et de la mise en scène qu'on ne peut vérifier qu'à l'œil sur un appareil est de la
 * mise en scène qu'on ne vérifie pas.
 */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function SyncSummaryView({ summary }: { summary: SyncSummary }) {
  const timeline = useMemo(() => buildTimeline(summary), [summary]);
  const clock = useSharedValue(0);

  const digest = timeline.beats.find((beat) => beat.kind === 'digest');
  const skipped = timeline.beats.find((beat) => beat.kind === 'skipped');

  const play = () => {
    clock.value = 0;
    clock.value = withTiming(timeline.duration, {
      duration: timeline.duration,
      easing: Easing.linear,
    });
  };

  /**
   * Le saut. Toucher l'écran amène à l'état final immédiatement.
   *
   * Il n'y a rien à calculer : poser l'horloge à la fin met chaque interpolation sur sa
   * dernière valeur, et ces dernières valeurs viennent de `totals`. C'est précisément ce que
   * `totals` existe pour faire, et rien d'autre.
   */
  const skip = () => {
    cancelAnimation(clock);
    clock.value = timeline.duration;
  };

  // Le seul aller-retour vers JS de toute la séquence : un choc par niveau franchi, condensé
  // compris — c'est là que tombe souvent le plus gros du lot.
  const levelStarts = useMemo(
    () =>
      timeline.beats
        .filter((beat) => beat.kind === 'level')
        .map((beat) => beat.at)
        .concat(
          digest === undefined
            ? []
            : digest.levels.map(
                (_, index) =>
                  digest.at + ((digest.until - digest.at) / (digest.levels.length + 1)) * (index + 1),
              ),
        ),
    [timeline, digest],
  );

  useAnimatedReaction(
    () => levelStarts.filter((at) => clock.value >= at).length,
    (crossed, previous) => {
      if (previous !== null && crossed > previous) {
        scheduleOnRN(Haptics.notificationAsync, Haptics.NotificationFeedbackType.Success);
      }
    },
  );

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(clock.value, timeline.bar.input, timeline.bar.output, Extrapolation.CLAMP) * 100}%`,
  }));

  const counterProps = useAnimatedProps(() => {
    const value = Math.round(
      interpolate(clock.value, timeline.counter.input, timeline.counter.output, Extrapolation.CLAMP),
    );
    const text = `${value > 0 ? '+' : ''}${value}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <Pressable style={styles.screen} onPress={skip} onLayout={play}>
      {/* La tête de l'écran : une seule course d'XP pour tout le lot. Elle ne se remet jamais
          à zéro entre deux séances — c'est ce qui fait de la synchronisation un moment, et
          non trois animations à la suite. */}
      <AnimatedTextInput
        style={styles.counter}
        editable={false}
        animatedProps={counterProps}
        defaultValue="0"
      />

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>

      {/* Le détail, empilé : un seul workout à l'écran à la fois, au même endroit. */}
      <View style={styles.stage}>
        {timeline.segments.map((segment) => (
          <WorkoutDetail
            key={segment.workout}
            clock={clock}
            timeline={timeline}
            segment={segment}
            workout={summary.imported[segment.workout]}
          />
        ))}

        {digest === undefined ? null : (
          <Digest
            clock={clock}
            at={digest.at}
            until={digest.until}
            count={digest.count}
            levels={digest.levels}
          />
        )}
      </View>

      {/* Ce qui n'a rien rapporté, nommé — et en dernier. */}
      {skipped === undefined ? null : (
        <Skipped clock={clock} at={skipped.at} until={skipped.until} entries={summary.skipped} />
      )}

      <Text style={styles.ruleset}>{summary.rulesetVersion}</Text>
    </Pressable>
  );
}

type Clock = ReturnType<typeof useSharedValue<number>>;
type BeatProps = { clock: Clock; at: number; until: number };

/**
 * Le détail d'une séance : sa carte, son breakdown, ses niveaux, ses titres.
 *
 * Le bloc entier paraît sur sa fenêtre puis s'efface, ce qui laisse le suivant prendre sa
 * place sans que l'écran ait à défiler.
 */
function WorkoutDetail({
  clock,
  timeline,
  segment,
  workout,
}: {
  clock: Clock;
  timeline: ReturnType<typeof buildTimeline>;
  segment: { workout: number; at: number; until: number };
  workout: RewardSummary;
}) {
  const index = segment.workout;
  const lines = timeline.beats.filter((beat) => beat.kind === 'xpLine' && beat.workout === index);
  const levels = timeline.beats.filter((beat) => beat.kind === 'level' && beat.workout === index);
  const titles = timeline.beats.filter((beat) => beat.kind === 'title' && beat.workout === index);
  const opening = timeline.beats.find((beat) => beat.kind === 'session' && beat.workout === index)!;

  // Le bloc s'ouvre sur sa séance et se retire quand le suivant s'ouvre. Le fondu de sortie
  // est court : deux blocs visibles ensemble donneraient à lire deux séances à la fois.
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      [segment.at, opening.until, segment.until - 180, segment.until],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View style={[styles.block, style]} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.label}>{disciplineLabel[workout.session.discipline]}</Text>
        <Text style={styles.duration}>{Math.round(workout.session.durationSeconds / 60)} min</Text>
      </View>

      <View style={styles.breakdown}>
        {workout.xp.breakdown.map((line, position) => (
          <BreakdownRow
            key={`${line.source}-${position}`}
            clock={clock}
            at={lines[position].at}
            until={lines[position].until}
            label={xpSourceLabel[line.source]}
            amount={line.amount}
          />
        ))}
      </View>

      <View style={styles.levels}>
        {workout.level.reached.map((level, position) => (
          <LevelFlip
            key={level}
            clock={clock}
            at={levels[position].at}
            until={levels[position].until}
            level={level}
          />
        ))}
      </View>

      <View style={styles.titles}>
        {workout.titlesUnlocked.map((title, position) => (
          <TitleDrop
            key={title.id}
            clock={clock}
            at={titles[position].at}
            until={titles[position].until}
            name={title.name}
          />
        ))}
      </View>

      {/* `loot`, `streak`, `unlockableNodes` — présents et vides jusqu'aux Lots 6, 5 et 7. */}
    </Animated.View>
  );
}

/**
 * Le condensé : ce que le détail n'a pas joué.
 *
 * Il dit **combien** et **quels niveaux**, pas la liste. Le serveur a tout envoyé et rien
 * n'est perdu — c'est une décision de mise en scène, et l'historique (`GET /api/workouts`)
 * reste là pour qui veut relire ses quinze séances une par une.
 */
function Digest({
  clock,
  at,
  until,
  count,
  levels,
}: BeatProps & { count: number; levels: number[] }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [at, at + 220], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(clock.value, [at, at + 320], [18, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={[styles.block, styles.digest, style]} pointerEvents="none">
      <Text style={styles.digestCount}>+{count}</Text>
      <Text style={styles.label}>
        {count > 1 ? 'autres séances' : 'autre séance'}
      </Text>

      {levels.length === 0 ? null : (
        <View style={styles.levels}>
          {levels.map((level, index) => (
            <DigestLevel
              key={level}
              clock={clock}
              at={at + ((until - at) / (levels.length + 1)) * (index + 1)}
              level={level}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function DigestLevel({ clock, at, level }: { clock: Clock; at: number; level: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [at, at + 140], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(clock.value, [at, at + 200], [0.7, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={[styles.levelBadge, style]}>
      <Text style={styles.levelValue}>{level}</Text>
    </Animated.View>
  );
}

/**
 * Les séances écartées, **nommées**.
 *
 * Le contrat rend `activityType` et `reason` par séance justement pour ça : « le curling
 * n'est pas encore un sport chez nous » est une phrase, « 1 séance ignorée » n'en est pas
 * une. Et `OUT_OF_WINDOW` mérite sa propre formulation — la séance est bien en base, elle
 * apparaîtra dans l'historique, elle n'a simplement rien rapporté.
 */
function Skipped({ clock, at, until, entries }: BeatProps & { entries: SkippedWorkout[] }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [at, until], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[styles.skipped, style]} pointerEvents="none">
      {entries.map((entry) => (
        <Text key={entry.externalId} style={styles.skippedRow}>
          {entry.activityType} · {skippedReason[entry.reason]}
        </Text>
      ))}
    </Animated.View>
  );
}

/**
 * Les cinq refus, traduits.
 *
 * `Record` sur l'union du schéma généré : le jour où le back en ajoute un, le compilateur
 * réclame sa phrase au lieu de laisser un `undefined` s'afficher.
 */
const skippedReason: Record<SkippedWorkout['reason'], string> = {
  ALREADY_IMPORTED: 'déjà comptée',
  UNSUPPORTED_ACTIVITY: "pas encore un sport chez nous",
  OUT_OF_WINDOW: "trop ancienne pour rapporter, mais gardée",
  OVERLAPS: 'déjà couverte par une autre séance',
  TOO_SHORT: 'trop courte pour compter',
};

function BreakdownRow({
  clock,
  at,
  until,
  label,
  amount,
}: BeatProps & { label: string; amount: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [at, until], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(clock.value, [at, until], [16, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View style={[styles.row, style]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowAmount, { color: amount < 0 ? color.loss : color.gain }]}>
        {amount > 0 ? '+' : ''}
        {amount}
      </Text>
    </Animated.View>
  );
}

function LevelFlip({ clock, at, until, level }: BeatProps & { level: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [at, at + 120, until], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(clock.value, [at, at + 200, until], [0.6, 1.15, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.levelBadge, style]}>
      <Text style={styles.levelLabel}>NIVEAU</Text>
      <Text style={styles.levelValue}>{level}</Text>
    </Animated.View>
  );
}

function TitleDrop({ clock, at, until, name }: BeatProps & { name: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [at, at + 150], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(clock.value, [at, until], [-24, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={[styles.titleCard, style]}>
      <Text style={styles.titleLabel}>TITRE DÉBLOQUÉ</Text>
      <Text style={styles.titleName}>{name}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background, padding: space.lg, gap: space.md },
  counter: { ...type.display, color: color.accent, padding: 0 },
  barTrack: {
    height: 14,
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: color.accent, borderRadius: radius.pill },
  /** Les blocs de détail se superposent : un seul est lisible à la fois. */
  stage: { flex: 1 },
  // Position explicite plutôt que `StyleSheet.absoluteFill` : les blocs se superposent dans
  // `stage`, et écrire les quatre bords ici évite de dépendre d'un helper dont le type a
  // bougé d'une version de React Native à l'autre.
  block: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, gap: space.md },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  label: { ...type.label, color: color.textMuted },
  duration: { ...type.title, color: color.text },
  breakdown: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...type.body, color: color.textMuted },
  rowAmount: { ...type.body },
  levels: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  levelBadge: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  levelLabel: { ...type.label, color: color.textMuted },
  levelValue: { ...type.title, color: color.celebrate },
  titles: { gap: space.sm },
  titleCard: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  titleLabel: { ...type.label, color: color.celebrate },
  titleName: { ...type.title, color: color.text },
  digest: { alignItems: 'center', justifyContent: 'center' },
  digestCount: { ...type.display, color: color.text },
  skipped: { gap: space.xs },
  skippedRow: { ...type.body, color: color.textMuted },
  ruleset: { ...type.label, color: color.textMuted },
});
