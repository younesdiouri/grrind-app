import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle } from 'react-native-svg';

import { attributeLegendDot, AttributeLegend, AttributeRing } from '@/components/AttributeRing';
import { arcPresentation, arcsOf, ringViewport, type AttributeArc, type RingGeometry } from '@/components/attributeArcs';
import { OrbitCrown, SweepSector } from '@/components/RingDial';
import { SessionCard } from '@/components/SessionCard';
import { SystemFrame } from '@/components/SystemFrame';
import { Beacon, Convey, FlowLayers, ScanLine, Seam, TickRail } from '@/components/SystemMotion';
import { TitleBadge } from '@/components/TitleBadge';
import { vitalityFontSize } from '@/components/vitalityFontSize';
import { XpBar, xpBarFill } from '@/components/XpBar';
import { decorativeGlow } from '@/design/decorativeGlow';
import type { DecorativeGlow } from '@/design/decorativeGlow';
import { decorativeMotion } from '@/design/decorativeMotion';
import { staggerOffset } from '@/design/motionPhase';
import { attributeColor, color, curve, duration, motion, space, type, typography } from '@/design/tokens';
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
import { explainVitality, type VitalityBreakdown } from '@/features/progression/vitalityBonus';

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
    </SystemFrame>
  );
}

/**
 * La répartition du joueur, sous `LevelCard` : les quatre caractéristiques en anneau,
 * Vitality au centre — voir `AttributeRing` (#69).
 *
 * **Elle se remplit au montage, comme `LevelCard`, avec la même échelle de temps**
 * (`duration.breath` puis `duration.settle`, `curve.enter`) : deux animations d'accueil qui
 * ne partiraient pas ensemble se verraient. Une seule valeur partagée pilote les deux effets,
 * et les deux passent par les portes qu'`AttributeRing` prête à cet effet — `children` pour
 * les arcs, `center` pour Vitality — plutôt que par un fondu ou un cache : un cercle qui se
 * remplit, c'est un arc qui grandit depuis rien jusqu'à sa part, exactement ce que fait la
 * barre de `LevelCard` en largeur. `arcStroke` porte la géométrie du trait, partagée avec
 * l'arc statique d'`AttributeRing` ; ici, `from` reste fixe et `to` est interpolé entre `from`
 * (rien à dessiner) et sa borne réelle.
 *
 * Vitality compte jusqu'à sa valeur par `useAnimatedProps` sur un `TextInput`, comme le total
 * de `LevelCard` — posé par la porte `center`, donc **le seul** chiffre à l'écran : pas de
 * `Text` fixe en dessous à masquer, pas de cache qui dépendrait d'une couleur de fond restant
 * identique.
 *
 * La taille de police se calcule une fois, sur la valeur **finale** de Vitality — jamais sur
 * le compte en cours. `vitalityFontSize` dépend du nombre de chiffres, et le recalculer à
 * chaque image ferait sauter la police pendant que le compteur grandit, ce qui serait plus
 * laid que l'inverse : un nombre à un chiffre rendu un peu petit pour sa taille, le temps de
 * grandir jusqu'au nombre final de chiffres.
 *
 * ————— Elle devient un cadran (#159) ————————————————————————————————————————————————————
 *
 * Une couronne pointillée à l'extérieur des arcs, un secteur de balayage derrière eux, et les
 * deux tournent **en sens opposés** : c'est ce qui fait lire un mécanisme plutôt qu'une image
 * qui tourne. Aucun des deux ne touche à la géométrie des arcs — la couronne passe par le
 * débord de `ringGeometry`, exactement comme le halo, et `attributeArcs.test.ts` reste vert
 * sans modification, ce qui est la preuve que le rayon net n'a pas bougé.
 *
 * Le cadre est `standard` et porte pourtant `seam` : la règle est « pas les cadres de
 * l'historique », pas « pas les cadres `standard` ». Son déphasage propre le sépare de la
 * carte de niveau juste au-dessus — sans lui, les deux panneaux respireraient ensemble et ce
 * serait la page qui pulse.
 */
