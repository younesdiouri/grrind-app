import { Stack, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, control, space, type } from '@/design/tokens';
import { UnityAvatarInspector, unityCombatAvailable } from '@/features/combat/UnityCombatStage';
import type { UnityAvatar } from '@/features/combat/unityFrame';
import { AvatarSnow } from './AvatarSnow';
import { appearanceViewport } from './appearanceViewport';

/** One fullscreen Unity surface; the form and navigation remain native app UI. */
/** `view` 1 frames the head: face, hair and eyes are chosen up close. */
export function AppearanceScene({ avatar, title, children, busy = false, view = 0, embedded = false }: {
  avatar: UnityAvatar; title?: string; children: ReactNode; busy?: boolean; view?: 0 | 1; embedded?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(control.backSize + space.sm);
  const [controlsHeight, setControlsHeight] = useState(260);
  const [height, setHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const viewport = appearanceViewport({ height, controlsHeight,
    headerHeight: embedded ? 0 : headerHeight, safeTop: embedded ? 0 : insets.top, safeBottom: embedded ? 0 : insets.bottom });
  const Overlay = embedded ? View : SafeAreaView;
  return <View style={styles.screen} collapsable={false}
    testID={ready && !failed ? 'avatar-3d-ready' : 'avatar-3d-loading'}
    onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}>
    {!embedded && <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />}
    {unityCombatAvailable && !failed && viewport && <UnityAvatarInspector avatar={avatar} pose="idle" phase={.5} animated
      view={view} azimuth={view === 1 ? 15 : 25} viewport={viewport}
      onReady={() => setReady(true)} onError={() => setFailed(true)} />}
    {ready && !failed && <View pointerEvents="none" style={[StyleSheet.absoluteFill,
      { top: embedded ? 0 : headerHeight + insets.top, bottom: controlsHeight + (embedded ? 0 : insets.bottom) }]}><AvatarSnow /></View>}
    <Overlay style={[styles.overlay, embedded && styles.embeddedOverlay]} pointerEvents="box-none">
      {!embedded && <View style={styles.header}
        onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}>
        <View style={styles.heading}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’apparence" disabled={busy}
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/inventaire'); }} style={styles.close}>
            <Text style={styles.closeGlyph}>×</Text>
          </Pressable>
          {title && <Text style={styles.title}>{title}</Text>}
        </View>
        {(!ready || failed || !unityCombatAvailable) && <Text style={styles.note}>
          {!unityCombatAvailable || failed ? 'L’aperçu 3D est indisponible.' : 'Chargement de l’aperçu…'}
        </Text>}
      </View>}
      {embedded && (!ready || failed || !unityCombatAvailable) && <Text style={[styles.note, styles.loadingNote]}>
        {!unityCombatAvailable || failed ? 'L’aperçu 3D est indisponible.' : 'Chargement de l’aperçu…'}
      </Text>}
      <View style={styles.controls} onLayout={({ nativeEvent }) => setControlsHeight(nativeEvent.layout.height)}>
        {children}
      </View>
    </Overlay>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  overlay: { flex: 1, justifyContent: 'space-between' },
  embeddedOverlay: { justifyContent: 'flex-end' },
  loadingNote: { position: 'absolute', top: space.sm, left: space.md, right: space.md },
  header: { paddingHorizontal: space.md, paddingVertical: space.xs, gap: space.xs },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.body, flex: 1, color: color.text },
  closeGlyph: { ...type.title, color: color.text },
  close: { width: control.backSize, height: control.backSize, alignItems: 'center', justifyContent: 'center' },
  note: { ...type.label, color: color.textMuted },
  controls: { padding: space.md, gap: space.sm, backgroundColor: color.surface },
});
