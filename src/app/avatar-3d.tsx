import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { color, control, frame, space, type } from '@/design/tokens';
import { BattleView } from '@/features/combat/BattleView';
import { BATTLE_FIXTURES } from '@/features/combat/fixtures';
import { AL_KASAL } from '@/features/combat/FighterSprite';
import { UnityAvatarInspector, unityCombatAvailable } from '@/features/combat/UnityCombatStage';
import type { FighterPose } from '@/features/combat/fighterMotion';
import type { UnityAvatar } from '@/features/combat/unityFrame';

const POSES: { key: FighterPose; label: string }[] = [
  { key: 'idle', label: 'Garde' }, { key: 'attack', label: 'Attaque' }, { key: 'hit', label: 'Coup reçu' },
  { key: 'critical', label: 'Critique' }, { key: 'dodge', label: 'Esquive' }, { key: 'combo', label: 'Combo' }, { key: 'replay', label: 'Relance' },
];

export default function Avatar3dScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><Workshop /></AmbientBackdropProvider>;
}

function Workshop() {
  const [avatar, setAvatar] = useState<UnityAvatar>({ body: 'male', skin: '#DBB894', weapon: true, glasses: true, boots: true, visible: true });
  const [pose, setPose] = useState<FighterPose>('idle');
  const [phase, setPhase] = useState(.5);
  const [animated, setAnimated] = useState(false);
  const [view, setView] = useState(0);
  const [azimuth, setAzimuth] = useState(32);
  const [panel, setPanel] = useState<'avatar' | 'gestures' | 'camera'>('avatar');
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const [controlsHeight, setControlsHeight] = useState(300);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const patch = (change: Partial<UnityAvatar>) => setAvatar((current) => ({ ...current, ...change }));
  if (playing) return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    <BattleView battle={BATTLE_FIXTURES.defaiteBoss} enemyArt={AL_KASAL} demo unityPlayer={avatar} onDismiss={() => setPlaying(false)} />
  </View>;
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    {unityCombatAvailable && !failed && <UnityAvatarInspector avatar={avatar} pose={pose} phase={phase} animated={animated}
      view={view} azimuth={azimuth} viewport={{ x: 0, y: (controlsHeight + insets.bottom) / window.height, width: 1,
        height: Math.max(.1, (window.height - controlsHeight - headerHeight - insets.top - insets.bottom) / window.height) }}
      onReady={() => setReady(true)} onError={() => setFailed(true)} />}
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.header} onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}>
        <Text style={styles.title}>ATELIER AVATAR</Text>
        <Text style={styles.subtitle} testID={ready && !failed ? 'avatar-3d-ready' : undefined}>
          {!unityCombatAvailable ? 'Le module Unity doit être inclus dans le build de développement.'
            : failed ? 'Le rendu 3D n’a pas démarré.' : ready ? 'PERSONNAGE PILOTE · 3D PEINTE' : 'Chargement du personnage…'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’atelier" onPress={() => {
          if (router.canGoBack()) router.back(); else router.replace('/combat-demo');
        }}><Text style={styles.link}>Fermer</Text></Pressable>
      </View>
      <View style={styles.controls} onLayout={({ nativeEvent }) => setControlsHeight(nativeEvent.layout.height)}>
        <View style={styles.row}>
          <Choice label="Avatar" selected={panel === 'avatar'} onPress={() => setPanel('avatar')} />
          <Choice label="Gestes" selected={panel === 'gestures'} onPress={() => setPanel('gestures')} />
          <Choice label="Cadrage" selected={panel === 'camera'} onPress={() => setPanel('camera')} />
        </View>
        <View style={styles.options}>
          {panel === 'avatar' && <>
          <Text style={styles.subtitle}>Modèle V2 · Un personnage pour valider le rendu en combat.</Text>
          <View style={styles.row}>
            <Choice label="Haltère ego" selected={avatar.weapon} onPress={() => patch({ weapon: !avatar.weapon })} />
            <Choice label="Course-poursuite" selected={avatar.glasses} onPress={() => patch({ glasses: !avatar.glasses })} />
            <Choice label="Sprint-semelle" selected={!!avatar.boots} onPress={() => patch({ boots: !avatar.boots })} />
          </View></>}
          {panel === 'gestures' && <><View style={styles.row}>{POSES.map((entry) => <Choice key={entry.key} label={entry.label}
            selected={pose === entry.key} onPress={() => setPose(entry.key)} />)}</View>
          <View style={styles.row}>{[{ label: 'Début', value: .15 }, { label: 'Contact', value: .5 }, { label: 'Retour', value: .85 }]
            .map((entry) => <Choice key={entry.label} label={entry.label} selected={!animated && phase === entry.value}
              onPress={() => { setAnimated(false); setPhase(entry.value); }} />)}
            <Choice label="Animer" selected={animated} onPress={() => setAnimated(!animated)} />
          </View></>}
          {panel === 'camera' && <View style={styles.row}>
            {['Ensemble', 'Visage', 'Prise', 'Chaussures'].map((label, index) => <Choice key={label} label={label} selected={view === index} onPress={() => setView(index)} />)}
            <Choice label="Tourner" selected={azimuth < 0} onPress={() => setAzimuth((value) => value < 0 ? 32 : -148)} />
          </View>}
        </View>
        <Button label="Tester dans le combat" disabled={!ready || failed} onPress={() => { setReady(false); setPlaying(true); }} />
      </View>
    </SafeAreaView>
  </View>;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
    onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={styles.label}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { padding: space.md, gap: space.xs },
  title: { ...type.title, color: color.text }, subtitle: { ...type.label, color: color.textMuted },
  link: { ...type.body, color: color.accent }, label: { ...type.label, color: color.text, letterSpacing: 0 },
  controls: { height: '45%', backgroundColor: color.surface, padding: space.md, gap: space.sm },
  options: { flex: 1, gap: space.sm }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { minHeight: control.backSize, justifyContent: 'center', padding: space.sm, borderWidth: control.borderWidth, borderColor: color.border, borderRadius: frame.standard.radius },
  selected: { borderColor: color.accent },
});
