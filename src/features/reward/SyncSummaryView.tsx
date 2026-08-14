import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
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

import { BreakdownRow } from '@/components/BreakdownRow';
import { SessionCard } from '@/components/SessionCard';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar, xpBarFill } from '@/components/XpBar';
import {
  color,
  curve,
  duration,
  radius,
  scale,
  skipReasonLabel,
  space,
  travel,
  type,
} from '@/design/tokens';
import { formatDuration } from '@/features/progression/format';
import {
  buildTimeline,
  type RewardSummary,
  type SkippedWorkout,
  type SyncSummary,
} from './timeline';

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
 *
 * Ce qu'il ne fait plus non plus : **dessiner**. La carte de séance, la barre, la ligne de
 * breakdown et le badge de titre viennent du design system, et cet écran n'en garde que le
 * mouvement. Les deux se séparent proprement parce que rien du design system ne connaît
 * Reanimated : l'animé enveloppe le dessiné, jamais l'inverse.
 */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Les courbes, montées une fois.
 *
 * `Easing.bezierFn` rend la fonction elle-même, là où `Easing.bezier` rend la fabrique
 * qu'attend `withTiming` : ici la courbe s'applique **dans** un worklet, sur une progression
 * déjà normalisée, et pas à une animation. Les quatre nombres, eux, sont des tokens — la
 * même courbe sert la preview HTML, en `cubic-bezier(…)`.
 */
const easeEnter = Easing.bezierFn(...curve.enter);
const easeCelebrate = Easing.bezierFn(...curve.celebrate);

export function SyncSummaryView({
  summary,
  onDismiss,
}: {
  summary: SyncSummary;
  /**
   * Sortir. Le composant dit **quand** le joueur veut partir, la route décide de ce que
   * ça veut dire — une animation ne connaît pas la pile de navigation.
   */
  onDismiss?: () => void;
}) {
  const timeline = useMemo(() => buildTimeline(summary), [summary]);
  const clock = useSharedValue(0);

  /**
   * La séquence est-elle arrivée au bout.
   *
   * C'est le **seul** `setState` de tout l'écran, et il tombe une fois, à la fin. La règle
   * du fichier interdit la boucle, pas l'événement terminal : rendre l'affordance de sortie
   * demande un rendu React, et il n'y en a qu'un.
   */
  const [done, setDone] = useState(false);

  const digest = timeline.beats.find((beat) => beat.kind === 'digest');
  const skipped = timeline.beats.find((beat) => beat.kind === 'skipped');

  const play = () => {
    setDone(false);
    clock.value = 0;
    clock.value = withTiming(
      timeline.duration,
      { duration: timeline.duration, easing: Easing.linear },
      (finished) => {
        'worklet';
        // `finished` est faux quand `cancelAnimation` est passé par là — c'est le saut, qui
        // marque la fin lui-même. Sans ce test, le rappel du saut écraserait son propre état.
        if (finished === true) {
          scheduleOnRN(setDone, true);
        }
      },
    );
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
    setDone(true);
  };

  /**
   * Le geste unique de l'écran : **sauter tant qu'il reste à sauter, puis sortir**.
   *
   * C'est ce qu'un joueur fait sans qu'on le lui dise — il tape pour accélérer, il tape pour
   * partir. Réserver la sortie à un bouton laisserait le premier réflexe sans effet, ce qui
   * est exactement ce qui faisait de cet écran un cul-de-sac.
   */
  const touch = () => {
    if (done) {
      onDismiss?.();
      return;
    }

    skip();
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
    <Pressable style={styles.screen} onPress={touch} onLayout={play}>
      {/* La tête de l'écran : une seule course d'XP pour tout le lot. Elle ne se remet jamais
          à zéro entre deux séances — c'est ce qui fait de la synchronisation un moment, et
          non trois animations à la suite. */}
      <AnimatedTextInput
        style={styles.counter}
        editable={false}
        animatedProps={counterProps}
        defaultValue="0"
      />

      {/* La barre du design system, remplie par le séquenceur : la piste et le masque
          viennent du composant, le remplissage d'une valeur partagée. */}
      <XpBar size="hero">
        <Animated.View style={[xpBarFill, barStyle]} />
      </XpBar>

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

      {/* L'affordance de sortie, qui n'apparaît qu'à la fin. « Taper pour sortir » n'est
          pas devinable, et pendant la séquence ce serait une invitation à la manquer. */}
      {done && onDismiss !== undefined ? (
        <Text style={styles.exit}>Toucher pour continuer</Text>
      ) : null}

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
      [segment.at, opening.until, segment.until - duration.handoff, segment.until],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View style={[styles.block, style]} pointerEvents="none">
      <SessionCard
        discipline={workout.session.discipline}
        duration={formatDuration(workout.session.durationSeconds)}
      />

      <View style={styles.breakdown}>
        {workout.xp.breakdown.map((line, position) => (
          <LineEntry
            key={`${line.source}-${position}`}
            clock={clock}
            at={lines[position].at}
            until={lines[position].until}
          >
            <BreakdownRow source={line.source} amount={line.amount} />
          </LineEntry>
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
  const style = useAnimatedStyle(() => {
    const entered = easeEnter(
      interpolate(clock.value, [at, at + duration.enter], [0, 1], Extrapolation.CLAMP),
    );

    return {
      opacity: interpolate(clock.value, [at, at + duration.pop], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: travel.rise * (1 - entered) }],
    };
  });

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
  const style = useAnimatedStyle(() => {
    const grown = easeCelebrate(
      interpolate(clock.value, [at, at + duration.pop], [0, 1], Extrapolation.CLAMP),
    );

    return {
      opacity: interpolate(clock.value, [at, at + duration.glint], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: scale.from + (1 - scale.from) * grown }],
    };
  });

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
          {entry.activityType} · {skipReasonLabel[entry.reason]}
        </Text>
      ))}
    </Animated.View>
  );
}

