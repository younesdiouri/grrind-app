import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Polygon } from 'react-native-svg';

import { SessionCard } from '@/components/SessionCard';
import { TogetherDetails } from '@/components/TogetherDetails';
import { SystemFrame } from '@/components/SystemFrame';
import { Convey, FlowLayers, ScanLine, Seam, TickRail } from '@/components/SystemMotion';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar, xpBarFill } from '@/components/XpBar';
import { decorativeGlow } from '@/design/decorativeGlow';
import { decorativeMotion } from '@/design/decorativeMotion';
import { color, curve, duration, motion, space, type, typography, workoutChart as chart } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import {
  formatCalories,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatWhen,
} from '@/features/progression/format';
import type { Progression, Workout } from '@/features/progression/usePlayerHome';
import { gaugeFill, gaugeHaloLayer, type GaugeBar } from '@/features/progression/WeekBoard';
import { explainVitality, type VitalityBreakdown } from '@/features/progression/vitalityBonus';
import { PerformanceRadar, type RadarPoint } from './PerformanceRadar';
import type { WeekProgress } from './week';

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
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export function LivePerformanceRadar({ week }: { week: WeekProgress }) {
  return <PerformanceRadar week={week} renderShape={points => <RadarShape points={points} />} />;
}

function RadarShape({ points }: { points: RadarPoint[] }) {
  const progress = useSharedValue(0);
  const breath = useSharedValue(1);
  const reduced = useReducedMotion();
  const signature = points.map(point => `${point.x},${point.y}`).join(' ');
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(duration.breath, withTiming(1, { duration: duration.drop, easing: Easing.bezier(...curve.enter) }));
  }, [signature, progress]);
  useEffect(() => {
    cancelAnimation(breath);
    breath.value = 1;
    if (reduced === false) breath.value = withRepeat(withTiming(motion.beacon.from, { duration: motion.beacon.cycle / 2 }), -1, true);
    return () => cancelAnimation(breath);
  }, [reduced, breath]);
  const animatedProps = useAnimatedProps(() => ({
    points: points.map(point => `${chart.centerX + (point.x - chart.centerX) * progress.value},${chart.centerY + (point.y - chart.centerY) * progress.value}`).join(' '),
  }));
  const haloProps = useAnimatedProps(() => ({ opacity: chart.haloOpacity * breath.value }));
  return <>
    {reduced === false ? <AnimatedPolygon points={signature} animatedProps={haloProps} fill="none" stroke={color.accent} strokeWidth={chart.haloStroke} strokeLinejoin="round" /> : null}
    <AnimatedPolygon animatedProps={animatedProps} fill={color.accent} fillOpacity={chart.fillOpacity} stroke={color.accent} strokeWidth={chart.stroke} strokeLinejoin="round" />
  </>;
}

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
 *
 * ————— Elle porte cinq des six mouvements (#159) ————————————————————————————————————————
 *
 * `seam` sur ses segments, `tick` le long de son bord, `scan` quand elle vient d'être lue,
 * `flow` dans sa jauge et `convey` sur son intitulé. C'est le panneau le plus haut de la
 * hiérarchie, et le mouvement suit la hiérarchie : les cartes de séance, juste en dessous,
 * n'en portent **aucun**. C'est ce contraste qui la fait paraître alimentée — si l'historique
 * bougeait aussi, l'écran entier redeviendrait un fond animé.
 *
 * `scanToken` vient de l'écran : le balayage est l'accusé de réception d'un geste, et l'écran
 * est le seul à savoir qu'un rafraîchissement vient d'aboutir. Au montage, `useEffect` le joue
 * une première fois sans que personne n'ait à le demander.
 */
export function LevelCard({
  progression,
  scanToken = 0,
}: {
  progression: Progression;
  /** Change à chaque rafraîchissement réussi ; le balayage se rejoue alors. */
  scanToken?: number;
}) {
  // `xpToNextLevel` est `null` au niveau maximum. La barre est alors pleine — il n'y a plus
  // de palier à remplir, et une barre vide dirait le contraire de ce qui s'est passé.
  const total =
    progression.xpToNextLevel === null
      ? progression.xpIntoLevel
      : progression.xpIntoLevel + progression.xpToNextLevel;

  const filled = total === 0 ? 1 : progression.xpIntoLevel / total;

  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const glow = decorativeGlow('soft', reducedMotion);
  const moving = decorativeMotion('seam', reducedMotion).effect !== undefined;
  // La piste, pas le remplissage : celui-ci est animé sur le thread UI et n'a aucune largeur
  // connue du côté React. Les couches de `flow` se dimensionnent donc sur la piste entière, et
  // le masque du remplissage se charge de n'en montrer que sa part.
  const [trackWidth, setTrackWidth] = useState(0);

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
    <SystemFrame
      tier="hero"
      accent="celebrate"
      style={glow.effect === undefined ? undefined : { boxShadow: glow.effect.boxShadow }}
      contentStyle={styles.level}
      segments={
        moving ? <Seam tier="hero" accent="celebrate" offset={motion.seam.phase.level} /> : undefined
      }
      overlay={
        moving ? (
          <>
            <TickRail />
            <ScanLine token={scanToken} />
          </>
        ) : undefined
      }
    >
      <View style={styles.levelBody} onLayout={play}>
      {/* Le niveau devant, le cumul à droite : c'est le niveau qu'on vient voir, et le
          total qui le justifie. Le titre porté se range sous le total parce qu'il se gagne
          par l'XP, pas par le palier. */}
      <View style={styles.levelHead}>
        <View style={styles.levelIdentity}>
          <View style={styles.overlineRow}>
            <Text style={styles.overline}>NIVEAU</Text>
            {moving ? <Convey /> : null}
          </View>
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
        <View onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
          <XpBar size="hero">
            <Animated.View style={[xpBarFill, barStyle]}>
              {moving ? <FlowLayers width={trackWidth} /> : null}
            </Animated.View>
          </XpBar>
        </View>

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

      <Text style={styles.levelFoot}>XP et niveau restent acquis entre les semaines.</Text>
      </View>
    </SystemFrame>
  );
}

