import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { alamMotion, color, radius, space, type } from '@/design/tokens';

/** Une impulsion est une action déjà livrée, jamais une attaque simulée par l'avatar. */
export function RaidAvatar({ name, avatarUrl, impulses, clock, reduced }: {
  name: string; avatarUrl: string | null; impulses: number[]; clock: SharedValue<number>; reduced: boolean;
}) {
  const movement = useAnimatedStyle(() => {
    const now = clock.get();
    const at = impulses.findLast((instant) => instant <= now);
    const progress = at === undefined ? 1 : Math.min(1, (now - at) / alamMotion.impulseDuration);
    return { transform: [{ translateY: reduced ? 0 : -Math.sin(progress * Math.PI) * alamMotion.travel }],
      borderColor: progress < 1 ? color.accent : color.border };
  });
  const beam = useAnimatedStyle(() => {
    const now = clock.get();
    const at = impulses.findLast((instant) => instant <= now);
    const progress = at === undefined ? 1 : Math.min(1, (now - at) / alamMotion.impulseDuration);
    return { opacity: reduced || progress >= 1 ? 0 : 1 - progress,
      transform: [{ translateY: -progress * alamMotion.beamTravel }] };
  });
  return <View style={styles.actor} accessibilityLabel={name}>
    <Animated.View style={[styles.beam, beam]} />
    <Animated.View style={[styles.avatar, movement]}>
      {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.image} contentFit="cover" /> : <PlayerAvatar name={name} />}
    </Animated.View>
    <Text style={styles.name} numberOfLines={2}>{name}</Text>
  </View>;
}

const styles = StyleSheet.create({
  actor: { width: alamMotion.actorWidth, alignItems: 'center', gap: space.xs },
  avatar: { width: alamMotion.avatarSize, height: alamMotion.avatarSize, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, backgroundColor: color.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', borderRadius: radius.pill },
  name: { ...type.label, color: color.text, textAlign: 'center', letterSpacing: 0 },
  beam: { position: 'absolute', width: alamMotion.beamWidth, height: alamMotion.beamHeight, backgroundColor: color.accent },
});
