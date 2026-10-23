import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { Button } from '@/components/Button';
import { color, control, frame, space, type } from '@/design/tokens';
import { BattleView } from '@/features/combat/BattleView';
import { BATTLE_FIXTURES } from '@/features/combat/fixtures';
import { UnityAvatarInspector, unityCombatAvailable } from '@/features/combat/UnityCombatStage';
import type { UnityAvatar } from '@/features/combat/unityFrame';
import type { FighterPose } from '@/features/combat/fighterMotion';

export default function CharacterShowcaseScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><Showcase /></AmbientBackdropProvider>;
}

function Showcase() {
  const [body, setBody] = useState<UnityAvatar['body']>('female');
  const [hairStyle, setHairStyle] = useState<UnityAvatar['hairStyle']>('buns');
  const [headband, setHeadband] = useState(true);
  const [section, setSection] = useState('Corps');
  const [skinTone, setSkinTone] = useState<UnityAvatar['skinTone']>('tan');
  const [eyeColor, setEyeColor] = useState<UnityAvatar['eyeColor']>('blue');
  const [hairColor, setHairColor] = useState<UnityAvatar['hairColor']>('brown');
  const [sportShirt, setSportShirt] = useState(true);
  const [shirtColor, setShirtColor] = useState<UnityAvatar['shirtColor']>('cyan');
  const [pantsColor, setPantsColor] = useState<UnityAvatar['pantsColor']>('violet');
  const [boots, setBoots] = useState(true);
  const [pose, setPose] = useState<FighterPose>('idle');
  const [animated, setAnimated] = useState(true);
  const [azimuth, setAzimuth] = useState(25);
  const [view, setView] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(100);
  const [controlsHeight, setControlsHeight] = useState(260);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const avatar: UnityAvatar = { body, hairStyle, headband: headband && hairStyle !== 'long', boots, visible: true,
    skinTone, eyeColor, hairColor, sportShirt, shirtColor, pantsColor };
  if (playing) return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    <BattleView battle={BATTLE_FIXTURES.duel} demo unityPlayer={avatar}
      unityEnemy={{ ...avatar, body: body === 'male' ? 'female' : 'male', hairStyle: body === 'male' ? 'buns' : 'parted',
        skinTone: skinTone === 'deep' ? 'light' : 'deep', eyeColor: 'brown', hairColor: 'black',
        shirtColor: shirtColor === 'cyan' ? 'coral' : 'cyan', pantsColor: pantsColor === 'coral' ? 'violet' : 'coral', headband: false, boots: true }}
      onDismiss={() => { setReady(false); setPlaying(false); }} />
  </View>;
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    {unityCombatAvailable && !failed && <UnityAvatarInspector avatar={avatar} pose={pose} phase={.5} animated={animated}
      view={view} azimuth={azimuth} viewport={{ x: 0, y: (controlsHeight + insets.bottom) / window.height, width: 1,
        height: Math.max(.1, (window.height - controlsHeight - headerHeight - insets.top - insets.bottom) / window.height) }}
      onReady={() => setReady(true)} onError={() => setFailed(true)} />}
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.header} onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}>
        <Text style={styles.title}>ATELIER AVATAR</Text>
        <Text style={styles.subtitle} testID={ready && !failed ? 'quaternius-ready' : undefined}>
          {!unityCombatAvailable ? 'Ce POC nécessite le development build avec Unity.'
            : failed ? 'Le rendu 3D n’a pas démarré.' : ready ? 'Spike local · T-shirt et Les Guinzz' : 'Chargement…'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le showcase" onPress={() => {
          if (router.canGoBack()) router.back(); else router.replace('/combat-demo');
        }}><Text style={styles.link}>Fermer</Text></Pressable>
      </View>
      <View style={styles.controls} onLayout={({ nativeEvent }) => setControlsHeight(nativeEvent.layout.height)}>
        <View style={styles.row}>
          {['Corps', 'Cheveux', 'Tenue', 'Mouvements'].map(label =>
            <Choice key={label} label={label} selected={section === label} onPress={() => setSection(label)} />)}
        </View>
        {section === 'Corps' && <>
        <View style={styles.row}>
          <Choice label="Femme" selected={body === 'female'} onPress={() => setBody('female')} />
          <Choice label="Homme" selected={body === 'male'} onPress={() => setBody('male')} />
        </View>
        <View style={styles.row}>
          {([{ label: 'Clair', value: 'light' }, { label: 'Hâlé', value: 'tan' }, { label: 'Brun', value: 'brown' },
            { label: 'Foncé', value: 'deep' }] as const).map(({ label, value }) =>
            <Choice key={value} label={`Teint ${label.toLowerCase()}`} selected={skinTone === value} onPress={() => setSkinTone(value)} />)}
        </View>
        <View style={styles.row}>
          {([{ label: 'Marron', value: 'brown' }, { label: 'Bleus', value: 'blue' }, { label: 'Verts', value: 'green' }] as const).map(({ label, value }) =>
            <Choice key={value} label={`Yeux ${label.toLowerCase()}`} selected={eyeColor === value} onPress={() => setEyeColor(value)} />)}
        </View>
        </>}
        {section === 'Cheveux' && <>
        <View style={styles.row}>
          <Choice label="Coiffés" selected={hairStyle === 'parted'} onPress={() => setHairStyle('parted')} />
          <Choice label="Courts" selected={hairStyle === 'buzzed'} onPress={() => setHairStyle('buzzed')} />
          <Choice label="Chignons" selected={hairStyle === 'buns'} onPress={() => setHairStyle('buns')} />
          <Choice label="Longs" selected={hairStyle === 'long'} onPress={() => setHairStyle('long')} />
        </View>
        <View style={styles.row}>
          {([{ label: 'Châtains', value: 'brown' }, { label: 'Noirs', value: 'black' }, { label: 'Blonds', value: 'blond' }] as const).map(({ label, value }) =>
            <Choice key={value} label={label} selected={hairColor === value} onPress={() => setHairColor(value)} />)}
        </View>
        {hairStyle === 'long' && <Text style={styles.subtitle}>Bandeau non ajusté sur cette coupe.</Text>}
        </>}
        {section === 'Tenue' && <>
        <View style={styles.row}>
          <Choice label="Fantasy" selected={!sportShirt} onPress={() => setSportShirt(false)} />
          <Choice label="T-shirt sport" selected={sportShirt} onPress={() => setSportShirt(true)} />
          {sportShirt && <>
            <Choice label="Ardoise" selected={shirtColor === 'cyan'} onPress={() => setShirtColor('cyan')} />
            <Choice label="Corail" selected={shirtColor === 'coral'} onPress={() => setShirtColor('coral')} />
          </>}
        </View>
        {sportShirt && <View style={styles.row}>
          {([{ label: 'Pantalon original', value: 'original' }, { label: 'Guinzz violet', value: 'violet' },
            { label: 'Guinzz cyan', value: 'cyan' }, { label: 'Guinzz corail', value: 'coral' }] as const).map(({ label, value }) =>
            <Choice key={value} label={label} selected={pantsColor === value} onPress={() => setPantsColor(value)} />)}
        </View>}
        <View style={styles.row}>
          <Choice label={boots ? 'Retirer les bottes' : 'Équiper les bottes'} selected={boots} onPress={() => setBoots(!boots)} />
          {hairStyle !== 'long' && <Choice label={headband ? 'Retirer le bandeau' : 'Équiper le bandeau'} selected={headband} onPress={() => setHeadband(!headband)} />}
        </View>
        </>}
        {section === 'Mouvements' && <>
        <View style={styles.row}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poseList} contentContainerStyle={styles.poseRow}>
            {([{ label: 'Repos', pose: 'idle' }, { label: 'Direct', pose: 'attack' }, { label: 'Uppercut', pose: 'critical' },
              { label: 'Esquive', pose: 'dodge' }, { label: 'Impact', pose: 'hit' }, { label: 'Combo', pose: 'combo' }] as const).map(choice =>
              <Choice key={choice.pose} label={choice.label} selected={pose === choice.pose} onPress={() => setPose(choice.pose)} />)}
          </ScrollView>
          <Choice label={animated ? 'Figer' : 'Animer'} selected={animated} onPress={() => setAnimated(!animated)} />
        </View>
        </>}
        <View style={styles.row}>
          {[{ label: 'Face', angle: 0 }, { label: 'Profil', angle: 90 }, { label: 'Trois-quarts', angle: 25 }].map(({ label, angle }) =>
            <Choice key={label} label={label} selected={view === 0 && azimuth === angle} onPress={() => { setView(0); setAzimuth(angle); }} />)}
          <Choice label="Visage" selected={view === 1} onPress={() => { setView(1); setAzimuth(25); }} />
          <Choice label="Tissu" selected={view === 4} onPress={() => { setView(4); setAzimuth(25); }} />
        </View>
        <Button label="Voir le duel PvP" disabled={!ready || failed} onPress={() => setPlaying(true)} />
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
  poseList: { flex: 1 }, poseRow: { flexDirection: 'row', gap: space.sm },
  choice: { minHeight: control.backSize, justifyContent: 'center', padding: space.sm, borderWidth: control.borderWidth,
    borderColor: color.border, borderRadius: frame.standard.radius }, selected: { borderColor: color.accent },
});
