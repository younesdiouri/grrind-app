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
import { buildTimeline, type RewardSummary } from './timeline';

/**
 * L'écran du produit : le moment dopamine.
 *
 * **Une seule horloge.** `clock` est la seule valeur animée du composant ; tout le reste en
 * est *dérivé* par `interpolate`. C'est ce qui garantit que rien ne désynchronise, que le
 * saut (`skip`) est instantané et exact — il suffit de poser l'horloge à la fin — et que
 * l'ensemble tourne sur le thread UI sans un seul rendu React pendant la séquence.
 *
 * **Aucun `setState` dans une boucle.** Les compteurs numériques passent par
 * `useAnimatedProps` sur un `TextInput` : c'est le seul moyen d'écrire du texte depuis un
 * worklet, `Animated.Text` n'anime pas son contenu.
 *
 * Le retour vers JS est réservé à l'haptique, via `scheduleOnRN` — `runOnJS` est déprécié
 * depuis Reanimated 4.
 */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Ramp = { input: number[]; output: number[] };

/** Deux points d'interpolation ne peuvent pas être confondus : l'entrée doit croître. */
function strictlyIncreasing(ramp: Ramp): Ramp {
  const input: number[] = [];
  const output: number[] = [];

  ramp.input.forEach((value, index) => {
    const previous = input[input.length - 1];
    if (previous === undefined || value > previous) {
      input.push(value);
      output.push(ramp.output[index]);
      return;
    }
    // Même instant : c'est la dernière valeur qui compte.
    output[output.length - 1] = ramp.output[index];
  });

  return { input, output };
}

