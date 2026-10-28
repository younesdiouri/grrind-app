import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { SystemFrame } from '@/components/SystemFrame';
import { color, space, type } from '@/design/tokens';
import { useAuth } from '@/features/auth/useAuth';
import { togetherInbox } from '@/features/health/togetherBonuses';
import { TogetherBonusReceipt } from '@/features/health/TogetherBonusReceipt';
import { hasInteracted, mayOpenReward } from '@/features/reward/launchGate';
import { getPending, subscribeToPending } from '@/features/reward/pending';

/** Reçu statique relisible après interruption : aucune animation de SyncSummary n'est rejouée. */
export function TogetherBonusPresenter() {
  const auth = useAuth();
  const state = useSyncExternalStore(togetherInbox.subscribe, togetherInbox.getSnapshot);
  const pending = useSyncExternalStore(subscribeToPending, getPending);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setForeground(next === 'active'));
    return () => subscription.remove();
  }, []);
  const bonus = state.bonuses[0];
  const owner = auth.status === 'signedIn' ? auth.user.id : null;
  useEffect(() => {
    if (owner && state.owner === owner && bonus && !pending && mayOpenReward({ active: foreground, interacted: hasInteracted(), solicited: state.solicited })) {
      togetherInbox.markPresented(owner, bonus.id);
    }
  }, [owner, state.owner, bonus, pending, foreground, state.solicited]);
  if (!owner || state.owner !== owner || !bonus || pending || !foreground || state.presentedId !== bonus.id) return null;
  const acknowledge = async () => {
    setBusy(true);
    setFailed(false);
    try { await togetherInbox.acknowledge(owner, bonus.id); await togetherInbox.load(owner, state.solicited); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return <Modal visible transparent onRequestClose={() => { if (!busy) void acknowledge(); }}>
    <SafeAreaView style={styles.screen}><SystemFrame tier="event" style={styles.frame} contentStyle={[styles.content, styles.frame]}>
      <ScrollView style={styles.frame}><TogetherBonusReceipt bonus={bonus} /></ScrollView>
      {failed ? <Text style={styles.body}>Le reçu n’a pas pu être marqué comme vu. Réessaie.</Text> : null}
      <Button label="Compris" busy={busy} onPress={() => void acknowledge()} />
    </SystemFrame></SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  screen: { flex: 1, justifyContent: 'center', backgroundColor: color.background, padding: space.lg },
  content: { gap: space.md, padding: space.md }, body: { ...type.body, color: color.text },
});
