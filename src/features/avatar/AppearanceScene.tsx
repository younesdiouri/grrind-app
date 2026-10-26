import { Stack, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, control, space, type } from '@/design/tokens';
import { UnityAvatarInspector, unityCombatAvailable } from '@/features/combat/UnityCombatStage';
import type { UnityAvatar } from '@/features/combat/unityFrame';
import { AvatarSnow } from './AvatarSnow';

/** One fullscreen Unity surface; the form and navigation remain native app UI. */
/** `view` 1 frames the head: face, hair and eyes are chosen up close. */
export function AppearanceScene({ avatar, title, children, busy = false, view = 0 }: {
  avatar: UnityAvatar; title: string; children: ReactNode; busy?: boolean; view?: 0 | 1;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(100);
  const [controlsHeight, setControlsHeight] = useState(260);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    {unityCombatAvailable && !failed && <UnityAvatarInspector avatar={avatar} pose="idle" phase={.5} animated
      view={view} azimuth={view === 1 ? 15 : 25} viewport={{ x: 0, y: (controlsHeight + insets.bottom) / window.height, width: 1,
        height: Math.max(.1, (window.height - controlsHeight - headerHeight - insets.top - insets.bottom) / window.height) }}
      onReady={() => setReady(true)} onError={() => setFailed(true)} />}
    {ready && !failed && <View pointerEvents="none" style={[StyleSheet.absoluteFill,
      { top: headerHeight + insets.top, bottom: controlsHeight + insets.bottom }]}><AvatarSnow /></View>}
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.header} onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}>
        <View style={styles.heading}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’apparence" disabled={busy}
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/inventaire'); }} style={styles.close}>
            <Text style={styles.link}>Fermer</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.note} testID={ready && !failed ? 'avatar-3d-ready' : 'avatar-3d-loading'}>
          {!unityCombatAvailable || failed ? 'L’aperçu 3D est indisponible.' : ready ? 'Aperçu 3D' : 'Chargement de l’aperçu…'}
        </Text>
      </View>
      <View style={styles.controls} onLayout={({ nativeEvent }) => setControlsHeight(nativeEvent.layout.height)}>
        {children}
      </View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { padding: space.md, gap: space.xs },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.title, flex: 1, color: color.text },
  link: { ...type.body, color: color.accent },
  close: { minHeight: control.backSize, justifyContent: 'center', padding: space.sm },
  note: { ...type.label, color: color.textMuted },
  controls: { padding: space.md, gap: space.sm, backgroundColor: color.surface },
});
