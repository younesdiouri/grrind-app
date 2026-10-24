import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, type } from '@/design/tokens';
import { UnityRaidStage, unityCombatAvailable } from '@/features/combat/UnityCombatStage';
import type { UnityRaidProps } from './unityRaid';

/** One fullscreen winter arena; RN keeps narration, accessible controls and server results. */
export function RaidStage({ children, onReady, ...props }: Omit<UnityRaidProps, 'onReady' | 'onError'> & {
  children: ReactNode; onReady?: () => void;
}) {
  const [failed, setFailed] = useState(!unityCombatAvailable);
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => { void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, []));
  return <View style={styles.scene}>
    {!failed && <UnityRaidStage {...props} onReady={() => onReady?.()} onError={() => setFailed(true)} />}
    {failed && <View style={styles.fallback}><Text style={styles.message}>La scène 3D est indisponible. Le récit et les résultats restent accessibles.</Text></View>}
    <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['left', 'right', 'top', 'bottom']}>
      {children}
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: color.background },
  overlay: { flex: 1, justifyContent: 'space-between', padding: space.md, gap: space.sm },
  fallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  message: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
