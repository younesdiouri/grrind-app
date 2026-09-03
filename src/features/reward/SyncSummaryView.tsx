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
import { Circle } from 'react-native-svg';

import { AttributeLegend, AttributeRing } from '@/components/AttributeRing';
import { arcStroke, arcsOf, ATTRIBUTE_ORDER, ringGeometry, type RingGeometry } from '@/components/attributeArcs';
import { BreakdownRow } from '@/components/BreakdownRow';
import { CoinAmount } from '@/components/CoinAmount';
import { CoinIcon } from '@/components/CoinIcon';
import { ItemCard } from '@/components/ItemCard';
import { NoCreditRow } from '@/components/NoCreditRow';
import { SessionCard } from '@/components/SessionCard';
import { TitleBadge } from '@/components/TitleBadge';
import { vitalityFontSize } from '@/components/vitalityFontSize';
import { XpBar, xpBarFill } from '@/components/XpBar';
import { decorativeGlow } from '@/design/decorativeGlow';
import {
  attributeColor,
  color,
  curve,
  duration,
  radius,
  scale,
  skipReasonLabel,
  space,
  travel,
  type,
  xpNoCreditReasonLabel,
  type Attribute,
} from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { formatDuration } from '@/features/progression/format';
import {
  buildTimeline,
  type Beat,
  type DroppedItem,
  type RewardSummary,
  type SkippedWorkout,
  type SyncSummary,
  type SyncTotals,
  type XpNoCreditReason,
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
 * L'écran se lit en cinq temps, et chacun chasse le précédent — sauf le dernier.
 * **L'attente** — la barre est posée sur le palier du joueur, la séance monte. **Le calcul** —
 * les lignes tombent, la barre suit, elle bute en haut et l'or la traverse. **Le palier** — le
 * détail sort, le niveau prend tout le cadre, le titre tombe dedans. **Le loot** (#226) — un
 * objet se pose, la bourse l'encaisse, de son avant à son après. Rien ne cohabite : deux
 * choses à lire en même temps, c'est aucune des deux qui est lue.
 *
 * **Puis le bilan** (#79), et lui ne sort pas. C'est la moitié qui manquait : chaque bloc était
 * écrit pour être chassé, personne ne reprenait la main à la fin, et l'écran finissait nu au
 * moment exact où le joueur venait chercher ce qu'il avait gagné. Voir `Recap`.
 *
 * Chaque temps a par ailleurs gagné son **temps de lecture** (`BEATS.dwell`, dans
 * `timeline.ts`) : un bloc se construisait puis sortait aussitôt sa dernière ligne posée.
 *
 * Ce que ce composant **ne fait pas** : construire les rampes, ni dessiner. Les premières
 * vivent dans `timeline.ts`, le dessin dans le design system. Il ne garde que le mouvement.
 */
/**
 * Combien de titres le bilan montre avant de les compter.
 *
 * Deux badges tiennent sous l'anneau sur un iPhone ; le troisième pousse les comptes hors de
 * l'écran. Un titre est un événement rare — en débloquer trois d'un coup veut dire qu'on
 * revient de vacances, et c'est exactement le lot où le bilan doit rester lisible.
 */
const RECAP_TITLES = 2;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  const reducedMotion = useReducedMotion();
  const eventGlow = decorativeGlow('lit', reducedMotion);
  const levelGlow = decorativeGlow('flare', reducedMotion);

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
  const recap = timeline.beats.find((beat) => beat.kind === 'recap');
  /** Le dernier workout crédité : c'est son état d'après que le bilan montre. */
  const last = summary.imported[summary.imported.length - 1];

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
          style={[
            styles.counter,
            nothingCredited && styles.counterQuiet,
            eventGlow === undefined
              ? undefined
              : {
                  textShadowColor: eventGlow.textShadowColor,
                  textShadowRadius: eventGlow.textShadowRadius,
                },
          ]}
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

        {/* Les cinq jauges, entre le breakdown et le niveau : elle chasse le détail, le
            niveau la chasse à son tour — rien ne cohabite. */}
        {timeline.segments.map((segment) => (
          <AttributeStage
            key={segment.workout}
            clock={clock}
            timeline={timeline}
            segment={segment}
            workout={summary.imported[segment.workout]}
            halo={eventGlow}
          />
        ))}

        {/* Le palier, par-dessus tout le reste : il chasse le détail au lieu de s'y ranger.
            Monté dès qu'un niveau bascule **ou** qu'un titre tombe seul (`avecLoot`, #226) —
            un titre sans niveau reste un événement à montrer, pas un cas à sauter. */}
        {timeline.segments
          .filter((segment) => {
            const workout = summary.imported[segment.workout];
            return workout.level.reached.length > 0 || workout.titlesUnlocked.length > 0;
          })
          .map((segment) => (
            <LevelStage
              key={segment.workout}
              clock={clock}
              timeline={timeline}
              segment={segment}
              workout={summary.imported[segment.workout]}
              halo={levelGlow}
            />
          ))}

        {/* Le loot, puis la bourse — juste après le palier, avant le condensé ou le bilan. */}
        {timeline.segments
          .filter((segment) => {
            const workout = summary.imported[segment.workout];
            return workout.loot.length > 0 || workout.coins.gained > 0;
          })
          .map((segment) => (
            <LootStage
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

        {/* Le bilan, par-dessus tout ce qui vient de sortir — et qui **reste**. */}
        {recap === undefined || timeline.totals === null || last === undefined ? null : (
          <Recap
            clock={clock}
            at={recap.at}
            totals={timeline.totals}
            attributes={last.attributes}
            titles={summary.imported.flatMap((workout) => workout.titlesUnlocked)}
            // Le condensé ne rejoue aucun objet un par un, mais aucun ne se perd : le bilan
            // liste ceux du lot entier, détail et condensé confondus (#226).
            loot={summary.imported.flatMap((workout) => workout.loot)}
            coins={{ before: summary.imported[0].coins.before, after: last.coins.after }}
            skippedCount={summary.skipped.length}
            noCredit={soleReason(summary)}
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
 * les cinq jauges, qui prennent le relais juste après le breakdown. Les niveaux et les
 * titres ne sont plus ici : ils ont leur propre couche, plein cadre.
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
  const opening = timeline.beats.find((beat) => beat.kind === 'session' && beat.workout === index)!;
  // Prédicat de type et non simple booléen : `Array.find` ne réduit pas l'union toute seule,
  // et c'est `reason` qu'on vient chercher ici — les autres recherches de ce fichier ne lisent
  // que `at`/`until`, communs à tous les battements, d'où la différence.
  const noCredit = timeline.beats.find(
    (beat): beat is Extract<Beat, { kind: 'noCredit' }> =>
      beat.kind === 'noCredit' && beat.workout === index,
  );
  // **Optionnel depuis le #80** : une séance qui ne rapporte rien ne redistribue rien, donc
  // elle n'a pas de battement de jauges. Le bloc tient alors jusqu'à la fin de son segment —
  // il n'y a rien derrière pour le chasser, et la raison est ce qu'il reste à lire.
  const attributesBeat = timeline.beats.find((beat) => beat.kind === 'attributes' && beat.workout === index);

  const settled = after(opening.until, segment.at);
  const exit = after(attributesBeat?.at ?? segment.until, settled + duration.handoff);

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
    <Animated.View style={[styles.block, style]}>
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

        {/* Ou la raison, quand il n'y a pas eu de calcul — même mouvement d'entrée qu'une
            ligne, à la place exacte qu'elles auraient prise. Le client ne déduit rien d'un
            breakdown vide : il lit `xp.reason`, que le serveur envoie pour ça. */}
        {noCredit === undefined ? null : (
          <LineEntry clock={clock} at={noCredit.at} until={noCredit.until}>
            <NoCreditRow reason={noCredit.reason} />
          </LineEntry>
        )}
      </View>

      {/* `loot`, `streak`, `unlockableNodes` — présents et vides jusqu'aux Lots 6, 5 et 7. */}
    </Animated.View>
  );
}

/**
 * Les cinq jauges, plein cadre — sur le modèle de `LevelStage` : elle paraît, elle est
 * chassée. Les quatre arcs sont **redistribués en direct** : `arcsOf` (#69), désormais
 * marquée `'worklet'`, relit les quatre valeurs *courantes* de la timeline à chaque image
 * plutôt qu'un instantané figé — c'est ce qui rend visible que Vitality est la conséquence
 * d'un équilibre, pas d'un cinquième gain.
 *
 * Vitality compte au centre par `useAnimatedProps`, comme le compteur d'XP et le chiffre du
 * palier. Sa taille de police se calcule **une fois**, sur l'`after` de la Vitality de **ce**
 * workout — jamais sur le compte en cours (#70) : la recalculer à chaque image ferait sauter
 * la police pendant que le nombre grandit.
 */
function AttributeStage({
  clock,
  timeline,
  segment,
  workout,
  halo,
}: {
  clock: Clock;
  timeline: Timeline;
  segment: Segment;
  workout: RewardSummary;
  halo: ReturnType<typeof decorativeGlow>;
}) {
  const index = segment.workout;
  const beat = timeline.beats.find((b) => b.kind === 'attributes' && b.workout === index);
  const geometry = ringGeometry('hero');
  const fontSize = vitalityFontSize(workout.attributes.vitality.after, geometry.innerDiameter, type.display.fontSize);

  // La fenêtre est lue **avant** le worklet, jamais dedans : un `beat` absent (#80) doit
  // pouvoir sortir du composant, et un `return` conditionnel ne peut pas suivre un hook.
  const window = beat ?? { at: 0, until: 0 };

  const style = useAnimatedStyle(() => ({
    opacity:
      window.until === 0
        ? 0
        : interpolate(
            clock.value,
            [window.at, window.at + duration.handoff, window.until - duration.handoff, window.until],
            [0, 1, 1, 0],
            Extrapolation.CLAMP,
          ),
  }));

  const vitalityProps = useAnimatedProps(() => {
    const value = Math.round(
      interpolate(
        clock.value,
        timeline.attributes.vitality.input,
        timeline.attributes.vitality.output,
        Extrapolation.CLAMP,
      ),
    );
    const text = `${value}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  // Une séance qui ne rapporte rien ne redistribue rien : pas d'anneau du tout. Le montrer
  // immobile ferait croire à une animation qui a raté.
  if (beat === undefined) {
    return null;
  }

  return (
    <Animated.View style={[styles.block, styles.podium, style]}>
      <AttributeRing
        attributes={{
          strength: workout.attributes.strength.after,
          endurance: workout.attributes.endurance.after,
          mobility: workout.attributes.mobility.after,
          dexterity: workout.attributes.dexterity.after,
        }}
        vitality={workout.attributes.vitality.after}
        size="hero"
        center={
          <AnimatedTextInput
            style={[type.display, styles.vitality, { fontSize }]}
            editable={false}
            animatedProps={vitalityProps}
            defaultValue={`${workout.attributes.vitality.before}`}
          />
        }
      >
        {ATTRIBUTE_ORDER.map((attribute) => (
          <LiveArc
            key={attribute}
            attribute={attribute}
            clock={clock}
            timeline={timeline}
            geometry={geometry}
            halo={halo}
          />
        ))}
      </AttributeRing>
    </Animated.View>
  );
}

/**
 * Un arc dont la part se redistribue à chaque image, plutôt que de grandir vers une borne
 * fixe : les quatre caractéristiques évoluent ensemble, et la part de chacune dépend des
 * trois autres à cet instant précis. `arcsOf` (marquée `'worklet'`) recalcule les quatre
 * fractions à partir des valeurs courantes ; `arcStroke` en tire le tracé, comme partout
 * ailleurs dans le cercle de vie — aucune formule recopiée.
 */
function LiveArc({
  attribute,
  clock,
  timeline,
  geometry,
  halo,
}: {
  attribute: Attribute;
  clock: Clock;
  timeline: Timeline;
  geometry: RingGeometry;
  halo: ReturnType<typeof decorativeGlow>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const live = {
      strength: interpolate(
        clock.value,
        timeline.attributes.strength.input,
        timeline.attributes.strength.output,
        Extrapolation.CLAMP,
      ),
      endurance: interpolate(
        clock.value,
        timeline.attributes.endurance.input,
        timeline.attributes.endurance.output,
        Extrapolation.CLAMP,
      ),
      mobility: interpolate(
        clock.value,
        timeline.attributes.mobility.input,
        timeline.attributes.mobility.output,
        Extrapolation.CLAMP,
      ),
      dexterity: interpolate(
        clock.value,
        timeline.attributes.dexterity.input,
        timeline.attributes.dexterity.output,
        Extrapolation.CLAMP,
      ),
    };
    const arc = arcsOf(live).find((candidate) => candidate.attribute === attribute);
    const { circumference, length, offset } = arcStroke(
      arc?.from ?? 0,
      arc?.to ?? 0,
      geometry.radius,
      geometry.strokeWidth,
    );

    return { strokeDasharray: `${length} ${circumference - length}`, strokeDashoffset: offset };
  });

  return (
    <>
      {halo === undefined ? null : (
        <AnimatedCircle
          cx={geometry.origin}
          cy={geometry.origin}
          r={geometry.radius}
          stroke={attributeColor[attribute]}
          strokeWidth={geometry.strokeWidth + halo.spread}
          strokeOpacity={halo.opacity}
          strokeLinecap="round"
          fill="none"
          animatedProps={animatedProps}
        />
      )}
      <AnimatedCircle
        cx={geometry.origin}
        cy={geometry.origin}
        r={geometry.radius}
        stroke={attributeColor[attribute]}
        strokeWidth={geometry.strokeWidth}
        strokeLinecap="round"
        fill="none"
        animatedProps={animatedProps}
      />
    </>
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
  halo,
}: {
  clock: Clock;
  timeline: Timeline;
  segment: Segment;
  workout: RewardSummary;
  halo: ReturnType<typeof decorativeGlow>;
}) {
  const index = segment.workout;
  const levels = timeline.beats.filter((beat) => beat.kind === 'level' && beat.workout === index);
  const titles = timeline.beats.filter((beat) => beat.kind === 'title' && beat.workout === index);

  // Un titre peut tomber sans qu'aucun niveau ne bascule (`avecLoot` en est la preuve, #226) :
  // ce bloc s'ouvre alors sur le premier titre plutôt que sur un `levels[0]` qui n'existe pas.
  const at = (levels[0] ?? titles[0]).at;
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
    <Animated.View style={[styles.block, styles.podium, style]}>
      {levels.length > 0 ? (
        <LevelFlip
          clock={clock}
          starts={levels.map((beat) => beat.at)}
          ends={levels.map((beat) => beat.until)}
          values={workout.level.reached}
          halo={halo}
        />
      ) : null}

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
  halo,
}: {
  clock: Clock;
  starts: number[];
  ends: number[];
  values: number[];
  halo: ReturnType<typeof decorativeGlow>;
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
    <Animated.View
      style={[styles.flip, style, halo === undefined ? undefined : { boxShadow: halo.boxShadow }]}
    >
      <Text style={styles.flipLabel}>NIVEAU</Text>
      <AnimatedTextInput
        style={[
          styles.flipValue,
          halo === undefined
            ? undefined
            : { textShadowColor: halo.textShadowColor, textShadowRadius: halo.textShadowRadius },
        ]}
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
 * Le loot, plein cadre — juste après le palier, sur le modèle de `LevelStage` : il paraît, il
 * est chassé (#226).
 *
 * **Zéro battement, zéro rendu.** Le composant ne retente pas `workout.loot.length` ou
 * `workout.coins.gained` : il lit directement le battement `coins`, qui n'existe précisément
 * pas quand le tirage est bredouille et que la bourse ne bouge pas (#80, même geste) — deux
 * sources de vérité sur la même décision finiraient par diverger.
 *
 * La bourse compte au centre par `useAnimatedProps`, comme le compteur d'XP et Vitality :
 * c'est `timeline.purse` qui porte le mouvement, de bout en bout, et ce battement n'en lit
 * qu'une fenêtre. Le jeton, lui, reste posé pendant que seul le nombre s'anime.
 */
function LootStage({
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
  const lootBeats = timeline.beats.filter((beat) => beat.kind === 'loot' && beat.workout === index);
  const coinsBeat = timeline.beats.find(
    (beat): beat is Extract<Beat, { kind: 'coins' }> => beat.kind === 'coins' && beat.workout === index,
  );

  // La fenêtre est lue **avant** le worklet, jamais dedans — même raison qu'`AttributeStage` :
  // un battement absent doit pouvoir sortir du composant, et un `return` conditionnel ne peut
  // pas suivre un hook.
  const at = lootBeats[0]?.at ?? coinsBeat?.at ?? 0;
  const until = after(segment.until, at + duration.handoff * 2);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      [at, at + duration.handoff, until - duration.handoff, until],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const purseProps = useAnimatedProps(() => {
    const value = Math.round(
      interpolate(clock.value, timeline.purse.input, timeline.purse.output, Extrapolation.CLAMP),
    );
    const text = `${value}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  if (coinsBeat === undefined) {
    return null;
  }

  return (
    <Animated.View style={[styles.block, styles.podium, style]}>
      {workout.loot.map((item, position) => (
        <ItemCard key={`${item.key}-${position}`} item={item} />
      ))}

      <View
        style={styles.purse}
        accessible
        accessibilityLabel={`Bourse, ${workout.coins.after} pièces`}
      >
        <CoinIcon size={28} />
        <AnimatedTextInput
          style={styles.purseValue}
          editable={false}
          animatedProps={purseProps}
          defaultValue={`${workout.coins.before}`}
          accessibilityElementsHidden
        />
      </View>
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
    <Animated.View style={[styles.block, styles.podium, style]}>
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
 * La raison à afficher au bilan quand **rien** n'a rapporté d'XP.
 *
 * Le cas est celui d'une synchronisation qui ne contient que des marches (#80) : `totals`
 * existe — des séances ont bien été créditées — mais `xpAwarded` vaut zéro. Un bilan qui
 * afficherait « +0 XP · niveau 12 → 12 » aurait l'air d'un bug, alors que c'est une règle du
 * jeu qui a fonctionné exactement comme prévu.
 *
 * `null` dès qu'une seule séance a rapporté quelque chose : le total parle alors de lui-même,
 * et expliquer un zéro qui n'existe pas serait du bruit.
 */
function soleReason(summary: SyncSummary): XpNoCreditReason | null {
  if (summary.imported.length === 0 || (summary.totals?.xpAwarded ?? 0) > 0) {
    return null;
  }

  const first = summary.imported[0].xp.reason;
  if (first === null || first === undefined) {
    return null;
  }

  // Toutes, pas seulement la première : un lot mêlant une marche et une séance à zéro pour une
  // autre raison n'aurait pas d'explication unique à donner.
  return summary.imported.every((workout) => workout.xp.reason === first) ? first : null;
}

/**
 * Le bilan — **l'état d'arrivée, et le seul bloc de cet écran qui ne sort jamais**.
 *
 * Tout le reste est écrit pour être chassé : c'est la règle « rien ne cohabite », et elle est
 * juste *pendant* la séquence. Mais personne ne reprenait la main à la fin, et l'écran finissait
 * nu au moment précis où le joueur venait chercher ce qu'il avait gagné (#79). Sa rampe d'opacité
 * n'a donc que **deux** points : il monte, et il y reste.
 *
 * ————— Il ne calcule rien ———————————————————————————————————————————————————————————————
 *
 * `totals` est servi depuis le premier jour et n'avait jamais été affiché. Son docblock au
 * contrat dit mot pour mot ce que ce composant fait : « le raccourci de l'écran de résumé —
 * +847 XP · niveau 10 → 15 — et ce que voit le joueur qui saute l'animation ». Les cinq jauges
 * viennent de l'`after` du dernier `imported`, exactement là où le saut les pose. Rien n'est
 * refait ici, et rien ne peut donc diverger de ce que la séquence vient de montrer.
 *
 * La bourse suit la même règle, et `totals` ne l'aide pas : `SyncTotals` ne porte pas les
 * pièces. Le bilan reprend donc directement `imported[0].coins.before` et
 * `imported[dernier].coins.after` (#226) — jamais une somme de `gained`, la même décision que
 * grrind-back#79 a achetée pour la barre d'XP.
 *
 * ————— Il tient dans un écran, ou il choisit ————————————————————————————————————————————
 *
 * Les blocs sont empilés au même endroit exprès — une vue défilante se battrait avec le geste
 * qui saute la séquence. Un lot peut débloquer plus de titres — ou faire tomber plus
 * d'objets — qu'il n'y a de place : ils se comptent alors au lieu de s'empiler, même geste et
 * même seuil que les titres (`RECAP_TITLES`) — parce qu'un bilan illisible ne vaut pas mieux
 * qu'un écran vide.
 *
 * L'anneau est celui du design system, sans enfant : ses arcs sont **statiques** ici, et c'est
 * le point — la redistribution vient d'avoir lieu sous les yeux du joueur, la rejouer en
 * boucle en ferait une décoration.
 */
function Recap({
  clock,
  at,
  totals,
  attributes,
  titles,
  loot,
  coins,
  skippedCount,
  noCredit,
}: {
  clock: Clock;
  at: number;
  totals: SyncTotals;
  attributes: RewardSummary['attributes'];
  titles: RewardSummary['titlesUnlocked'];
  /** Le lot entier, condensé compris — voir le docblock du composant. */
  loot: DroppedItem[];
  /** `imported[0].coins.before` → `imported[dernier].coins.after` : jamais une somme de
   *  `gained`, `SyncTotals` ne porte pas la bourse et n'a pas à la porter. */
  coins: { before: number; after: number };
  skippedCount: number;
  /** Non nul quand tout le lot a été crédité sans rapporter d'XP — voir `soleReason`. */
  noCredit: XpNoCreditReason | null;
}) {
  const style = useAnimatedStyle(() => ({
    // Deux points, jamais trois : c'est ce qui fait de ce bloc un état et pas un passage.
    opacity: interpolate(clock.value, [at, at + duration.enter], [0, 1], Extrapolation.CLAMP),
  }));

  const { vitality, ...arcs } = {
    strength: attributes.strength.after,
    endurance: attributes.endurance.after,
    mobility: attributes.mobility.after,
    dexterity: attributes.dexterity.after,
    vitality: attributes.vitality.after,
  };

  const climbed = totals.levelAfter > totals.levelBefore;
  // Deux badges tiennent, trois débordent. Au-delà, on compte — voir le docblock.
  const shown = titles.slice(0, RECAP_TITLES);
  const beyond = titles.length - shown.length;

  // Même geste, même seuil — deux cartes d'objet tiennent, la troisième pousse le compte hors
  // de l'écran (#226).
  const shownLoot = loot.slice(0, RECAP_TITLES);
  const beyondLoot = loot.length - shownLoot.length;

  // La bourse ne bouge pas sur un lot qui n'a rien fait tomber : « 40 → 40 pièces » dirait un
  // mouvement qui n'a pas eu lieu, la même distinction que « climbed »/« stay » plus haut.
  const purseChanged = coins.after > coins.before;

  return (
    <Animated.View style={[styles.block, styles.podium, style]}>
      <View style={styles.recapRing}>
        <AttributeRing attributes={arcs} vitality={vitality} size="hero" />
        {/* Même disposition que la carte d'accueil, et pour la même raison : la légende prend
            la largeur qui reste, sinon ses libellés se replient lettre par lettre. */}
        <View style={styles.recapLegend}>
          <AttributeLegend attributes={arcs} />
        </View>
      </View>

      {/* Rien n'a rapporté d'XP, et c'était prévu : le dire évite qu'un zéro parfaitement
          normal passe pour une panne. */}
      {noCredit === null ? null : (
        <Text style={styles.label}>{xpNoCreditReasonLabel[noCredit].toUpperCase()}</Text>
      )}

      {/* Le niveau se dit toujours ; la flèche seulement s'il a bougé. « Niveau 12 → 12 »
          serait une célébration qui n'a pas eu lieu. */}
      <Text style={styles.label}>
        NIVEAU{' '}
        <Text style={climbed ? styles.recapClimb : styles.recapStay}>
          {climbed ? `${totals.levelBefore} → ${totals.levelAfter}` : totals.levelAfter}
        </Text>
      </Text>

      {shown.map((title) => (
        <TitleBadge key={title.id} name={title.name} caption="Titre débloqué" />
      ))}
      {beyond > 0 ? (
        <Text style={styles.label}>
          et {beyond} autre{beyond > 1 ? 's' : ''} titre{beyond > 1 ? 's' : ''}
        </Text>
      ) : null}

      {/* Le loot du lot entier, condensé compris — aucun objet ne s'y perd, même celui qui
          n'a jamais rejoué son propre battement (#226). */}
      {shownLoot.map((item, position) => (
        <ItemCard key={`${item.key}-${position}`} item={item} />
      ))}
      {beyondLoot > 0 ? (
        <Text style={styles.label}>
          et {beyondLoot} autre{beyondLoot > 1 ? 's' : ''} objet{beyondLoot > 1 ? 's' : ''}
        </Text>
      ) : null}

      {/* La bourse du bilan : jamais une somme de `gained`, voir le docblock. */}
      <View style={styles.recapPurse}>
        <Text style={styles.label}>BOURSE</Text>
        {purseChanged ? (
          <View style={styles.purseChange}>
            <CoinAmount amount={coins.before} />
            <Text style={styles.arrow}>→</Text>
            <CoinAmount amount={coins.after} />
          </View>
        ) : (
          <CoinAmount amount={coins.after} />
        )}
      </View>

      {/* Les écarts se comptent ici sans se nommer : ils le sont déjà, plus bas, un par un. */}
      <Text style={styles.label}>
        {totals.workoutCount} séance{totals.workoutCount > 1 ? 's' : ''}
        {skippedCount > 0
          ? ` · ${skippedCount} écartée${skippedCount > 1 ? 's' : ''}`
          : ''}
      </Text>
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
    <View style={styles.skipped}>
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
  // `pointerEvents` dans le style, pas en prop : RN 0.86 déprécie la prop autonome — même
  // choix qu'`AttributeRing.center`.
  block: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.md,
    pointerEvents: 'none',
  },
  podium: { alignItems: 'center', justifyContent: 'center' },
  vitality: { color: color.text, padding: 0, textAlign: 'center' },
  purse: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // Même couleur que `CoinAmount` (`color.coin`) : le nombre se consulte, même quand il vient
  // de tomber. L'icône voisine porte désormais l'unité.
  purseValue: { ...type.title, color: color.coin, padding: 0, minWidth: space.xl },
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
  /** Le bilan : l'anneau et sa légende côte à côte, comme sur la carte d'accueil. */
  recapRing: { flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'stretch' },
  recapLegend: { flex: 1 },
  /** Un palier franchi se célèbre ; un palier tenu se lit simplement. */
  recapClimb: { color: color.celebrate },
  recapStay: { color: color.text },
  recapPurse: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  purseChange: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  arrow: { ...type.body, color: color.textMuted },
  digestCount: { ...type.display, color: color.text },
  skipped: { gap: space.xs, pointerEvents: 'none' },
  skippedRow: { flexDirection: 'row', gap: space.sm, alignItems: 'baseline' },
  skippedType: { ...type.body, color: color.text },
  skippedReason: { ...type.body, color: color.textMuted, flexShrink: 1 },
  exit: { ...type.body, color: color.text, textAlign: 'center' },
  ruleset: { ...type.label, color: color.textMuted },
});
