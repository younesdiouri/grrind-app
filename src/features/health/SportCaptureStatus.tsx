import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { useAuth } from '@/features/auth/useAuth';
import { sportNative } from '@/features/health/sportNative';

/** L'état actif et l'arrêt restent accessibles hors de l'écran pilote. */
export function SportCaptureStatus() {
  const auth = useAuth();
  const owner = auth.status === 'signedIn' ? auth.user.id : null;
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!__DEV__ || !sportNative) return;
    const native = sportNative;
    let disposed = false;
    const update = async () => {
      try {
        const status = await native.sportStatus();
        if (!disposed) { setActive(status.activeCaptureId !== null); setFailed(status.storageFailed); }
      } catch { if (!disposed) setFailed(true); }
    };
    void native.setSportOwner(owner).then(update).catch(() => { if (!disposed) setFailed(true); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void update(); }, 3000);
    return () => { disposed = true; clearInterval(timer); void native.setSportOwner(null).catch(() => {}); };
  }, [owner]);
  if (!__DEV__ || (!active && !failed)) return null;
  return <SafeAreaView edges={['bottom']} style={styles.banner}><View>
    <Text accessibilityRole="alert" style={styles.label}>{active ? 'Sport ensemble · localisation active' : 'Sport ensemble · stockage indisponible'}</Text>
    {active ? <Button label="Arrêter la localisation" variant="quiet" onPress={() => {
      void sportNative?.stopSportCapture().then(() => setActive(false)).catch(() => setFailed(true));
    }} /> : null}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  banner: { backgroundColor: color.surface, padding: space.md, gap: space.sm },
  label: { ...type.label, color: color.text },
});