/**
 * L'entrée d'une ligne de breakdown : elle glisse depuis la droite, dans l'ordre du calcul.
 *
 * Le composant n'enveloppe que le mouvement. Ce qui est *dessiné* — le libellé de la source,
 * le signe, la couleur du gain ou de la perte — appartient au design system, et cet écran
 * n'a pas à en connaître un seul pixel.
 */
function LineEntry({ clock, at, until, children }: BeatProps & { children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const entered = easeEnter(interpolate(clock.value, [at, until], [0, 1], Extrapolation.CLAMP));

    return {
      opacity: entered,
      transform: [{ translateX: travel.slide * (1 - entered) }],
    };
  });

  return <Animated.View style={style}>{children}</Animated.View>;
}

function LevelFlip({ clock, at, until, level }: BeatProps & { level: number }) {
  const style = useAnimatedStyle(() => {
    // Le dépassement vient de la courbe, pas d'une rampe à trois points : `celebrate` monte
    // au-dessus de 1 puis revient, ce qui *est* la définition d'un basculement qui claque.
    const flipped = easeCelebrate(
      interpolate(clock.value, [at, until], [0, 1], Extrapolation.CLAMP),
    );

    return {
      opacity: interpolate(clock.value, [at, at + duration.tap], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: scale.from + (1 - scale.from) * flipped }],
    };
  });

  return (
    <Animated.View style={[styles.levelBadge, style]}>
      <Text style={styles.levelLabel}>NIVEAU</Text>
      <Text style={styles.levelValue}>{level}</Text>
    </Animated.View>
  );
}

function TitleDrop({ clock, at, until, name }: BeatProps & { name: string }) {
  const style = useAnimatedStyle(() => {
    const dropped = easeEnter(interpolate(clock.value, [at, until], [0, 1], Extrapolation.CLAMP));

    return {
      opacity: interpolate(clock.value, [at, at + duration.glint], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: -travel.drop * (1 - dropped) }],
    };
  });

  return (
    <Animated.View style={style}>
      <TitleBadge name={name} caption="Titre débloqué" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background, padding: space.lg, gap: space.md },
  counter: { ...type.display, color: color.accent, padding: 0 },
  /** Les blocs de détail se superposent : un seul est lisible à la fois. */
  stage: { flex: 1 },
  // Position explicite plutôt que `StyleSheet.absoluteFill` : les blocs se superposent dans
  // `stage`, et écrire les quatre bords ici évite de dépendre d'un helper dont le type a
  // bougé d'une version de React Native à l'autre.
  block: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, gap: space.md },
  label: { ...type.label, color: color.textMuted },
  breakdown: { gap: space.sm },
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
  digest: { alignItems: 'center', justifyContent: 'center' },
  digestCount: { ...type.display, color: color.text },
  skipped: { gap: space.xs },
  skippedRow: { ...type.body, color: color.textMuted },
  exit: { ...type.body, color: color.text, textAlign: 'center' },
  ruleset: { ...type.label, color: color.textMuted },
});
