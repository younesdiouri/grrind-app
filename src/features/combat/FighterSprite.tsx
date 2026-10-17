import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { color, combatMotion, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { fighterMotionAt, fighterPoseAt, type FighterPose, type PoseSignals } from './fighterMotion';
import type { Actor, BattleBeat } from './timeline';
import { ENEMY_IMAGE_TIMEOUT_MS, type FighterArtwork } from './enemyPresentation';
import { equipmentPlacement, type EquipmentArtwork, type FighterAttachments } from './equipmentArtwork';

export type { FighterArtwork } from './enemyPresentation';
export { AL_KASAL } from './bundledMobs';

/** Repli local : garde latérale orientée vers la droite (#187 / #189). */
export const DEFAULT_HERO: FighterArtwork = {
  name: 'Toi',
  poses: {
    idle: require('../../../assets/images/heroes/retro-strength/v1/back/idle.png'),
    attack: require('../../../assets/images/heroes/retro-strength/v1/back/attack.png'),
    hit: require('../../../assets/images/heroes/retro-strength/v1/back/hit.png'),
    critical: require('../../../assets/images/heroes/retro-strength/v1/back/critical.png'),
    dodge: require('../../../assets/images/heroes/retro-strength/v1/back/dodge.png'),
    combo: require('../../../assets/images/heroes/retro-strength/v1/back/combo.png'),
    replay: require('../../../assets/images/heroes/retro-strength/v1/back/replay.png'),
  },
};

export const DEFAULT_OPPONENT: FighterArtwork = {
  name: 'Muscu',
  poses: {
    idle: require('../../../assets/images/heroes/retro-strength/v1/front/idle.png'),
    attack: require('../../../assets/images/heroes/retro-strength/v1/front/attack.png'),
    hit: require('../../../assets/images/heroes/retro-strength/v1/front/hit.png'),
    critical: require('../../../assets/images/heroes/retro-strength/v1/front/critical.png'),
    dodge: require('../../../assets/images/heroes/retro-strength/v1/front/dodge.png'),
    combo: require('../../../assets/images/heroes/retro-strength/v1/front/combo.png'),
    replay: require('../../../assets/images/heroes/retro-strength/v1/front/replay.png'),
  },
};
export const DEFAULT_RAID_HERO: FighterArtwork = {
  name: 'Muscu',
  poses: {
    idle: require('../../../assets/images/heroes/retro-strength/v1/thumb/front/idle.png'),
    attack: require('../../../assets/images/heroes/retro-strength/v1/thumb/front/attack.png'),
    hit: require('../../../assets/images/heroes/retro-strength/v1/thumb/front/hit.png'),
  },
};

/** Les poses disponibles se chargent ensemble ; aucune source ne change au milieu d'un coup. */
export function FighterSprite({ artwork, equipment = [], side = 'ENEMY', clock, beats, pose, signals, lateral = false, staticPreview = false, onReady, onError }: {
  artwork: FighterArtwork;
  equipment?: EquipmentArtwork[];
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
  const wearables = equipment.filter((item) => artwork.attachments?.[item.attachment]);
  const foregroundPoses = wearables.length ? poses.filter((entry) => artwork.foreground?.[entry]) : [];
  const loaded = useRef(new Set<string>());
  const settled = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [equipmentFailed, setEquipmentFailed] = useState<Set<string>>(new Set());
  const [canvasSize, setCanvasSize] = useState<number>();
  const ready = (candidate: string) => {
    if (settled.current) return;
    loaded.current.add(candidate);
    if (poses.every((entry) => loaded.current.has(entry)) && wearables.every((item) => loaded.current.has(item.key)) && foregroundPoses.every((entry) => loaded.current.has('foreground-' + entry))) {
      settled.current = true;
      clearTimeout(timeout.current);
      onReady?.();
    }
  };
  useEffect(() => {
    timeout.current = setTimeout(() => {
      if (settled.current) return;
      settled.current = true;
      if (poses.every((entry) => loaded.current.has(entry)) && foregroundPoses.every((entry) => loaded.current.has('foreground-' + entry))) {
        // Un accessoire lent est facultatif : jouer le corps prêt sans le faire apparaître en plein coup.
        setEquipmentFailed(new Set(wearables.filter((item) => !loaded.current.has(item.key)).map((item) => item.key)));
        onReady?.();
        return;
      }
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
        {wearables.filter((item) => item.plane === 'behind' && !equipmentFailed.has(item.key)).map((item) => (
          <EquipmentLayer key={item.key} item={item} attachments={artwork.attachments?.[item.attachment]}
            selected={pose} motion={motion} onLoad={() => ready(item.key)}
            onError={() => { setEquipmentFailed((failed) => new Set([...failed, item.key])); ready(item.key); }} />
        ))}
        {poses.map((candidate) => (
          <PoseLayer key={candidate} source={artwork.poses[candidate]!} candidate={candidate}
            selected={pose} motion={motion} onError={fail}
            onLoad={() => ready(candidate)} />
        ))}
        {wearables.filter((item) => item.plane === 'front' && !equipmentFailed.has(item.key)).map((item) => (
          <EquipmentLayer key={item.key} item={item} attachments={artwork.attachments?.[item.attachment]}
            selected={pose} motion={motion} onLoad={() => ready(item.key)}
            onError={() => { setEquipmentFailed((failed) => new Set([...failed, item.key])); ready(item.key); }} />
        ))}
        {foregroundPoses.map((candidate) => <PoseLayer key={'foreground-' + candidate}
          source={artwork.foreground![candidate]!} candidate={candidate} selected={pose} motion={motion}
          onLoad={() => ready('foreground-' + candidate)} onError={fail} />)}
        <Animated.View style={[styles.flash, flash]} />
      </Animated.View>
      {failed && <Text style={styles.error}>Illustration indisponible. Reviens puis réessaie.</Text>}
    </View>
  );
}

function EquipmentLayer({ item, attachments, selected, motion, onLoad, onError }: {
  item: EquipmentArtwork;
  attachments?: FighterAttachments;
  selected?: FighterPose;
  motion: SharedValue<Omit<ReturnType<typeof fighterMotionAt>, 'pose'> & { pose: FighterPose }>;
  onLoad: () => void;
  onError: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const box = equipmentPlacement(attachments, selected ?? motion.get().pose, item, !!item.mirror);
    if (!box) return { opacity: 0 };
    return { opacity: 1, left: `${box.left * 100}%`, top: `${box.top * 100}%`,
      width: `${box.width * 100}%`, height: `${box.height * 100}%`,
      transformOrigin: [`${box.pivotX * 100}%`, `${box.pivotY * 100}%`, 0],
      transform: [{ rotate: `${box.rotate}deg` }, { scaleX: item.mirror ? -1 : 1 }] };
  });
  return <Animated.View style={[styles.equipment, style]}>
    <Image source={item.source} style={StyleSheet.absoluteFill} contentFit="contain" enforceEarlyResizing
      transition={0} cachePolicy="memory-disk" onLoad={onLoad} onError={onError} accessible={false} />
  </Animated.View>;
}

function PoseLayer({ source, candidate, selected, motion, onLoad, onError }: {
  source: ImageSource;
  candidate: FighterPose;
  selected?: FighterPose;
  motion: SharedValue<Omit<ReturnType<typeof fighterMotionAt>, 'pose'> & { pose: FighterPose }>;
  onLoad: () => void;
  onError: () => void;
}) {
  const style = useAnimatedStyle(() => ({ opacity: (selected ?? motion.get().pose) === candidate ? 1 : 0 }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain"
        enforceEarlyResizing transition={0} cachePolicy="memory-disk" onLoad={onLoad} onError={onError} accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { width: '100%', height: '100%', margin: combatMotion.spriteInset },
  equipment: { position: 'absolute' },
  flash: { position: 'absolute', top: '45%', left: '45%', width: combatMotion.impactSize,
    height: combatMotion.impactSize, backgroundColor: color.text, borderRadius: combatMotion.impactSize },
  error: { ...type.label, color: color.danger, textAlign: 'center', position: 'absolute' },
});
