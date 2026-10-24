import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { color, combatMotion, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { fighterMotionAt, fighterPoseAt, type FighterPose, type PoseSignals } from './fighterMotion';
import type { Actor, BattleBeat } from './timeline';
import { ENEMY_IMAGE_TIMEOUT_MS, type FighterArtwork } from './enemyPresentation';

export type { FighterArtwork } from './enemyPresentation';
export { AL_KASAL } from './bundledMobs';

/** Les poses disponibles se chargent ensemble ; aucune source ne change au milieu d'un coup. */
export function FighterSprite({ artwork, side = 'ENEMY', clock, beats, pose, signals, lateral = false, staticPreview = false, onReady, onError }: {
  artwork: FighterArtwork;
  /** Le camp qu'il incarne : il oriente l'élan et le recul. */
  side?: Actor;
  clock: SharedValue<number>;
  beats: BattleBeat[];
  pose?: FighterPose;
  signals?: PoseSignals;
  lateral?: boolean;
  staticPreview?: boolean;
  onReady?: () => void;
  onError?: () => void;
}) {
  const poses = staticPreview && pose ? [pose] : Object.keys(artwork.poses) as FighterPose[];
  const sharedGuard = poses.every((entry) => JSON.stringify(artwork.poses[entry]) === JSON.stringify(artwork.poses[poses[0]]));
  const loaded = useRef(new Set<string>());
  const settled = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [canvasSize, setCanvasSize] = useState<number>();
  const ready = (candidate: string) => {
    if (settled.current) return;
    loaded.current.add(candidate);
    if (poses.every((entry) => loaded.current.has(entry))) {
      settled.current = true;
      clearTimeout(timeout.current);
      onReady?.();
    }
  };
  useEffect(() => {
    timeout.current = setTimeout(() => {
      if (settled.current) return;
      settled.current = true;
      setFailed(true);
      onError?.();
    }, ENEMY_IMAGE_TIMEOUT_MS);
    return () => clearTimeout(timeout.current);
    // Une scène remonte à chaque combat ; le délai porte sur son chargement initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fail = () => {
    if (settled.current) return;
    settled.current = true;
    clearTimeout(timeout.current);
    setFailed(true);
    onError?.();
  };
  const reduced = useReducedMotion();
  const motion = useDerivedValue(() => {
    const state = fighterMotionAt(beats, side, clock.get(), reduced !== false, lateral);
    const selected = fighterPoseAt(state.pose, clock.get(), signals);
    return { ...state, pose: artwork.poses[selected] ? selected : state.pose };
  });
  const transform = useAnimatedStyle(() => ({
    transform: pose ? [] : [
      { translateX: motion.get().x }, { translateY: motion.get().y },
      { scale: motion.get().scale }, { rotate: `${motion.get().rotate}deg` },
    ],
  }));
  const flash = useAnimatedStyle(() => ({ opacity: pose ? 0 : motion.get().flash * combatMotion.flashOpacity }));
  return (
    <View style={styles.container} pointerEvents="none" onLayout={({ nativeEvent: { layout } }) => {
      const size = Math.min(layout.width, layout.height);
      setCanvasSize((current) => current === size ? current : size);
    }}>
      <Animated.View style={[styles.body, canvasSize === undefined ? undefined : { width: canvasSize, height: canvasSize }, transform]}>
        {sharedGuard ? <Image source={artwork.poses[poses[0]]} style={StyleSheet.absoluteFill} contentFit="contain"
          enforceEarlyResizing transition={0} cachePolicy="memory-disk" onError={fail}
          onLoad={() => poses.forEach(ready)} accessible={false} /> : poses.map((candidate) => (
          <PoseLayer key={candidate} source={artwork.poses[candidate]!} candidate={candidate}
            selected={pose} motion={motion} onError={fail}
            onLoad={ready} />
        ))}
        <Animated.View style={[styles.flash, flash]} />
      </Animated.View>
      {failed && <Text style={styles.error}>Illustration indisponible. Reviens puis réessaie.</Text>}
    </View>
  );
}

function PoseLayer({ source, candidate, selected, motion, onLoad, onError }: {
  source: ImageSource;
  candidate: FighterPose;
  selected?: FighterPose;
  motion: SharedValue<Omit<ReturnType<typeof fighterMotionAt>, 'pose'> & { pose: FighterPose }>;
  onLoad: (candidate: FighterPose) => void;
  onError: () => void;
}) {
  const style = useAnimatedStyle(() => ({ opacity: (selected ?? motion.get().pose) === candidate ? 1 : 0 }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain"
        enforceEarlyResizing transition={0} cachePolicy="memory-disk" onLoad={() => onLoad(candidate)} onError={onError} accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { width: '100%', height: '100%', margin: combatMotion.spriteInset },
  flash: { position: 'absolute', top: '45%', left: '45%', width: combatMotion.impactSize,
    height: combatMotion.impactSize, backgroundColor: color.text, borderRadius: combatMotion.impactSize },
  error: { ...type.label, color: color.danger, textAlign: 'center', position: 'absolute' },
});