/**
 * La barre animée d'une jauge de la semaine (#362).
 *
 * Le remplissage part de zéro sur le tempo de `LevelCard` — `breath` puis `settle`,
 * `curve.enter` — pour que la barre de niveau et les jauges partent ensemble. Le halo, dosé par
 * `gaugeGlow`, respire sur le cycle de `beacon` quand la jauge est la priorité : c'est la seule
 * qui bouge en continu, donc celle que l'œil va chercher. « Réduire les animations » éteint
 * halo et respiration, comme partout ailleurs ; le remplissage, qui porte l'information, reste.
 */
export function GrowingGaugeBar({ fill, tint, halo, pulse }: GaugeBar) {
  const progress = useSharedValue(0);
  const breath = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const lit = halo !== null && reducedMotion === false;

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      duration.breath,
      withTiming(fill, { duration: duration.settle, easing: Easing.bezier(...curve.enter) }),
    );
  }, [fill, progress]);

  useEffect(() => {
    cancelAnimation(breath);
    breath.value = motion.beacon.to;
    if (pulse && lit) {
      breath.value = withRepeat(
        withTiming(motion.beacon.from, { duration: motion.beacon.cycle / 2, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
  }, [pulse, lit, breath]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: breath.value }));

  return (
    <View>
      {lit ? <Animated.View style={[gaugeHaloLayer, { boxShadow: halo }, haloStyle]} /> : null}
      <XpBar>
        <Animated.View style={[gaugeFill, { backgroundColor: tint }, fillStyle]} />
      </XpBar>
    </View>
  );
}

/**
 * L'explication du bonus de Vitality, sous le cercle (#77).
 *
 * **Elle est ici et pas dans la légende**, et c'est une décision : la légende dit les parts
 * des quatre caractéristiques, Vitality n'en a pas — elle est au centre, en chiffre. Lui
 * ajouter une ligne dans la légende rendrait celle-ci fausse pour ce qui n'a pas de part.
 *
 * Elle ne paraît que quand il y a quelque chose à dire : une app installée le jour même n'a ni
 * moyenne ni bonus, et lui parler d'une cible qu'elle n'a pas eu le temps de viser serait lui
 * reprocher d'être neuve. Voir `explainVitality`.
 */
export function VitalityNote({ breakdown }: { breakdown: VitalityBreakdown }) {
  const explained = explainVitality(breakdown);

  if (explained === null) {
    return null;
  }

  return (
    <View style={styles.vitalityNote}>
      {explained.bonus === null ? null : (
        <Text style={styles.vitalityBonus}>Vitalité {explained.bonus}</Text>
      )}
      <Text style={styles.levelFoot}>{explained.detail}</Text>
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
    <View>
    <SessionCard
      discipline={workout.discipline}
      duration={formatDuration(workout.durationSeconds)}
      when={formatWhen(workout.startedAt, now)}
      measures={measures}
    />
    <TogetherDetails together={workout.together} />
    </View>
  );
}

const styles = StyleSheet.create({
  level: {
    padding: space.md,
  },
  levelBody: { gap: space.sm },
  levelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  levelIdentity: { gap: space.xs },
  overlineRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  levelTally: { alignItems: 'flex-end', gap: space.xs },
  overline: { ...type.label, color: color.textMuted },
  levelNumber: { ...type.display, fontFamily: typography.display.bold, color: color.celebrate },
  levelTotal: {
    ...type.title,
    fontFamily: typography.display.semibold,
    color: color.accent,
    padding: 0,
    textAlign: 'right',
  },
  levelProgress: { gap: space.sm },
  levelScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.sm,
  },
  levelFoot: { ...type.label, color: color.textMuted },
  levelRemaining: { ...type.label, color: color.text },
  vitalityNote: { gap: space.xs },
  /** Le bonus se célèbre discrètement : c'est un gain, mais il ne vient pas d'une séance. */
  vitalityBonus: { ...type.label, color: color.gain },
});
