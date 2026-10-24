import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { cancelAnimation, Easing, ReduceMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { RaidStage } from '@/features/alam/RaidStage';
import { alamStyles as s } from '@/features/alam/styles';
import { useAlamSound } from '@/features/alam/useAlamSound';

const MEMBERS = ['Younes', 'Amine', 'Aimane', 'Sara', 'Ilyes', 'Nora', 'Malik'].map((name) => ({ id: name, name }));
const EVENTS: components['schemas']['AlamEvent'][] = [1, 2].flatMap((encounterIndex) => {
  const start = (encounterIndex - 1) * 12_000;
  return [
    { id: `arrival-${encounterIndex}`, offsetMs: start, encounterIndex, action: 'ARRIVAL', actorId: null, targetId: null, text: '' },
    ...MEMBERS.map((member, index) => ({ id: `effort-${encounterIndex}-${index}`, offsetMs: start + 1500 + index * 1250,
      encounterIndex, action: 'EFFORT' as const, actorId: member.id, targetId: null, text: '' })),
    { id: `victory-${encounterIndex}`, offsetMs: start + 10_200, encounterIndex, action: 'VICTORY', actorId: null, targetId: null, text: '' },
  ];
});
const DURATION = 24_000;

export default function AlamDemo() {
  const { at } = useLocalSearchParams<{ at?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return <Demo key={at} at={at} />;
}

function Demo({ at }: { at?: string }) {
  const clock = useSharedValue(at ? Math.max(0, Math.min(DURATION, Number(at) || 0)) : 0);
  const [boss, setBoss] = useState(Number(at) >= 12_000);
  const [finished, setFinished] = useState(Number(at) >= DURATION);
  const sound = useAlamSound(!finished);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    const instant = at ? Math.max(0, Math.min(DURATION, Number(at) || 0)) : 0;
    clock.set(instant); setBoss(instant >= 12_000); setFinished(instant >= DURATION);
    if (at) return;
    clock.set(withTiming(DURATION, { duration: DURATION, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    timers.current = [setTimeout(() => setBoss(true), 12_000), setTimeout(() => setFinished(true), DURATION)];
  }, [at, clock]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelAnimation(clock); }, [clock]);
  return <>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    <RaidStage clock={clock} events={EVENTS} members={MEMBERS} finalEncounter={2} onReady={play}>
      <View style={s.raidHeader}>
        <View style={s.raidHeading}><Text style={s.label}>DÉMONSTRATION · AUCUN GAIN RÉEL</Text>
          <Text style={s.raidTitle}>{boss ? 'Al Kasal · la paresse' : 'Les petits canapés d’Al Kasal'}</Text></View>
        <Text style={s.raidRoster}>Younes · Amine · Aimane · Sara · Ilyes · Nora · Malik</Text>
      </View>
      <View style={s.raidPanel}>
        <Text style={s.body}>{finished ? 'La guilde a repoussé la paresse. Démonstration terminée.'
          : boss ? 'Al Kasal : « Cinq petites minutes de plus… »' : 'La guilde vient au contact. Chaque membre apporte son effort.'}</Text>
        <View style={s.raidActions}>
          <Button label="Rejouer la scène" onPress={play} />
          <Button label={sound.enabled ? 'Couper le son' : 'Activer le son'} onPress={sound.toggle} variant="quiet" />
          <Button label="Fermer" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} variant="quiet" />
        </View>
      </View>
    </RaidStage>
  </>;
}
