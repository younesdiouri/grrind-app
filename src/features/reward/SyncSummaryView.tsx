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
 * worklet, `Animated.Text` n'anime pas son contenu. La valeur du niveau qui bascule s'écrit
 * de la même façon — un seul élément, dont le chiffre change, plutôt qu'un badge par palier.
 *
 * Le retour vers JS est réservé à l'haptique, via `scheduleOnRN` — `runOnJS` est déprécié
 * depuis Reanimated 4.
 *
 * ————— La lecture, de haut en bas ——————————————————————————————————————————————————————
 *
 * L'écran se lit en trois temps, et chacun chasse le précédent. **L'attente** — la barre est
 * posée sur le palier du joueur, la séance monte. **Le calcul** — les lignes tombent, la
 * barre suit, elle bute en haut et l'or la traverse. **Le palier** — le détail sort, le
 * niveau prend tout le cadre, le titre tombe dedans. Rien ne cohabite : deux choses à lire
 * en même temps, c'est aucune des deux qui est lue.
 *
 * Ce que ce composant **ne fait pas** : construire les rampes, ni dessiner. Les premières
 * vivent dans `timeline.ts`, le dessin dans le design system. Il ne garde que le mouvement.
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

  /**
   * Rien n'a été crédité.
   *
   * `totals` vaut `null` — le serveur refuse d'écrire « 0 XP » à un joueur qui n'a rien
   * gagné, et le client n'invente pas ce zéro. L'écran change alors de nature : ce n'est
   * plus une course, c'est un compte rendu. Il n'y a donc **pas de barre du tout** ; une
   * piste vide promettrait une course qui n'a pas eu lieu.
   */
  const nothingCredited = timeline.totals === null;

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
  // compris. Les instants viennent de la timeline, qui les connaît déjà — les recalculer ici
  // remettrait la trigonométrie du condensé dans le composant.
  useAnimatedReaction(
    () => timeline.crossings.filter((at) => clock.value >= at).length,
    (crossed, previous) => {
      if (previous !== null && crossed > previous) {
        scheduleOnRN(Haptics.notificationAsync, Haptics.NotificationFeedbackType.Success);
      }
    },
  );

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(clock.value, timeline.bar.input, timeline.bar.output, Extrapolation.CLAMP) * 100}%`,
  }));

  /**
   * L'or de la butée.
   *
   * Le calque vit **dans** le remplissage, pas dans la piste : posé sur la piste, il
   * ferait clignoter en or toute la largeur de l'écran au moment où la barre repart de zéro.
   */
  const crestStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      timeline.crest.input,
      timeline.crest.output,
      Extrapolation.CLAMP,
    ),
  }));

  const counterProps = useAnimatedProps(() => {
    const value = Math.round(
      interpolate(clock.value, timeline.counter.input, timeline.counter.output, Extrapolation.CLAMP),
    );
    const text = `${value > 0 ? '+' : ''}${value}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  /** Un éclat d'échelle sur le compteur à chaque franchissement, calé sur la même crête. */
  const counterStyle = useAnimatedStyle(() => {
    const crest = interpolate(
      clock.value,
      timeline.crest.input,
      timeline.crest.output,
      Extrapolation.CLAMP,
    );

    return { transform: [{ scale: 1 + crest * (scale.glint - 1) }] };
  });

  return (
    <Pressable style={styles.screen} onPress={touch} onLayout={play}>
      {/* La tête de l'écran : une seule course d'XP pour tout le lot. Elle ne se remet jamais
          à zéro entre deux séances — c'est ce qui fait de la synchronisation un moment, et
          non trois animations à la suite. */}
      <Animated.View style={counterStyle}>
        <AnimatedTextInput
          style={[styles.counter, nothingCredited && styles.counterQuiet]}
          editable={false}
          animatedProps={counterProps}
          defaultValue="0"
        />
      </Animated.View>

      {nothingCredited ? (
        <View style={styles.verdict}>
          <Text style={styles.label}>Rien de crédité</Text>
          <Text style={styles.label}>
            {summary.skipped.length} séance{summary.skipped.length > 1 ? 's' : ''} lue
            {summary.skipped.length > 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        /* La barre du design system, remplie par le séquenceur : la piste et le masque
           viennent du composant, le remplissage d'une valeur partagée. */
        <XpBar size="hero">
          <Animated.View style={[xpBarFill, barStyle]}>
            <Animated.View style={[styles.crest, crestStyle]} />
          </Animated.View>
        </XpBar>
      )}

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

        {/* Le palier, par-dessus tout le reste : il chasse le détail au lieu de s'y ranger. */}
        {timeline.segments
          .filter((segment) => summary.imported[segment.workout].level.reached.length > 0)
          .map((segment) => (
            <LevelStage
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
type Timeline = ReturnType<typeof buildTimeline>;
type Segment = Timeline['segments'][number];

/**
 * Deux instants qui doivent rester dans l'ordre.
 *
 * Une rampe dont l'entrée ne croît pas strictement rend n'importe quoi, et les fenêtres
 * d'ici se calculent sur des battements dont on ne contrôle pas la longueur — une séance
 * sans breakdown collerait le basculement à l'ouverture. Un millième de seconde d'écart
 * suffit à garantir la lecture ; il ne se voit pas.
 */
function after(instant: number, floor: number): number {
  return Math.max(instant, floor + 1);
}

/**
 * Le détail d'une séance : sa carte et son breakdown.
 *
 * Le bloc monte pendant l'anticipation, tient le temps du calcul, puis **sort** — chassé par
 * le basculement s'il y en a un, par la séance suivante sinon. Les niveaux et les titres ne
 * sont plus ici : ils ont leur propre couche, plein cadre.
 */
function WorkoutDetail({
  clock,
  timeline,
  segment,
  workout,
}: {
  clock: Clock;
  timeline: Timeline;
  segment: Segment;
  workout: RewardSummary;
}) {
  const index = segment.workout;
  const lines = timeline.beats.filter((beat) => beat.kind === 'xpLine' && beat.workout === index);
  const levels = timeline.beats.filter((beat) => beat.kind === 'level' && beat.workout === index);
  const opening = timeline.beats.find((beat) => beat.kind === 'session' && beat.workout === index)!;

  const settled = after(opening.until, segment.at);
  const exit = after(levels[0]?.at ?? segment.until, settled + duration.handoff);

  const style = useAnimatedStyle(() => {
    const entered = easeEnter(
      interpolate(clock.value, [segment.at, settled], [0, 1], Extrapolation.CLAMP),
    );

    return {
      opacity: interpolate(
        clock.value,
        [segment.at, settled, exit - duration.handoff, exit],
        [0, 1, 1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [{ translateY: travel.rise * (1 - entered) }],
    };
  });

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

      {/* `loot`, `streak`, `unlockableNodes` — présents et vides jusqu'aux Lots 6, 5 et 7. */}
    </Animated.View>
  );
}

/**
 * Le palier, plein cadre.
 *
 * C'est le temps fort, et il prend tout : le détail sort, le niveau s'installe au centre, le
 * titre tombe dedans, le point de compétence suit. Le rendre à côté du breakdown, comme
 * avant, en faisait une ligne de plus dans une liste — un badge parmi des chiffres.
 *
 * **Un seul élément pour tous les paliers.** Franchir deux niveaux d'un coup est un cas
 * normal ; monter un badge par palier les empilerait à l'écran alors qu'ils se succèdent
 * dans le temps. Le chiffre s'écrit donc par `useAnimatedProps`, comme le compteur.
 */
function LevelStage({
  clock,
  timeline,
  segment,
  workout,
}: {
  clock: Clock;
  timeline: Timeline;
  segment: Segment;
  workout: RewardSummary;
}) {
  const index = segment.workout;
  const levels = timeline.beats.filter((beat) => beat.kind === 'level' && beat.workout === index);
  const titles = timeline.beats.filter((beat) => beat.kind === 'title' && beat.workout === index);

  const at = levels[0].at;
  const until = after(segment.until, at + duration.handoff * 2);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      [at, at + duration.handoff, until - duration.handoff, until],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Le point de compétence arrive après le dernier titre — ou après le dernier palier quand
  // il n'y a pas de titre. Il est **par séance**, pas par niveau : le contrat rend un seul
  // nombre face à un tableau de paliers, et le répartir serait une règle de jeu que le
  // client n'a pas à inventer.
  const granted = workout.level.skillPointsGranted;
  const grantedAt = (titles[titles.length - 1] ?? levels[levels.length - 1]).until;

  return (
    <Animated.View style={[styles.block, styles.podium, style]} pointerEvents="none">
      <LevelFlip
        clock={clock}
        starts={levels.map((beat) => beat.at)}
        ends={levels.map((beat) => beat.until)}
        values={workout.level.reached}
      />

      {workout.titlesUnlocked.map((title, position) => (
        <TitleDrop
          key={title.id}
          clock={clock}
          at={titles[position].at}
          until={titles[position].until}
          name={title.name}
        />
      ))}

      {granted > 0 ? (
        <Grant clock={clock} at={grantedAt} until={grantedAt + duration.glint} count={granted} />
      ) : null}
    </Animated.View>
  );
}

function LevelFlip({
  clock,
  starts,
  ends,
  values,
}: {
  clock: Clock;
  starts: number[];
  ends: number[];
  values: number[];
}) {
  /** Le palier en cours : le dernier dont l'instant est passé. */
  const current = (at: number) => {
    'worklet';
    let index = 0;
    for (let i = 0; i < starts.length; i += 1) {
      if (at >= starts[i]) {
        index = i;
      }
    }

    return index;
  };

  const style = useAnimatedStyle(() => {
    const index = current(clock.value);
    // Le dépassement vient de la courbe, pas d'une rampe à trois points : `celebrate` monte
    // au-dessus de 1 puis revient, ce qui *est* la définition d'un basculement qui claque.
    const flipped = easeCelebrate(
      interpolate(clock.value, [starts[index], ends[index]], [0, 1], Extrapolation.CLAMP),
    );

    return { transform: [{ scale: scale.from + (1 - scale.from) * flipped }] };
  });

  const valueProps = useAnimatedProps(() => {
    const text = `${values[current(clock.value)]}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <Animated.View style={[styles.flip, style]}>
      <Text style={styles.flipLabel}>NIVEAU</Text>
      <AnimatedTextInput
        style={styles.flipValue}
        editable={false}
        animatedProps={valueProps}
        defaultValue={`${values[0]}`}
      />
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
    <Animated.View style={[styles.grown, style]}>
      <TitleBadge name={name} caption="Titre débloqué" />
    </Animated.View>
  );
}

/** Le point de compétence accordé. Discret : il se dépensera ailleurs, il ne se fête pas ici. */
function Grant({ clock, at, until, count }: BeatProps & { count: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [at, until], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={style}>
      <Text style={styles.grant}>
        {count} POINT{count > 1 ? 'S' : ''} DE COMPÉTENCE
      </Text>
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
    <Animated.View style={[styles.block, styles.podium, style]} pointerEvents="none">
      <Text style={styles.digestCount}>+{count}</Text>
      <Text style={styles.label}>{count > 1 ? 'autres séances' : 'autre séance'}</Text>

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
 * Les séances écartées, **nommées** et une par une.
 *
 * Le contrat rend `activityType` et `reason` par séance justement pour ça : « le curling
 * n'est pas encore un sport chez nous » est une phrase, « 1 séance ignorée » n'en est pas
 * une. Elles s'échelonnent au lieu de paraître d'un bloc — c'est ce qui donne à lire une
 * liste plutôt qu'un pavé, et c'est l'essentiel de l'écran quand rien n'a été crédité.
 */
function Skipped({ clock, at, until, entries }: BeatProps & { entries: SkippedWorkout[] }) {
  const step = (until - at) / entries.length;

  return (
    <View style={styles.skipped} pointerEvents="none">
      {entries.map((entry, index) => (
        <SkippedRow
          key={entry.externalId}
          clock={clock}
          at={at + step * index}
          until={at + step * (index + 1)}
          entry={entry}
        />
      ))}
    </View>
  );
}

function SkippedRow({ clock, at, until, entry }: BeatProps & { entry: SkippedWorkout }) {
  const style = useAnimatedStyle(() => {
    const entered = easeEnter(interpolate(clock.value, [at, until], [0, 1], Extrapolation.CLAMP));

    return {
      opacity: entered,
      transform: [{ translateX: travel.slide * (1 - entered) }],
    };
  });

  return (
    <Animated.View style={[styles.skippedRow, style]}>
      <Text style={styles.skippedType}>{entry.activityType}</Text>
      <Text style={styles.skippedReason}>{skipReasonLabel[entry.reason]}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background, padding: space.lg, gap: space.md },
  counter: { ...type.display, color: color.accent, padding: 0 },
  /** Rien n'a été gagné : `accent` voudrait dire le contraire. */
  counterQuiet: { color: color.textMuted },
  crest: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.celebrate,
  },
  verdict: { gap: space.xs },
  /** Les blocs de détail se superposent : un seul est lisible à la fois. */
  stage: { flex: 1 },
  // Position explicite plutôt que `StyleSheet.absoluteFill` : les blocs se superposent dans
  // `stage`, et écrire les quatre bords ici évite de dépendre d'un helper dont le type a
  // bougé d'une version de React Native à l'autre.
  block: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, gap: space.md },
  podium: { alignItems: 'center', justifyContent: 'center' },
  label: { ...type.label, color: color.textMuted },
  breakdown: { gap: space.sm },
  // `alignSelf: 'stretch'` et non `alignItems: 'center'` : un `TextInput` n'a pas la largeur
  // de son contenu comme un `Text`. Centré par son parent, il se réduirait à rien — c'est le
  // chiffre du palier qui disparaîtrait. On lui donne toute la largeur, et on centre le texte.
  flip: { alignSelf: 'stretch', gap: space.xs },
  flipLabel: { ...type.label, color: color.textMuted, textAlign: 'center' },
  flipValue: { ...type.display, color: color.celebrate, padding: 0, textAlign: 'center' },
  grant: { ...type.label, color: color.textMuted, textAlign: 'center' },
  /** Le titre tombe **dans** la couche du palier, et prend sa largeur. */
  grown: { alignSelf: 'stretch' },
  levels: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  levelBadge: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  levelValue: { ...type.title, color: color.celebrate },
  digestCount: { ...type.display, color: color.text },
  skipped: { gap: space.xs },
  skippedRow: { flexDirection: 'row', gap: space.sm, alignItems: 'baseline' },
  skippedType: { ...type.body, color: color.text },
  skippedReason: { ...type.body, color: color.textMuted, flexShrink: 1 },
  exit: { ...type.body, color: color.text, textAlign: 'center' },
  ruleset: { ...type.label, color: color.textMuted },
});