export function RewardSummaryView({ summary }: { summary: RewardSummary }) {
  const timeline = useMemo(() => buildTimeline(summary), [summary]);
  const clock = useSharedValue(0);

  const xpBeats = timeline.beats.filter((beat) => beat.kind === 'xpLine');
  const levelBeats = timeline.beats.filter((beat) => beat.kind === 'level');
  const sessionBeat = timeline.beats.find((beat) => beat.kind === 'session')!;

  /**
   * La course de la barre d'XP, d'un bout à l'autre de la séquence.
   *
   * Elle monte ligne à ligne pendant la phase XP — en redescendant sur les lignes négatives,
   * c'est le cas `plat` — puis, à chaque niveau franchi, elle retombe à zéro et repart. Ce
   * dent-de-scie est la mise en scène du level up : buter en haut, basculer, repartir.
   */
  const bar = useMemo<Ramp>(() => {
    const input = [0, sessionBeat.until];
    const output = [timeline.fillBefore, timeline.fillBefore];

    xpBeats.forEach((beat, index) => {
      input.push(beat.until);
      output.push(timeline.fills[index]);
    });

    if (xpBeats.length > 0) {
      const settle = timeline.beats.find(
        (beat) => beat.kind === 'rest' && beat.at === xpBeats[xpBeats.length - 1].until,
      );
      if (settle) {
        input.push(settle.until);
        output.push(timeline.fillPeak);
      }
    }

    levelBeats.forEach((beat, index) => {
      const last = index === levelBeats.length - 1;
      input.push(beat.at + 1, beat.until);
      output.push(0, last ? timeline.fillAfter : 1);
    });

    input.push(timeline.duration);
    output.push(timeline.fillAfter);

    return strictlyIncreasing({ input, output });
  }, [timeline, sessionBeat, xpBeats, levelBeats]);

  /** Le compteur d'XP suit exactement le cumul du breakdown, ligne à ligne. */
  const counter = useMemo<Ramp>(() => {
    const input = [0, sessionBeat.until];
    const output = [0, 0];

    xpBeats.forEach((beat, index) => {
      input.push(beat.until);
      output.push(timeline.cumulative[index]);
    });

    input.push(timeline.duration);
    output.push(summary.xp.awarded);

    return strictlyIncreasing({ input, output });
  }, [timeline, sessionBeat, xpBeats, summary.xp.awarded]);

  const play = () => {
    clock.value = 0;
    clock.value = withTiming(timeline.duration, {
      duration: timeline.duration,
      easing: Easing.linear,
    });
  };

  const skip = () => {
    cancelAnimation(clock);
    clock.value = timeline.duration;
  };

  // Le seul aller-retour vers JS de toute la séquence : un choc par niveau franchi.
  const levelStarts = levelBeats.map((beat) => beat.at);
  useAnimatedReaction(
    () => levelStarts.filter((at) => clock.value >= at).length,
    (crossed, previous) => {
      if (previous !== null && crossed > previous) {
        scheduleOnRN(Haptics.notificationAsync, Haptics.NotificationFeedbackType.Success);
      }
    },
  );

  const sessionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0, sessionBeat.until], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(clock.value, [0, sessionBeat.until], [0.94, 1], Extrapolation.CLAMP) },
    ],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(clock.value, bar.input, bar.output, Extrapolation.CLAMP) * 100}%`,
  }));

  const counterProps = useAnimatedProps(() => {
    const value = Math.round(interpolate(clock.value, counter.input, counter.output, Extrapolation.CLAMP));
    const text = `${value > 0 ? '+' : ''}${value}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <Pressable style={styles.screen} onPress={skip} onLayout={play}>
      {/* 1. `session` — la séance se referme. */}
      <Animated.View style={[styles.card, sessionStyle]}>
        <Text style={styles.label}>{disciplineLabel[summary.session.discipline]}</Text>
        <Text style={styles.duration}>
          {Math.round((summary.session.durationSeconds ?? 0) / 60)} min
        </Text>
      </Animated.View>

      {/* 2. `xp` — le compteur et la barre, puis le détail ligne à ligne. */}
      <AnimatedTextInput
        style={styles.counter}
        editable={false}
        animatedProps={counterProps}
        defaultValue="0"
      />

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>

      <View style={styles.breakdown}>
        {summary.xp.breakdown.map((line, index) => (
          <BreakdownRow
            key={`${line.source}-${index}`}
            clock={clock}
            at={xpBeats[index].at}
            until={xpBeats[index].until}
            label={xpSourceLabel[line.source]}
            amount={line.amount}
          />
        ))}
      </View>

      {/* 3. `level` — un basculement par niveau franchi. */}
      <View style={styles.levels}>
        {summary.level.reached.map((level, index) => (
          <LevelFlip
            key={level}
            clock={clock}
            at={levelBeats[index].at}
            until={levelBeats[index].until}
            level={level}
          />
        ))}
      </View>

      {/* 4. `titlesUnlocked` — le titre tombe. */}
      <View style={styles.titles}>
        {summary.titlesUnlocked.map((title, index) => {
          const beat = timeline.beats.filter((b) => b.kind === 'title')[index];
          return (
            <TitleDrop
              key={title.id}
              clock={clock}
              at={beat.at}
              until={beat.until}
              name={title.name}
            />
          );
        })}
      </View>

      {/* 5. `loot`, `streak`, `unlockableNodes` — présents et vides jusqu'aux Lots 6, 5 et 7. */}

      <Text style={styles.ruleset}>{summary.rulesetVersion}</Text>
    </Pressable>
  );
}

type BeatProps = {
  clock: ReturnType<typeof useSharedValue<number>>;
  at: number;
  until: number;
};

function BreakdownRow({ clock, at, until, label, amount }: BeatProps & { label: string; amount: number }) {
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
      { scale: interpolate(clock.value, [at, at + 200, until], [0.6, 1.15, 1], Extrapolation.CLAMP) },
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
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  label: { ...type.label, color: color.textMuted },
  duration: { ...type.title, color: color.text },
  counter: { ...type.display, color: color.accent, padding: 0 },
  barTrack: {
    height: 14,
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: color.accent, borderRadius: radius.pill },
  breakdown: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...type.body, color: color.textMuted },
  rowAmount: { ...type.body },
  levels: { flexDirection: 'row', gap: space.sm },
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
  ruleset: { ...type.label, color: color.textMuted, marginTop: 'auto' },
});
