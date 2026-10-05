import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SystemFrame } from '@/components/SystemFrame';
import { alamMotion, color, combatMotion, radius, space, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { cameraAt, type Impact } from '@/features/combat/camera';
import { AL_KASAL, DEFAULT_HERO, FighterSprite } from '@/features/combat/FighterSprite';
import { ImpactLayer } from '@/features/combat/ImpactLayer';
import type { BattleBeat } from '@/features/combat/timeline';

export type RaidHero = { id: string; name: string; beats: BattleBeat[] };

/**
 * La même scène reçoit les rencontres successives ; leur entrée vient du journal serveur.
 *
 * Depuis #187 elle parle la langue du combat : le boss et le premier rang sont des
 * `FighterSprite` sur l'horloge du raid, la caméra tremble aux impacts et la lumière est celle
 * du 1v1. Les membres au-delà du premier rang restent en pastille, derrière (`children`).
 */
export function RaidStage({ clock, beats, arrivals, heroes, impacts, children }: {
  clock: SharedValue<number>; beats: BattleBeat[]; arrivals: number[];
  heroes: RaidHero[]; impacts: Impact[]; children?: ReactNode;
}) {
  const reduced = useReducedMotion() !== false;
  const entry = useAnimatedStyle(() => {
    const at = arrivals.findLast((instant) => instant <= clock.get());
    const progress = at === undefined ? 0 : Math.min(1, (clock.get() - at) / combatMotion.arrivalDuration);
    return { opacity: reduced ? 1 : progress,
      transform: [{ scale: reduced ? 1 : combatMotion.arrivalScale + (1 - combatMotion.arrivalScale) * progress }] };
  });
  const camera = useAnimatedStyle(() => {
    const state = cameraAt(impacts, clock.get(), reduced);
    return { transform: [{ translateX: state.x }, { translateY: state.y }, { scale: state.scale }] };
  });
  return <SystemFrame tier="hero" contentStyle={styles.scene}>
    <Animated.View style={camera}>
      <View style={styles.horizon} />
      <Text style={styles.dimension}>ʿĀLAM AL-NAFS</Text>
      <Animated.View style={[styles.enemy, entry]}>
        <FighterSprite artwork={AL_KASAL} clock={clock} beats={beats} />
      </Animated.View>
      <View style={styles.front}>
        {heroes.map((hero) => <View key={hero.id} style={styles.hero} accessibilityLabel={hero.name}>
          <View style={styles.heroSprite}>
            <FighterSprite artwork={DEFAULT_HERO} side="PLAYER" clock={clock} beats={hero.beats} />
          </View>
          <Text style={styles.name} numberOfLines={1}>{hero.name}</Text>
        </View>)}
      </View>
      <ImpactLayer clock={clock} impacts={impacts} points={alamMotion.impactPoint} />
    </Animated.View>
    <View style={styles.ground} />
    {children && <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.roster}>
      {children}
    </ScrollView>}
  </SystemFrame>;
}

const styles = StyleSheet.create({
  scene: { overflow: 'hidden', paddingTop: space.md, backgroundColor: color.background },
  dimension: { ...type.label, color: color.accent, textAlign: 'center' },
  enemy: { height: alamMotion.bossHeight },
  horizon: { position: 'absolute', alignSelf: 'center', top: space.xl, width: '85%',
    height: alamMotion.bossHeight, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  front: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: space.sm },
  hero: { width: alamMotion.heroWidth, alignItems: 'center' },
  heroSprite: { width: alamMotion.heroWidth, height: alamMotion.heroHeight },
  name: { ...type.label, color: color.text, textAlign: 'center', letterSpacing: 0 },
  ground: { height: StyleSheet.hairlineWidth, backgroundColor: color.accent, marginHorizontal: space.md, marginTop: space.sm },
  roster: { flexGrow: 1, justifyContent: 'center', gap: space.md, padding: space.md, paddingTop: space.lg },
});
