import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { Button } from '@/components/Button';
import { useReducedMotion } from '@/design/useReducedMotion';
import { RaidAvatar } from '@/features/alam/RaidAvatar';
import { RaidStage } from '@/features/alam/RaidStage';
import { alamStyles as s } from '@/features/alam/styles';
import { useAlamSound } from '@/features/alam/useAlamSound';
import { BATTLE_FIXTURES } from '@/features/combat/fixtures';
import { buildBattleTimeline } from '@/features/combat/timeline';

const timeline = buildBattleTimeline(BATTLE_FIXTURES.victoire, { illustrated: true });

export default function AlamDemo() {
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><Demo /></AmbientBackdropProvider>;
}

function Demo() {
  const clock = useSharedValue(0);
  const reduced = useReducedMotion() !== false;
  const sound = useAlamSound(true);
  useEffect(() => { clock.set(withTiming(timeline.duration, { duration: timeline.duration, easing: Easing.linear })); }, [clock]);
  return <ScrollView contentContainerStyle={s.screen}>
    <Stack.Screen options={{ title: 'Atelier visuel du raid' }} />
    <Text style={s.label}>DÉMONSTRATION · AUCUN GAIN RÉEL</Text>
    <Text style={s.title}>La guilde face à Al-Kasal</Text>
    <RaidStage clock={clock} beats={timeline.beats} arrivals={[0]}>
      {['Younes', 'Amine', 'Aimane'].map((name, index) => <RaidAvatar key={name} name={name} avatarUrl={null}
        impulses={timeline.beats.filter((beat) => beat.kind === 'attack' && beat.attacker === 'PLAYER')
          .filter((_, i) => i % 3 === index).map((beat) => beat.at)} clock={clock} reduced={reduced} />)}
    </RaidStage>
    <Text style={s.body}>Les efforts de chacun prennent place dans le même combat.</Text>
    <Button label={sound.enabled ? 'Couper le son' : 'Activer le son'} onPress={sound.toggle} variant="quiet" />
    <Button label="Rejouer la scène" onPress={() => { clock.set(0); clock.set(withTiming(timeline.duration, { duration: timeline.duration, easing: Easing.linear })); }} />
  </ScrollView>;
}
