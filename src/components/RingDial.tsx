import Animated, {
  useAnimatedProps,
  useDerivedValue,
  type DerivedValue,
} from 'react-native-reanimated';
import { Circle } from 'react-native-svg';

import { useBackdropClock } from '@/components/AmbientBackdrop';
import type { RingGeometry } from '@/components/attributeArcs';
import { orbitRadius, sweepGeometry } from '@/components/ringMotion';
import { cyclePhase } from '@/design/motionPhase';
import { color, motion } from '@/design/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Le cadran : ce qui transforme le cercle de vie en instrument (#159).
 *
 * Le nom diffère de celui de sa géométrie (`ringMotion.ts`) par plus qu'une casse, et pour la
 * raison déjà écrite dans `attributeArcs.ts` : `tsc` refuse deux fichiers d'un même dossier qui
 * ne diffèrent que par la casse (TS1149), portabilité oblige. Même écart que `guildCapacity.ts`
 * / `CapacityGauge.tsx`, son modèle.
 *
 * Deux couches posées **autour** et **derrière** les arcs, qui ne changent rien à leur
 * géométrie. Elles tournent en sens opposés, et c'est là tout l'effet : deux sens contraires
 * font lire un mécanisme, un seul ferait lire une image qui tourne.
 *
 * ————— Les deux tournent par leur décalage de tirets ————————————————————————————————————
 *
 * Ni l'une ni l'autre ne porte de rotation. Elles font avancer `strokeDashoffset`, un nombre —
 * exactement ce que `GrowingArc` anime déjà par `useAnimatedProps` — plutôt qu'une chaîne
 * `rotate(…)` sur un `<G>`, qui serait le seul point de ce lot dont le support
 * Reanimated × `react-native-svg` ne soit pas déjà prouvé ici.
 *
 * Le signe porte le sens : un décalage **croissant** recule le motif le long du tracé, donc
 * anti-horaire ; un décalage décroissant l'avance. La couronne prend le premier, le secteur le
 * second. Voir `ringMotion.ts` pour la géométrie, qui est pure et testée.
 */

/**
 * La couronne : un cercle pointillé posé à `motion.orbit.inset` du rayon net, qui dérive
 * lentement en sens anti-horaire.
 *
 * Elle avance d'un pas de pointillé par cycle, et non d'un tour : c'est la seule période
 * réellement visible d'un pointillé qui dérive — rien ne distingue le tiret n° 1 du n° 51 — et
 * c'est ce qui lui permet de boucler proprement sur une horloge de douze secondes tout en
 * mettant vingt-quatre secondes à faire le tour.
 */
export function OrbitCrown({ geometry }: { geometry: RingGeometry }) {
  const clock = useBackdropClock();
  const pitch = motion.orbit.dash + motion.orbit.gap;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: cyclePhase(clock.value, motion.orbit.cycle) * pitch,
  }));

  return (
    <AnimatedCircle
      cx={geometry.origin}
      cy={geometry.origin}
      r={orbitRadius(geometry.radius, motion.orbit.inset)}
      stroke={color.accent}
      strokeWidth={motion.orbit.width}
      strokeOpacity={motion.orbit.opacity}
      strokeDasharray={`${motion.orbit.dash} ${motion.orbit.gap}`}
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

/**
 * Le secteur : un balayage de `motion.sweep.wedge` degrés qui tourne dans le sens horaire, sous
 * les arcs et sous le chiffre de Vitalité.
 *
 * Un seul cercle par sous-secteur, d'un rayon égal au quart du diamètre voulu et d'une épaisseur
 * égale à sa moitié : un tel trait couvre du centre au bord, ce qui fait un secteur plein sans
 * calculer les points d'un chemin — la même idée que le donut d'`arcStroke`, poussée à son
 * extrême.
 *
 * Une seule valeur dérivée nourrit toutes les tranches : elles partagent la même position et ne
 * peuvent donc pas se désolidariser, ce que six lectures indépendantes de l'horloge ne
 * garantiraient pas au frame près.
 */
export function SweepSector({ geometry }: { geometry: RingGeometry }) {
  const clock = useBackdropClock();
  const sweep = sweepGeometry(
    motion.sweep.diameter,
    motion.sweep.wedge,
    motion.sweep.steps,
    motion.sweep.opacity,
  );

  const travelled = useDerivedValue(
    () => cyclePhase(clock.value, motion.sweep.cycle) * sweep.circumference,
  );

  return (
    <>
      {sweep.steps.map((step) => (
        <SweepStepArc
          key={step.offset}
          geometry={geometry}
          sweep={sweep}
          step={step}
          travelled={travelled}
        />
      ))}
    </>
  );
}

function SweepStepArc({
  geometry,
  sweep,
  step,
  travelled,
}: {
  geometry: RingGeometry;
  sweep: ReturnType<typeof sweepGeometry>;
  step: ReturnType<typeof sweepGeometry>['steps'][number];
  travelled: DerivedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({
    // Décroissant : le motif avance le long du tracé, donc dans le sens horaire — l'inverse de
    // la couronne, qui recule.
    strokeDashoffset: step.offset - travelled.value,
  }));

  return (
    <AnimatedCircle
      cx={geometry.origin}
      cy={geometry.origin}
      r={sweep.radius}
      stroke={color.accent}
      strokeWidth={sweep.strokeWidth}
      strokeOpacity={step.opacity}
      strokeDasharray={`${step.length} ${sweep.circumference - step.length}`}
      fill="none"
      animatedProps={animatedProps}
    />
  );
}
