import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SystemFrame } from '@/components/SystemFrame';
import { arena, color, combatMotion, radius, space, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import type { Impact } from '@/features/combat/camera';
import { AL_KASAL, DEFAULT_RAID_HERO, FighterSprite, type FighterArtwork } from '@/features/combat/FighterSprite';
import { Stage } from '@/features/combat/Stage';
import type { BattleBeat } from '@/features/combat/timeline';

export type RaidHero = { id: string; name: string; beats: BattleBeat[]; artwork?: FighterArtwork };

/** Carte vue de haut : les cinq contributeurs en grand, les autres sur les rangs du fond. */
export function RaidStage({ clock, beats, arrivals, heroes, impacts, boss = AL_KASAL }: {
  clock: SharedValue<number>; beats: BattleBeat[]; arrivals: number[];
  heroes: RaidHero[]; impacts: Impact[]; boss?: FighterArtwork;
}) {
  const reduced = useReducedMotion() !== false;
  const entry = useAnimatedStyle(() => {
    const at = arrivals.findLast((instant) => instant <= clock.get());
    const progress = at === undefined ? 0 : Math.min(1, (clock.get() - at) / combatMotion.arrivalDuration);
    return { opacity: reduced ? 1 : progress,
      transform: [{ scale: reduced ? 1 : combatMotion.arrivalScale + (1 - combatMotion.arrivalScale) * progress }] };
  });
  return <SystemFrame tier="hero" contentStyle={styles.scene}>
    <Stage clock={clock} impacts={impacts} points={arena.raidImpactPoint} style={styles.map}>
      <Image source={require('../../../assets/images/arenas/alam.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <Animated.View style={[styles.enemy, entry]}>
        <RaidFighter key={JSON.stringify(boss.poses)} artwork={boss} fallback={AL_KASAL} clock={clock} beats={beats} />
      </Animated.View>
      {heroes.map((hero, index) => {
        const large = index < arena.raidFirstRow.length;
        const rank = index - arena.raidFirstRow.length;
        const point = large ? arena.raidFirstRow[index] : {
          x: arena.raidBackX + (rank % arena.raidBackColumns) * arena.raidBackStepX,
          y: arena.raidBackY + Math.floor(rank / arena.raidBackColumns) * arena.raidBackStepY,
        };
        const width = large ? arena.raidHeroWidth : arena.raidSmallWidth;
        const height = large ? arena.raidHeroHeight : arena.raidSmallHeight;
        const artwork = hero.artwork ?? DEFAULT_RAID_HERO;
        return <View key={hero.id} style={[styles.hero, { left: `${point.x * 100}%`, top: `${point.y * 100}%`,
          width, height, marginLeft: -width / 2, marginTop: -height * arena.baseline, zIndex: Math.round(point.y * 100) }]}
          accessibilityLabel={hero.name}>
          <RaidFighter key={JSON.stringify(artwork.poses)} artwork={artwork} fallback={DEFAULT_RAID_HERO}
            side="PLAYER" clock={clock} beats={hero.beats} />
          {large && <Text style={styles.name} numberOfLines={1}>{hero.name}</Text>}
        </View>;
      })}
    </Stage>
    <Text style={styles.dimension}>ʿĀLAM AL-NAFS</Text>
  </SystemFrame>;
}

function RaidFighter({ artwork, fallback, ...props }: Omit<React.ComponentProps<typeof FighterSprite>, 'artwork'> & {
  artwork: FighterArtwork; fallback: FighterArtwork;
}) {
  const [failed, setFailed] = useState(false);
  return <FighterSprite key={failed ? 'fallback' : 'remote'} artwork={failed ? fallback : artwork}
    {...props} onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  scene: { overflow: 'hidden', backgroundColor: color.background },
  map: { height: arena.raidHeight },
  dimension: { position: 'absolute', top: 0, left: 0, right: 0, ...type.label, color: color.accent, textAlign: 'center', padding: space.sm, backgroundColor: arena.scrim },
  enemy: { position: 'absolute', left: `${arena.raidBoss.x * 100}%`, top: `${arena.raidBoss.y * 100}%`,
    width: arena.raidBossWidth, height: arena.raidBossHeight, marginLeft: -arena.raidBossWidth / 2,
    marginTop: -arena.raidBossHeight * arena.baseline, zIndex: Math.round(arena.raidBoss.y * 100) },
  hero: { position: 'absolute' },
  name: { ...type.label, color: color.text, textAlign: 'center', letterSpacing: 0,
    backgroundColor: arena.scrim, borderRadius: radius.sm, paddingHorizontal: space.xs },
});
