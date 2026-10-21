import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { color, control, frame, space, type } from '@/design/tokens';
import { UnityAvatarInspector, unityCombatAvailable } from '@/features/combat/UnityCombatStage';
import type { UnityAvatar } from '@/features/combat/unityFrame';

export default function CharacterShowcaseScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><Showcase /></AmbientBackdropProvider>;
}

function Showcase() {
  const [hairStyle, setHairStyle] = useState<'parted' | 'buzzed'>('parted');
  const [boots, setBoots] = useState(true);
  const [pose, setPose] = useState<'idle' | 'attack'>('idle');
  const [animated, setAnimated] = useState(true);
  const [azimuth, setAzimuth] = useState(25);
  const [view, setView] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(100);
  const [controlsHeight, setControlsHeight] = useState(260);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const avatar: UnityAvatar = { model: 'quaternius', body: 'male', skin: '#FFFFFF', hairStyle,
    boots, weapon: false, glasses: false, visible: true };
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    {unityCombatAvailable && !failed && <UnityAvatarInspector avatar={avatar} pose={pose} phase={.5} animated={animated}
      view={view} azimuth={azimuth} viewport={{ x: 0, y: (controlsHeight + insets.bottom) / window.height, width: 1,
        height: Math.max(.1, (window.height - controlsHeight - headerHeight - insets.top - insets.bottom) / window.height) }}
      onReady={() => setReady(true)} onError={() => setFailed(true)} />}
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.header} onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}>
        <Text style={styles.title}>QUATERNIUS · POC</Text>
        <Text style={styles.subtitle} testID={ready && !failed ? 'quaternius-ready' : undefined}>
          {!unityCombatAvailable ? 'Ce POC nécessite le development build avec Unity.'
            : failed ? 'Le rendu 3D n’a pas démarré.' : ready ? 'Un personnage · deux coiffures · un item' : 'Chargement…'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le showcase" onPress={() => {
          if (router.canGoBack()) router.back(); else router.replace('/avatar-3d');
        }}><Text style={styles.link}>Fermer</Text></Pressable>
      </View>
      <View style={styles.controls} onLayout={({ nativeEvent }) => setControlsHeight(nativeEvent.layout.height)}>
        <View style={styles.row}>
          <Choice label="Cheveux coiffés" selected={hairStyle === 'parted'} onPress={() => setHairStyle('parted')} />
          <Choice label="Cheveux courts" selected={hairStyle === 'buzzed'} onPress={() => setHairStyle('buzzed')} />
        </View>
        <View style={styles.row}>
          <Choice label={boots ? 'Retirer les bottes' : 'Équiper les bottes'} selected={boots} onPress={() => setBoots(!boots)} />
          <Text style={styles.subtitle}>Tenue Fantasy · essai visuel</Text>
        </View>
        <View style={styles.row}>
          <Choice label="Repos" selected={pose === 'idle'} onPress={() => setPose('idle')} />
          <Choice label="Crochet" selected={pose === 'attack'} onPress={() => setPose('attack')} />
          <Choice label={animated ? 'Figer' : 'Animer'} selected={animated} onPress={() => setAnimated(!animated)} />
        </View>
        <View style={styles.row}>
          {[{ label: 'Face', angle: 0 }, { label: 'Profil', angle: 90 }, { label: 'Trois-quarts', angle: 25 }].map(({ label, angle }) =>
            <Choice key={label} label={label} selected={view === 0 && azimuth === angle} onPress={() => { setView(0); setAzimuth(angle); }} />)}
          <Choice label="Visage" selected={view === 1} onPress={() => { setView(1); setAzimuth(25); }} />
        </View>
      </View>
    </SafeAreaView>
  </View>;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
    onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={styles.label}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background }, overlay: { flex: 1, justifyContent: 'space-between' },
  header: { padding: space.md, gap: space.xs }, controls: { backgroundColor: color.surface, padding: space.md, gap: space.sm },
  title: { ...type.title, color: color.text }, subtitle: { ...type.label, color: color.textMuted },
  link: { ...type.body, color: color.accent }, label: { ...type.label, color: color.text, letterSpacing: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  choice: { minHeight: control.backSize, justifyContent: 'center', padding: space.sm, borderWidth: control.borderWidth,
    borderColor: color.border, borderRadius: frame.standard.radius }, selected: { borderColor: color.accent },
});
