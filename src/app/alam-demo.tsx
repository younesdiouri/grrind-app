import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import type { components } from '@/api/schema';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { Button } from '@/components/Button';
import { frontRow, raidBeats, raidImpacts } from '@/features/alam/presentation';
import { RaidStage } from '@/features/alam/RaidStage';
import { alamStyles as s } from '@/features/alam/styles';
import { useAlamSound } from '@/features/alam/useAlamSound';

/** Un journal synthétique : sept membres, des efforts répartis, une victoire. Aucun appel réseau. */
const MEMBERS = ['Younes', 'Amine', 'Aimane', 'Sara', 'Ilyes', 'Nora', 'Malik']
  .map((name, index) => ({ playerId: name, displayName: name, contribution: 70 - index * 9 }));
const EVENTS: components['schemas']['AlamEvent'][] = [
  { id: 'arrival', offsetMs: 0, encounterIndex: 1, action: 'ARRIVAL', actorId: null, targetId: null, text: '' },
  ...Array.from({ length: 14 }, (_, index) => ({ id: `effort-${index}`, offsetMs: 1100 + index * 650, encounterIndex: 1,
    action: 'EFFORT' as const, actorId: MEMBERS[index % MEMBERS.length].playerId, targetId: null, text: '' })),
  { id: 'victory', offsetMs: 10_800, encounterIndex: 1, action: 'VICTORY', actorId: null, targetId: null, text: '' },
];
const DURATION = 12_000;
const rows = frontRow(MEMBERS);
const heroes = [...rows.front, ...rows.back].map((member) => ({ id: member.playerId, name: member.displayName, beats: raidBeats(EVENTS, member.playerId) }));
const beats = raidBeats(EVENTS);
const impacts = raidImpacts(EVENTS);

export default function AlamDemo() {
  // `?at=4200` fige la scène à cet instant, pour les captures ; chaque instant remonte la scène.
  const { at } = useLocalSearchParams<{ at?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><Demo key={at} at={at} /></AmbientBackdropProvider>;
}

function Demo({ at }: { at?: string }) {
  const clock = useSharedValue(0);
  const sound = useAlamSound(true);
  const play = () => { clock.set(0); if (at) { clock.set(Number(at)); return; } clock.set(withTiming(DURATION, { duration: DURATION, easing: Easing.linear })); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule lecture au montage.
  useEffect(play, []);
  return <ScrollView contentContainerStyle={s.screen}>
    <Stack.Screen options={{ title: 'Atelier visuel du raid', statusBarHidden: false }} />
    <Text style={s.label}>DÉMONSTRATION · AUCUN GAIN RÉEL</Text>
    <Text style={s.title}>La guilde face à Al-Kasal</Text>
    <RaidStage clock={clock} beats={beats} arrivals={[0]} heroes={heroes} impacts={impacts} />
    <Text style={s.body}>Les efforts de chacun prennent place dans le même combat.</Text>
    <Button label={sound.enabled ? 'Couper le son' : 'Activer le son'} onPress={sound.toggle} variant="quiet" />
    <Button label="Rejouer la scène" onPress={play} />
  </ScrollView>;
}
