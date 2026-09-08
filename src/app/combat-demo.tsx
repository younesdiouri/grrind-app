import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { color, combatMotion, space, type } from '@/design/tokens';
import { BattleView } from '@/features/combat/BattleView';
import { AL_KASAL, EnemySprite } from '@/features/combat/EnemySprite';
import type { EnemyPose } from '@/features/combat/enemyMotion';
import { BATTLE_FIXTURES } from '@/features/combat/fixtures';
import { useAuth } from '@/features/auth/useAuth';
import { isE2eBuild } from '@/features/health/e2e';
import { buildBattleTimeline, type Battle } from '@/features/combat/timeline';

const POSES: { value: EnemyPose; label: string }[] = [
  { value: 'idle', label: 'Repos' }, { value: 'attack', label: 'Attaque' }, { value: 'hit', label: 'Coup reçu' },
];

export default function CombatDemoScreen() {
  const { network, frame } = useLocalSearchParams<{ network?: string; frame?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  if (isE2eBuild && network) return <AmbientBackdropProvider><NetworkDemo key={`${network}-${frame}`} scenario={network} frame={frame} /></AmbientBackdropProvider>;
  return <AmbientBackdropProvider><CombatDemo /></AmbientBackdropProvider>;
}

/** Banc réseau isolé : scripts/combat-presentation-server.mjs, jamais une mutation du catalogue. */
function NetworkDemo({ scenario, frame }: { scenario: string; frame?: string }) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`http://127.0.0.1:8099/battle/${encodeURIComponent(scenario)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('fixture'); return response.json(); })
      .then(setBattle).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [scenario]);
  let demoTime: number | undefined;
  if (battle && frame) {
    const timeline = buildBattleTimeline(battle, { illustrated: true });
    const [effect, actor] = frame.split('-');
    const side = actor === 'player' ? timeline.player : timeline.enemy;
    const ramp = effect === 'dodge' ? side.dodgeFlash : effect === 'combo' ? side.comboFlash
      : effect === 'replay' ? side.replayFlash : side.criticalFlash;
    demoTime = ramp.input[ramp.output.indexOf(1)];
  }
  return <View style={styles.screen}>
    <Text style={styles.notice}>DÉMONSTRATION RÉSEAU · AUCUN GAIN RÉEL</Text>
    {battle ? <BattleView battle={battle} demo demoTime={demoTime} onDismiss={() => router.replace('/combat-demo')} />
      : <Text style={styles.subtitle}>{error ? 'Serveur de test indisponible' : 'Chargement du scénario…'}</Text>}
  </View>;
}

function CombatDemo() {
  const auth = useAuth();
  const [pose, setPose] = useState<EnemyPose>('idle');
  const [scenario, setScenario] = useState<'victoire' | 'defaiteBoss' | null>(null);
  const clock = useSharedValue(0);
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerLeft: () => (
        <Pressable accessibilityRole="button" onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace(auth.status === 'signedIn' ? '/combat' : '/login');
        }} style={styles.close}>
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      ) }} />
      <Text style={styles.notice}>DÉMONSTRATION · AUCUN GAIN RÉEL</Text>
      {scenario ? (
        <BattleView battle={BATTLE_FIXTURES[scenario]} enemyArt={AL_KASAL} demo onDismiss={() => setScenario(null)} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Al-Kasal</Text>
          <Text style={styles.subtitle}>La paresse prend corps.</Text>
          <View style={styles.preview} testID={`al-kasal-${pose}`}>
            <EnemySprite artwork={AL_KASAL} clock={clock} beats={[]} pose={pose} />
          </View>
          <View style={styles.poses}>
            {POSES.map((option) => (
              <Pressable key={option.value} onPress={() => setPose(option.value)} accessibilityRole="button"
                accessibilityState={{ selected: pose === option.value }} style={[styles.pose, pose === option.value && styles.selected]}>
                <Text style={styles.poseLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Jouer une victoire" onPress={() => setScenario('victoire')} />
          <Button label="Jouer une défaite" variant="quiet" onPress={() => setScenario('defaiteBoss')} />
          <Text style={styles.subtitle}>Pendant le combat, touche pour passer au bilan, puis revenir ici.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  notice: { ...type.label, textAlign: 'center', color: color.textMuted, padding: space.sm },
  content: { padding: space.lg, gap: space.md },
  title: { ...type.title, color: color.text, textAlign: 'center' },
  subtitle: { ...type.body, color: color.textMuted, textAlign: 'center' },
  preview: { height: combatMotion.previewHeight },
  poses: { flexDirection: 'row', gap: space.sm },
  pose: { flex: 1, paddingVertical: space.md, borderWidth: 1, borderColor: color.border },
  selected: { borderColor: color.accent, backgroundColor: color.surfaceRaised },
  poseLabel: { ...type.label, color: color.text, textAlign: 'center', letterSpacing: 0 },
  close: { paddingVertical: space.sm, paddingRight: space.sm },
  closeText: { ...type.body, color: color.accent },
});
