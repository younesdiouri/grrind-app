import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SystemFrame } from '@/components/SystemFrame';
import { alamMotion, color, combatMotion, radius, space, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { AL_KASAL, EnemySprite } from '@/features/combat/EnemySprite';
import type { BattleBeat } from '@/features/combat/timeline';

/** La même scène reçoit les rencontres successives ; leur entrée vient du journal serveur. */
export function RaidStage({ clock, beats, arrivals, children }: {
  clock: SharedValue<number>; beats: BattleBeat[]; arrivals: number[]; children: ReactNode;
}) {
  const reduced = useReducedMotion() !== false;
  const entry = useAnimatedStyle(() => {
    const at = arrivals.findLast((instant) => instant <= clock.get());
    const progress = at === undefined ? 0 : Math.min(1, (clock.get() - at) / combatMotion.arrivalDuration);
    return { opacity: reduced ? 1 : progress,
      transform: [{ scale: reduced ? 1 : combatMotion.arrivalScale + (1 - combatMotion.arrivalScale) * progress }] };
  });
  return <SystemFrame tier="hero" contentStyle={styles.scene}>
    <View style={styles.horizon} />
    <Text style={styles.dimension}>ʿĀLAM AL-NAFS</Text>
    <Animated.View style={[styles.enemy, entry]}>
      <EnemySprite artwork={AL_KASAL} clock={clock} beats={beats} />
    </Animated.View>
    <View style={styles.ground} />
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.roster}>
      {children}
    </ScrollView>
  </SystemFrame>;
}

const styles = StyleSheet.create({
  scene: { overflow: 'hidden', paddingTop: space.md, backgroundColor: color.background },
  dimension: { ...type.label, color: color.accent, textAlign: 'center' },
  enemy: { height: alamMotion.stageHeight },
  horizon: { position: 'absolute', alignSelf: 'center', top: space.xl, width: '85%',
    height: alamMotion.stageHeight, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  ground: { height: StyleSheet.hairlineWidth, backgroundColor: color.accent, marginHorizontal: space.md },
  roster: { flexGrow: 1, justifyContent: 'center', gap: space.md, padding: space.md, paddingTop: space.lg },
});