export function AttributeCard({
  attributes,
  vitalityBreakdown,
}: {
  attributes: Progression['attributes'];
  /**
   * Ce qui explique la moitié « santé de fond » de Vitality (#77). Requis, pas optionnel :
   * le contrat le rend toujours, et le rendre facultatif ici laisserait un appelant l'oublier
   * — c'est-à-dire afficher le nombre seul, ce que le ticket interdit en toutes lettres.
   */
  vitalityBreakdown: VitalityBreakdown;
}) {
  const { vitality, ...arcs } = attributes;
  // La même donnée que la légende affichera, éteinte : cinq zéros ne sont pas une panne,
  // c'est le point de départ normal d'un compte neuf.
  const empty = vitality <= 0 && Object.values(arcs).every((value) => value <= 0);

  // Calculée une fois par montage, comme `arcsOf` : les bornes de chaque arc ne bougent pas
  // pendant la course, seule la valeur partagée fait avancer `to` de `from` jusqu'à elles.
  const staticArcs = arcsOf(arcs);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const glow = decorativeGlow('soft', reducedMotion);
  // Le nom d'`orbit` est donné même quand l'effet est coupé : c'est lui qui réserve le viewport,
  // et un anneau qui rétrécirait sous « Réduire les animations » déplacerait toute la carte.
  const orbit = decorativeMotion('orbit', reducedMotion);
  const beacon = decorativeMotion('beacon', reducedMotion);
  const geometry = ringViewport('hero', glow, orbit);
  const fontSize = vitalityFontSize(vitality, geometry.innerDiameter, type.display.fontSize);


  const play = () => {
    progress.value = 0;
    progress.value = withDelay(
      duration.breath,
      withTiming(1, { duration: duration.settle, easing: Easing.bezier(...curve.enter) }),
    );
  };

  const vitalityProps = useAnimatedProps(() => {
    const text = `${Math.round(progress.value * vitality)}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <SystemFrame
      contentStyle={styles.attributesCard}
      segments={orbit.effect === undefined ? undefined : <Seam offset={motion.seam.phase.ring} />}
    >
      <View style={styles.attributesBody} onLayout={play}>
      <View style={styles.attributesRow}>
        <AttributeRing
          attributes={arcs}
          vitality={vitality}
          size="hero"
          glow={glow}
          orbit={orbit}
          underlay={
            orbit.effect === undefined ? undefined : (
              <>
                {/* Le secteur d'abord : il passe sous la couronne comme sous les arcs. */}
                <SweepSector geometry={geometry} />
                <OrbitCrown geometry={geometry} />
              </>
            )
          }
          center={
            <AnimatedTextInput
              style={[type.display, styles.vitalityText, { fontSize }]}
              editable={false}
              animatedProps={vitalityProps}
              defaultValue="0"
            />
          }
        >
          {staticArcs.map((arc) => (
            <GrowingArc key={arc.attribute} arc={arc} progress={progress} geometry={geometry} glow={glow} />
          ))}
        </AttributeRing>

        {/* La légende prend la largeur qui reste, comme `barWrap` le fait pour `XpBar` dans
            `GuildMemberRow` : son `legendLabel` est en `flex: 1`, et un enfant flexible dans un
            parent dont la largeur dépend de son contenu se réduit à un caractère — les
            libellés se replient alors verticalement, lettre par lettre. */}
        <View style={styles.legendWrap}>
          <AttributeLegend
            attributes={arcs}
            dot={
              beacon.effect === undefined
                ? undefined
                : (attribute, index) => (
                  <Beacon
                    style={[attributeLegendDot, { backgroundColor: attributeColor[attribute] }]}
                    offset={staggerOffset(index, motion.convey.stagger)}
                  />
                )
            }
          />
        </View>
      </View>

      {empty ? (
        <Text style={styles.levelFoot}>Rien à répartir pour l&apos;instant : ta prochaine séance colorera ce cercle.</Text>
      ) : null}

      <VitalityNote breakdown={vitalityBreakdown} />
      </View>
    </SystemFrame>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
 * Un arc qui grandit depuis rien jusqu'à sa part, `from` fixe — le pendant animé de l'`Arc`
 * statique d'`AttributeRing`, même géométrie (`arcStroke`), lue sur le thread UI à chaque
 * image plutôt que recalculée à la main : c'est la même fonction, marquée `'worklet'` pour ça.
 */
function GrowingArc({
  arc,
  progress,
  geometry,
  glow,
}: {
  arc: AttributeArc;
  progress: SharedValue<number>;
  geometry: RingGeometry;
  glow: DecorativeGlow;
}) {
  const animatedProps = useAnimatedProps(() => {
    const to = interpolate(progress.value, [0, 1], [arc.from, arc.to], Extrapolation.CLAMP);
    return arcPresentation(arc.from, to, geometry.radius, geometry.strokeWidth);
  });

  return (
    <>
      {glow.effect === undefined ? null : (
        <AnimatedCircle
          cx={geometry.origin}
          cy={geometry.origin}
          r={geometry.radius}
          stroke={attributeColor[arc.attribute]}
          strokeWidth={geometry.strokeWidth + glow.effect.spread}
          strokeOpacity={glow.effect.opacity}
          animatedProps={animatedProps}
          fill="none"
        />
      )}
      <AnimatedCircle
        cx={geometry.origin}
        cy={geometry.origin}
        r={geometry.radius}
        stroke={attributeColor[arc.attribute]}
        strokeWidth={geometry.strokeWidth}
        animatedProps={animatedProps}
        fill="none"
      />
    </>
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
  attributesCard: {
    padding: space.md,
  },
  attributesBody: { gap: space.sm },
  attributesRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  vitalityNote: { gap: space.xs },
  /** Le bonus se célèbre discrètement : c'est un gain, mais il ne vient pas d'une séance. */
  vitalityBonus: { ...type.label, color: color.gain },
  legendWrap: { flex: 1 },
  vitalityText: { color: color.text, padding: 0, textAlign: 'center' },
});
