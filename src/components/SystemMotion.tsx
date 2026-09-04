import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useBackdropClock } from '@/components/AmbientBackdrop';
import { frameSegment } from '@/components/SystemFrame';
import { framePresentation, type FrameAccent, type FrameTier } from '@/design/systemFrame';
import { sheenStripes, stripeOffsets } from '@/components/xpFlow';
import type { DecorativeMotion } from '@/design/decorativeMotion';
import { breathe, cyclePhase, staggerOffset } from '@/design/motionPhase';
import { color, glow, motion, radius, space, type, typography } from '@/design/tokens';

/**
 * Ce qui bouge sans qu'on y touche (#159).
 *
 * ————— Pourquoi ces composants ne sont pas dans le design system ————————————————————————
 *
 * `SystemFrame`, `XpBar`, `AttributeRing` et `BagRow` se rendent **dans Node**, avec
 * `react-native-web`, pour produire les previews. Rien n'y aliase `react-native-reanimated`, et
 * rien ne le fera : le design system est la source de vérité du dessin, pas du mouvement. Ces
 * composants-là prêtent donc des portes — `segments`, `overlay`, `underlay`, `children` — et
 * ceux d'ici les occupent, exactement comme `AmbientBackdrop` vit à côté du décor qu'il anime.
 *
 * ————— Une seule horloge ————————————————————————————————————————————————————————————————
 *
 * Tout ce qui est continu lit `useBackdropClock()` par une phase et un modulo. Il n'y a **pas**
 * un `withRepeat` par mouvement : le coût de dix animations devient celui d'une seule, et elles
 * restent en phase entre elles pour toujours — ce que dix horloges indépendantes ne
 * garantissent pas, puisqu'elles ne démarrent pas au même frame.
 *
 * `ScanLine` est la seule exception, et c'est assumé : un balayage est un **événement** — au
 * montage, au rafraîchissement — pas une boucle de fond.
 *
 * ————— Ce que « Réduire les animations » coupe ——————————————————————————————————————————
 *
 * Tout, entièrement, et l'appelant le décide en amont : il ne monte simplement pas ces
 * composants quand `decorativeMotion(...).effect` est absent. Les segments fixes de
 * `SystemFrame` restent alors à **opacité 1**, pas à `motion.seam.from` — un écran sans
 * mouvement doit rester complet et lisible, pas dégradé.
 */

/**
 * « Le panneau est alimenté » : les deux segments du cadre respirent en opposition de phase.
 *
 * Amplitude minuscule, cycle long — on ne le regarde pas, on le sent. `offset` déphase le panneau
 * entier par rapport à ses voisins : sans lui, trois cadres à l'écran clignoteraient ensemble et
 * ce serait la page qui pulse, pas trois instruments.
 */
export function Seam({
  tier = 'standard',
  accent = 'accent',
  offset = 0,
}: {
  tier?: FrameTier;
  accent?: FrameAccent;
  offset?: number;
}) {
  const clock = useBackdropClock();
  // La même résolution que celle du cadre qu'on remplace : la couleur et la longueur d'un
  // segment sont une décision de hiérarchie, pas une valeur qu'un appelant recopie.
  const { accentColor, accentLength } = framePresentation(tier, accent);

  const top = useAnimatedStyle(() => ({
    opacity: breathe(
      cyclePhase(clock.value, motion.seam.cycle, offset),
      motion.seam.from,
      motion.seam.to,
    ),
  }));

  const bottom = useAnimatedStyle(() => ({
    opacity: breathe(
      cyclePhase(clock.value, motion.seam.cycle, offset + motion.seam.opposite),
      motion.seam.from,
      motion.seam.to,
    ),
  }));

  const shape = { backgroundColor: accentColor, width: accentLength };

  return (
    <>
      <Animated.View {...decorative} style={[inert, frameSegment.base, frameSegment.top, shape, top]} />
      <Animated.View
        {...decorative}
        style={[inert, frameSegment.base, frameSegment.bottom, shape, bottom]}
      />
    </>
  );
}

