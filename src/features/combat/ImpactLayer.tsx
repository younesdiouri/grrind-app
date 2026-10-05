import { Canvas, Circle, Group, Path, RadialGradient, usePathValue } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { type SharedValue, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { color, combatEffects, combatMotion } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { IMPACT, type Impact } from './camera.ts';
import { burstAt, sparkAt } from './sparks.ts';
import { sampleRamp } from './sampling.ts';
import type { Actor, Ramp } from './timeline.ts';

/**
 * La lumière de la scène (#187) : une gerbe d'étincelles et une lueur **additive** à chaque
 * impact, un anneau autour de celui qui enchaîne un combo.
 *
 * Tout se dessine sur le thread UI à partir de la même horloge que les sprites : aucune
 * particule n'est un composant, la gerbe entière est **un** chemin reconstruit à chaque image.
 * Sous Réduire les animations, la couche ne dessine rien — les images d'effet restent lisibles.
 */
type Points = Record<Actor, { x: number; y: number }>;

export function ImpactLayer({ clock, impacts, combos, points = combatMotion.impactPoint }: {
  clock: SharedValue<number>;
  impacts: Impact[];
  combos?: Record<Actor, Ramp>;
  /** Où se tient chaque camp, en fractions de la couche. Par défaut, la scène du 1v1. */
  points?: Points;
}) {
  const reduced = useReducedMotion() !== false;
  const size = useSharedValue({ width: 0, height: 0 });
  const burst = useDerivedValue(() => (reduced ? undefined : burstAt(impacts, clock.get())));
  const origin = useDerivedValue(() => {
    const point = points[burst.get()?.impact.target ?? 'ENEMY'];
    return { x: point.x * size.get().width, y: point.y * size.get().height };
  });

  const sparks = usePathValue((builder) => {
    'worklet';
    const current = burst.get();
    if (!current) return;
    for (let index = 0; index < combatMotion.sparkCount; index++) {
      const spark = sparkAt(index, combatMotion.sparkCount, current.progress, current.impact.strength);
      builder.addCircle(origin.get().x + spark.x, origin.get().y + spark.y, spark.radius);
    }
  });
  const sparkColor = useDerivedValue(() =>
    (burst.get()?.impact.strength ?? IMPACT.blow) > IMPACT.blow ? combatEffects.critical : color.accent);

  const glowRadius = useDerivedValue(() => {
    const current = burst.get();
    if (!current) return 0;
    return combatMotion.glowRadius * (0.6 + 0.4 * current.impact.strength) * (0.5 + current.progress / 2);
  });
  const glowOpacity = useDerivedValue(() => {
    const current = burst.get();
    if (!current) return 0;
    return Math.min(1, combatMotion.glowOpacity * current.impact.strength * (1 - current.progress) ** 2);
  });
  const glowColors = useDerivedValue(() => [sparkColor.get(), 'transparent']);
  const glowX = useDerivedValue(() => origin.get().x);
  const glowY = useDerivedValue(() => origin.get().y);

  return (
    <Canvas style={StyleSheet.absoluteFill} onSize={size} pointerEvents="none">
      <Group blendMode="plus">
        <Circle cx={glowX} cy={glowY} r={glowRadius} opacity={glowOpacity}>
          <RadialGradient c={origin} r={glowRadius} colors={glowColors} />
        </Circle>
        <Path path={sparks} color={sparkColor} />
        {combos && !reduced && (['ENEMY', 'PLAYER'] as const).map((side) =>
          <ComboRing key={side} clock={clock} flash={combos[side]} point={points[side]} size={size} />)}
      </Group>
    </Canvas>
  );
}

/** L'anneau se resserre sur le combattant pendant que son combo s'allume. */
function ComboRing({ clock, flash, point, size }: {
  clock: SharedValue<number>; flash: Ramp; point: Points[Actor]; size: SharedValue<{ width: number; height: number }>;
}) {
  const lit = useDerivedValue(() => sampleRamp(flash, clock.get()));
  const radius = useDerivedValue(() => combatMotion.comboRing * (1.3 - lit.get() * 0.4));
  const x = useDerivedValue(() => point.x * size.get().width);
  const y = useDerivedValue(() => point.y * size.get().height);
  return <Circle cx={x} cy={y} r={radius} opacity={lit} style="stroke" strokeWidth={combatMotion.comboStroke}
    color={combatEffects.combo} />;
}
