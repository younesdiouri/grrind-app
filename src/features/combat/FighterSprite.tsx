import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { color, combatMotion, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { fighterMotionAt, type FighterPose } from './fighterMotion';
import type { Actor, BattleBeat } from './timeline';
import { ENEMY_IMAGE_TIMEOUT_MS, type FighterArtwork } from './enemyPresentation';

export type { FighterArtwork } from './enemyPresentation';
export const AL_KASAL: FighterArtwork = {
  name: 'Al-Kasal',
  introduction: "je suis la paresse, laissez tomber, ce jeu n'est pas fait pour vous.",
  poses: {
    idle: require('../../../assets/images/enemies/al-kasal/idle.png'),
    attack: require('../../../assets/images/enemies/al-kasal/attack.png'),
    hit: require('../../../assets/images/enemies/al-kasal/hit.png'),
  },
};

/** Le héros par défaut, vu de dos (#187). Provisoire : voir son `README.md`. */
export const DEFAULT_HERO: FighterArtwork = {
  name: 'Toi',
  poses: {
    idle: require('../../../assets/images/heroes/default/idle.png'),
    attack: require('../../../assets/images/heroes/default/attack.png'),
    hit: require('../../../assets/images/heroes/default/hit.png'),
  },
};

const poses: FighterPose[] = ['idle', 'attack', 'hit'];

/** Les trois images se chargent ensemble ; aucune source ne change au milieu d'un coup. */
export function FighterSprite({ artwork, side = 'ENEMY', clock, beats, pose, onReady, onError }: {
  artwork: FighterArtwork;
  /** Le camp qu'il incarne : il oriente l'élan et le recul. */
  side?: Actor;
  clock: SharedValue<number>;
  beats: BattleBeat[];
  pose?: FighterPose;
  onReady?: () => void;
  onError?: () => void;
}) {
  const loaded = useRef(new Set<FighterPose>());
  const settled = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    timeout.current = setTimeout(() => {
      if (settled.current) return;
      settled.current = true;
      setFailed(true);
      onError?.();
    }, ENEMY_IMAGE_TIMEOUT_MS);
    return () => clearTimeout(timeout.current);
  }, [onError]);
  const fail = () => {
    if (settled.current) return;
    settled.current = true;
    clearTimeout(timeout.current);
    setFailed(true);
    onError?.();
  };
  const reduced = useReducedMotion();
  const motion = useDerivedValue(() => fighterMotionAt(beats, side, clock.get(), reduced !== false));
  const transform = useAnimatedStyle(() => ({
    transform: pose ? [] : [
      { translateX: motion.get().x }, { translateY: motion.get().y },
      { scale: motion.get().scale }, { rotate: `${motion.get().rotate}deg` },
    ],
  }));
  const flash = useAnimatedStyle(() => ({ opacity: pose ? 0 : motion.get().flash * combatMotion.flashOpacity }));
  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.body, transform]}>
        {poses.map((candidate) => (
          <PoseLayer key={candidate} source={artwork.poses[candidate]} candidate={candidate}
            selected={pose} motion={motion} onError={fail}
            onLoad={() => {
              if (settled.current) return;
              loaded.current.add(candidate);
              if (loaded.current.size === poses.length) {
                settled.current = true;
                clearTimeout(timeout.current);
                onReady?.();
              }
            }} />
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
  motion: SharedValue<ReturnType<typeof fighterMotionAt>>;
  onLoad: () => void;
  onError: () => void;
}) {
  const style = useAnimatedStyle(() => ({ opacity: (selected ?? motion.get().pose) === candidate ? 1 : 0 }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain"
        transition={0} cachePolicy="memory-disk" onLoad={onLoad} onError={onError} accessible={false} />
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
