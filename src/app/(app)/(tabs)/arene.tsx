import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { CombatMenu, type CombatMode } from '@/components/CombatMenu';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { PEBBLE } from '@/features/combat/bundledMobs';
import { fight } from '@/features/combat/fight';
import { useCatalog } from '@/features/combat/useCatalog';

export default function ArenaScreen() {
  const { catalog, reload } = useCatalog();
  const [mode, setMode] = useState<CombatMode>('pve');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const pebble = catalog.step === 'ready' ? catalog.entries.find(({ enemy }) => enemy.key === 'SAND_JACKAL') : undefined;
  const launch = async () => {
    if (!pebble || pebble.locked || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setFailure(null);
    try {
      const result = await fight(pebble.enemy.key);
      if (result.kind === 'fought') router.push({ pathname: '/battle', params: { id: result.battle.id } });
      else {
        setFailure(result.failure);
        if (result.failure.kind === 'problem' && result.failure.problem.type === 'https://grrind.app/problems/enemy-level-too-low') reload();
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return <ScrollView contentContainerStyle={styles.screen} testID="arena-screen">
    {mode === 'pve' && catalog.step === 'loading' && <ActivityIndicator color={color.accent} />}
    {mode === 'pve' && catalog.step === 'failed' && <View style={styles.notice}>
      <Text style={styles.note}>{messageFor(catalog.failure)}</Text>
      <Button label="Réessayer" onPress={reload} />
    </View>}
    {mode === 'pve' && failure && <Text style={styles.error} accessibilityRole="alert">{messageFor(failure)}</Text>}
    <CombatMenu mode={mode} onMode={setMode} enemy={pebble?.enemy} locked={pebble?.locked} busy={busy}
      portrait={<Image source={PEBBLE.poses.idle} contentFit="contain" style={StyleSheet.absoluteFill} />}
      onFight={() => void launch()} onDemo={() => router.push({ pathname: '/battle', params: { fixture: 'duel', demo: '1' } })}
      onHistory={() => router.push('/combats-solo')} />
    {mode === 'pve' && catalog.step === 'ready' && !pebble && <Text style={styles.note}>Aucun adversaire disponible pour le moment.</Text>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, paddingTop: space.sm, gap: space.md },
  notice: { gap: space.sm },
  note: { ...type.body, color: color.textMuted },
  error: { ...type.body, color: color.danger },
});
