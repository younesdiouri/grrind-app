import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { color, combatMotion, space, type } from '@/design/tokens';
import { BattleView } from '@/features/combat/BattleView';
import { AL_KASAL, FighterSprite } from '@/features/combat/FighterSprite';
import { PEBBLE } from '@/features/combat/bundledMobs';
import type { FighterPose } from '@/features/combat/fighterMotion';
import { AVATAR_DUEL, BATTLE_FIXTURES } from '@/features/combat/fixtures';
import { useAuth } from '@/features/auth/useAuth';
import { isE2eBuild } from '@/features/health/e2e';
import { buildBattleTimeline, type Battle } from '@/features/combat/timeline';

const POSES: { value: FighterPose; label: string }[] = [
  { value: 'idle', label: 'Repos' }, { value: 'attack', label: 'Attaque' }, { value: 'hit', label: 'Coup reçu' },
  { value: 'critical', label: 'Critique' }, { value: 'dodge', label: 'Esquive' },
  { value: 'combo', label: 'Combo' }, { value: 'replay', label: 'Relance' },
];

export default function CombatDemoScreen() {
  const { network, frame, scenario, at, opponent, mob, snapshot } = useLocalSearchParams<{ network?: string; frame?: string; scenario?: string; at?: string; opponent?: string; mob?: string; snapshot?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  // Une image figée du combat local, pour les captures : `?scenario=victoire&at=3200`.
  if (at && (scenario === 'victoire' || scenario === 'defaiteBoss' || scenario === 'duel')) {
    const sample = scenario === 'duel' && snapshot === 'avatar' ? AVATAR_DUEL : BATTLE_FIXTURES[scenario];
    const battle = mob === 'pebble' ? { ...sample, enemy: { ...sample.enemy, key: 'SAND_JACKAL',
      name: PEBBLE.name, introduction: PEBBLE.introduction ?? null, appearance: null } } : sample;
    return <AmbientBackdropProvider>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    <View style={styles.screen}>
      <BattleView key={at} battle={battle}
        enemyArt={scenario === 'defaiteBoss' && mob !== 'pebble' ? AL_KASAL : undefined} demo demoTime={Number(at)}
        onDismiss={() => router.replace('/combat-demo')} />
    </View>
  </AmbientBackdropProvider>;
  }
  if (isE2eBuild && network) return <AmbientBackdropProvider><NetworkDemo key={`${network}-${frame}-${opponent}`} scenario={network} frame={frame} duel={opponent === 'player'} pebble={opponent === 'pebble'} /></AmbientBackdropProvider>;
  return <AmbientBackdropProvider><CombatDemo key={`${mob}`} pebble={mob === 'pebble'} /></AmbientBackdropProvider>;
}

/** Banc réseau isolé : scripts/combat-presentation-server.mjs, jamais une mutation du catalogue. */
function NetworkDemo({ scenario, frame, duel, pebble }: { scenario: string; frame?: string; duel: boolean; pebble: boolean }) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`http://127.0.0.1:8099/battle/${encodeURIComponent(scenario)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('fixture'); return response.json(); })
      .then((sample: Battle) => setBattle(duel ? { ...sample, enemy: { ...sample.enemy,
        name: 'Adversaire', appearance: 'STRENGTH_V3', imageUrls: null, introduction: null } } : pebble ? { ...sample, enemy: { ...sample.enemy, key: 'SAND_JACKAL', name: PEBBLE.name, appearance: null, imageUrls: null, introduction: null } } : sample))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [scenario, duel, pebble]);
  let demoTime: number | undefined;
  if (battle && frame) {
    const timeline = buildBattleTimeline(battle, { illustrated: true });
    const [effect, actor] = frame.split('-');
    const side = actor === 'player' ? timeline.player : timeline.enemy;
    const ramp = effect === 'dodge' ? side.dodgeFlash : effect === 'combo' ? side.comboFlash
      : effect === 'replay' ? side.replayFlash : effect === 'damage' ? side.damageFlash : side.criticalFlash;
    demoTime = ramp.input[effect === 'damage' ? ramp.output.lastIndexOf(1) : ramp.output.indexOf(1)];
  }
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    <Text style={styles.notice}>DÉMONSTRATION RÉSEAU · AUCUN GAIN RÉEL</Text>
    {battle ? <BattleView battle={battle} demo demoTime={demoTime} onDismiss={() => router.replace('/combat-demo')} />
      : <Text style={styles.subtitle}>{error ? 'Serveur de test indisponible' : 'Chargement du scénario…'}</Text>}
  </View>;
}

function CombatDemo({ pebble }: { pebble: boolean }) {
  const artwork = pebble ? PEBBLE : AL_KASAL;
  const auth = useAuth();
  const [pose, setPose] = useState<FighterPose>('idle');
  const [scenario, setScenario] = useState<'victoire' | 'defaiteBoss' | null>(null);
  const clock = useSharedValue(0);
  const battle = scenario ? { ...BATTLE_FIXTURES[scenario], enemy: { ...BATTLE_FIXTURES[scenario].enemy,
    key: pebble ? 'SAND_JACKAL' : 'AL_KASAL', name: artwork.name, introduction: artwork.introduction ?? null } } : null;
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: !scenario, statusBarHidden: !!scenario, headerLeft: () => (
        <Pressable accessibilityRole="button" onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace(auth.status === 'signedIn' ? '/combat' : '/login');
        }} style={styles.close}>
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      ) }} />
      <Text style={styles.notice}>DÉMONSTRATION · AUCUN GAIN RÉEL</Text>
      {battle ? (
        <BattleView battle={battle} enemyArt={pebble ? undefined : artwork} demo onDismiss={() => setScenario(null)} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{artwork.name}</Text>
          <Text style={styles.subtitle}>{pebble ? 'Un petit obstacle prend corps.' : 'La paresse prend corps.'}</Text>
          <View style={styles.preview} testID={`${pebble ? 'pebble' : 'al-kasal'}-${pose}`}>
            {pebble ? <Image source={require('../../assets/images/enemies/cailloux-preview.png')}
              style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel="Cailloux, golem de pierre en baskets" />
              : <FighterSprite artwork={artwork} clock={clock} beats={[]} pose={pose} />}
          </View>
          {!pebble && <View style={styles.poses}>
            {POSES.map((option) => (
              <Pressable key={option.value} onPress={() => setPose(option.value)} accessibilityRole="button"
                accessibilityState={{ selected: pose === option.value }} style={[styles.pose, pose === option.value && styles.selected]}>
                <Text style={styles.poseLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>}
          <Button label="Jouer une victoire" onPress={() => setScenario('victoire')} />
          <Button label="Atelier avatar 3D" variant="quiet" onPress={() => router.push('/character-showcase')} />
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
  poses: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pose: { minWidth: '22%', flexGrow: 1, paddingVertical: space.md, borderWidth: 1, borderColor: color.border },
  selected: { borderColor: color.accent, backgroundColor: color.surfaceRaised },
  poseLabel: { ...type.label, color: color.text, textAlign: 'center', letterSpacing: 0 },
  close: { paddingVertical: space.sm, paddingRight: space.sm },
  closeText: { ...type.body, color: color.accent },
});