/**
 * La texture du bord : un ruban de graduations qui dérive vers le haut le long du bord intérieur
 * gauche du cadre.
 *
 * Il se mesure lui-même — le cadre qui le porte n'a pas de hauteur connue d'avance — et ne
 * dessine rien avant de l'avoir fait : `stripeOffsets` rend une liste vide sur une hauteur nulle
 * plutôt qu'un trait unique posé n'importe où.
 */
export function TickRail() {
  const clock = useBackdropClock();
  const [height, setHeight] = useState(0);

  const drift = useAnimatedStyle(() => ({
    transform: [
      { translateY: -cyclePhase(clock.value, motion.tick.cycle) * motion.tick.pitch },
    ],
  }));

  return (
    <View
      {...decorative}
      style={[inert, styles.tickRail]}
      onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}
    >
      <Animated.View style={[StyleSheet.absoluteFill, drift]}>
        {stripeOffsets(height, motion.tick.pitch).map((offset) => (
          <View key={offset} style={[styles.tickDash, { top: offset }]} />
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * « Ce panneau vient d'être lu » : un trait de 1 px traverse le cadre de haut en bas, puis se
 * tait pour de bon.
 *
 * C'est un **événement**, donc la seule valeur partagée propre de ce fichier. Il se rejoue
 * quand `token` change — le montage de la carte, un rafraîchissement réussi — et se répète bout
 * à bout tant que `loop` est vrai, où il remplace le témoin de chargement circulaire : un
 * balayage sur le cadre vide dit la même chose, et il dit en plus **où** la donnée va arriver.
 *
 * `ReduceMotion.Never` comme l'horloge du décor : ce n'est pas Reanimated qui arbitre la
 * préférence système ici, c'est l'appelant, qui ne monte pas ce composant du tout.
 */
export function ScanLine({ token = 0, loop = false }: { token?: number; loop?: boolean }) {
  const progress = useSharedValue(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;

    const sweep = withTiming(1, { duration: motion.scan.active, easing: Easing.linear });
    progress.value = loop ? withRepeat(sweep, -1, false, undefined, ReduceMotion.Never) : sweep;

    return () => cancelAnimation(progress);
  }, [loop, progress, token]);

  const line = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.2, 0.9, 1],
      [0, motion.scan.opacity, motion.scan.opacity, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ translateY: progress.value * height }],
  }));

  return (
    <View
      {...decorative}
      style={[inert, StyleSheet.absoluteFill]}
      onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}
    >
      <Animated.View style={[styles.scanLine, line]} />
    </View>
  );
}

/**
 * Les chevrons qui défilent en cascade sur un intitulé — la ponctuation qui fait qu'un titre a
 * l'air écrit par la machine plutôt qu'affiché.
 *
 * Le décalage est **négatif** : le second chevron ne suit pas le premier après coup, il joue une
 * animation déjà commencée. C'est ce qui fait une cascade et non un défilé.
 */
export function Convey({
  count = motion.convey.count,
  style,
}: {
  count?: number;
  /**
   * L'apparence du chevron, quand il en remplace un qui existait déjà — celui de `BagRow`.
   * Le mouvement n'a pas à changer la couleur ni la taille de ce qu'il fait bouger : ce lot ne
   * touche à aucune des deux, et un chevron qui changerait de teinte en se mettant à défiler
   * serait une décision de hiérarchie déguisée en animation.
   */
  style?: StyleProp<TextStyle>;
}) {
  return (
    <View {...decorative} style={[inert, styles.convey]}>
      {Array.from({ length: count }, (_, index) => (
        <Chevron key={index} offset={staggerOffset(index, motion.convey.stagger)} style={style} />
      ))}
    </View>
  );
}

function Chevron({ offset, style }: { offset: number; style?: StyleProp<TextStyle> }) {
  const clock = useBackdropClock();

  const run = useAnimatedStyle(() => {
    const phase = cyclePhase(clock.value, motion.convey.cycle, offset);
    return {
      opacity: interpolate(phase, [0, 0.35, 1], [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            phase,
            [0, 1],
            [-motion.convey.travel, motion.convey.travel],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return <Animated.Text style={[styles.chevron, style, run]}>›</Animated.Text>;
}

/**
 * Le curseur de l'en-tête : un bloc plein, allumé ou éteint, jamais entre les deux.
 *
 * Un fondu en ferait une lueur qui palpite ; un curseur ne palpite pas, il clignote. D'où la
 * marche franche plutôt qu'une interpolation — c'est le `step-end` de la référence.
 */
export function Caret() {
  const clock = useBackdropClock();

  const style = useAnimatedStyle(() => ({
    opacity: cyclePhase(clock.value, motion.caret.cycle) < 0.5 ? 1 : 0,
  }));

  return <Animated.View {...decorative} style={[inert, styles.caret, style]} />;
}

/**
 * Le losange de l'onglet actif, qui bat.
 *
 * Avec le filet de la barre, c'est le seul mouvement présent sur **tous** les écrans : un
 * battement lent y suffit à dire que l'app tourne, même sur un écran vide. La rotation de 45°
 * ne fait pas partie du battement — elle est la forme du marqueur, et elle reste dans la liste
 * de transformations sous l'échelle qui, elle, respire.
 */
export function Beacon({
  style,
  rotate,
  offset = 0,
}: {
  style?: StyleProp<ViewStyle>;
  /**
   * La forme du marqueur, reprise ici parce qu'une liste de transformations animée **remplace**
   * celle du style au lieu de s'y ajouter : un losange qui perdrait sa rotation en se mettant à
   * battre redeviendrait un carré.
   */
  rotate?: string;
  offset?: number;
}) {
  const clock = useBackdropClock();

  const pulse = useAnimatedStyle(() => {
    const phase = cyclePhase(clock.value, motion.beacon.cycle, offset);
    const scale = breathe(phase, motion.beacon.scaleFrom, motion.beacon.scaleTo);
    return {
      opacity: breathe(phase, motion.beacon.from, motion.beacon.to),
      transform: rotate === undefined ? [{ scale }] : [{ rotate }, { scale }],
    };
  });

  return <Animated.View {...decorative} style={[inert, style, pulse]} />;
}

/**
 * Un filet que parcourt un segment lumineux — le point courant du système.
 *
 * Le composant **est** le filet, pas son contenu : c'est lui qui doit masquer, et il doit
 * connaître sa propre largeur pour savoir jusqu'où courir. Un enfant ne peut mesurer ni l'un ni
 * l'autre. `offset` déphase les trois filets de l'app — en-tête, section, barre d'onglets — pour
 * qu'ils ne partent pas ensemble.
 */
export function SparkRail({
  style,
  sparkColor = color.celebrate,
  offset = 0,
}: {
  style?: StyleProp<ViewStyle>;
  sparkColor?: string;
  offset?: number;
}) {
  const clock = useBackdropClock();
  const [width, setWidth] = useState(0);

  const spark = useAnimatedStyle(() => {
    const phase = cyclePhase(clock.value, motion.beacon.travel, offset);
    return {
      opacity: interpolate(phase, [0, 0.12, 0.88, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: phase * Math.max(0, width - motion.beacon.spark) }],
    };
  });

  return (
    <View
      {...decorative}
      style={[inert, styles.sparkRail, style]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.spark, { backgroundColor: sparkColor }, spark]} />
    </View>
  );
}

/**
 * L'énergie qui circule dans le remplissage de la barre d'XP.
 *
 * Trois calques, tous **à l'intérieur** de la vue de remplissage, qui masque : une hachure
 * sombre, un reflet clair dix fois plus rapide, et l'arête au front d'onde. La parallaxe vient
 * de ce que chaque couche parcourt son propre pas dans le même cycle.
 *
 * `width` est celle de la **piste**, pas du remplissage : le remplissage est animé sur le thread
 * UI et n'a pas de largeur connue du côté React. Les deux couches sont donc dimensionnées pour
 * la piste entière, et le masque du remplissage se charge de n'en montrer que sa part.
 *
 * L'arête se pose sur le bord droit du remplissage, à l'intérieur de ce même masque. C'est ce
 * qui l'empêche de clignoter sur du vide quand la barre repart de zéro : un remplissage de
 * largeur nulle n'a rien à montrer — exactement le piège déjà documenté pour `crest` dans
 * `SyncSummaryView`.
 */
export function FlowLayers({ width }: { width: number }) {
  const clock = useBackdropClock();

  const hatch = useAnimatedStyle(() => ({
    transform: [
      { translateX: cyclePhase(clock.value, motion.flow.cycle) * motion.flow.hatch },
      { skewX: `${motion.flow.slant}deg` },
    ],
  }));

  const sheen = useAnimatedStyle(() => ({
    transform: [
      { translateX: cyclePhase(clock.value, motion.flow.cycle) * motion.flow.sheen },
      { skewX: `${motion.flow.slant}deg` },
    ],
  }));

  const crest = useAnimatedStyle(() => ({
    opacity: breathe(
      cyclePhase(clock.value, motion.flow.crestCycle),
      motion.flow.crestFrom,
      motion.flow.crestTo,
    ),
  }));

  return (
    <View {...decorative} style={[inert, StyleSheet.absoluteFill]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.hatchLayer, hatch]}>
        {stripeOffsets(width, motion.flow.hatch).map((offset) => (
          <View key={offset} style={[styles.hatch, { left: offset }]} />
        ))}
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, sheen]}>
        {sheenStripes(width).map((stripe) =>
          stripe.bands.map((band) => (
            <View
              key={`${stripe.offset}-${band.left}`}
              style={[
                styles.sheen,
                { left: stripe.offset + band.left, width: band.width, opacity: band.opacity },
              ]}
            />
          )),
        )}
      </Animated.View>

      <Animated.View style={[styles.crest, crest]} />
    </View>
  );
}

/**
 * Ce qui bouge ne se lit pas, et ne se touche pas. Les six mouvements sont décoratifs au sens
 * strict : l'information reste dans le contenu, et l'arbre d'accessibilité ne doit jamais
 * apprendre qu'un trait passe.
 */
const decorative = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * Et rien de ce qui bouge n'intercepte un doigt. `pointerEvents` va dans le style et non en
 * prop : RN 0.86 déprécie la prop autonome — même remarque que dans `AttributeRing`.
 */
const inert = { pointerEvents: 'none' } as const satisfies ViewStyle;

const styles = StyleSheet.create({
  tickRail: {
    position: 'absolute',
    left: motion.tick.inset,
    top: motion.tick.margin,
    bottom: motion.tick.margin,
    width: motion.tick.width,
    overflow: 'hidden',
  },
  tickDash: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: motion.tick.dash,
    backgroundColor: color.accent,
    opacity: motion.tick.opacity,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: motion.scan.thickness,
    backgroundColor: color.accent,
    boxShadow: glow.soft.boxShadow,
  },
  convey: { flexDirection: 'row' },
  chevron: {
    ...type.label,
    fontFamily: typography.display.semibold,
    color: color.accent,
    letterSpacing: 0,
  },
  caret: {
    width: motion.caret.width,
    height: motion.caret.height,
    backgroundColor: color.accent,
  },
  sparkRail: { overflow: 'hidden' },
  spark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: motion.beacon.spark,
  },
  hatchLayer: { opacity: motion.flow.hatchOpacity },
  hatch: {
    position: 'absolute',
    top: -space.sm,
    bottom: -space.sm,
    width: motion.flow.hatchWidth,
    backgroundColor: color.background,
  },
  sheen: {
    position: 'absolute',
    top: -space.sm,
    bottom: -space.sm,
    backgroundColor: color.celebrate,
  },
  crest: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: motion.flow.crest,
    backgroundColor: color.celebrate,
    borderRadius: radius.pill,
    boxShadow: glow.flare.boxShadow,
  },
});

/**
 * Le déphasage d'un panneau, nommé par le panneau plutôt que par un nombre — `motion.seam.phase`
 * porte les trois valeurs, et l'écran n'a pas à savoir laquelle va où.
 */
export type SeamPanel = keyof typeof motion.seam.phase;

/** L'écran résout le mouvement une fois, les composants le reçoivent déjà tranché. */
export function seamOffset(panel: SeamPanel, decorated: DecorativeMotion<'seam'>): number | null {
  return decorated.effect === undefined ? null : decorated.effect.phase[panel];
}
