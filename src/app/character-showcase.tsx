import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { Button } from '@/components/Button';
import { color, control, frame, space, type } from '@/design/tokens';
import { AvatarPreview } from '@/features/avatar/AvatarPreview';
import { BattleView } from '@/features/combat/BattleView';
import { BATTLE_FIXTURES } from '@/features/combat/fixtures';
import { UnityAvatarInspector, unityCombatAvailable } from '@/features/combat/UnityCombatStage';
import type { UnityAvatar } from '@/features/combat/unityFrame';
import type { FighterPose } from '@/features/combat/fighterMotion';
import { AVATAR_LABELS } from '@/features/avatar/avatar';

// Local spike: the catalog's compatibleBodies decide in the app; these mirror it for the workshop.
const TRAITS = {
  male: { faceStyle: ['original', 'angular', 'oval'], noseStyle: ['original', 'wide', 'aquiline', 'flat'],
    hairStyle: ['parted', 'buzzed', 'mohawk', 'afro'] },
  female: { faceStyle: ['original', 'heart', 'round'], noseStyle: ['original', 'button', 'straight'],
    hairStyle: ['buns', 'long', 'buzzed', 'ponytail', 'bob'] },
} as const satisfies Record<UnityAvatar['body'], { [K in 'faceStyle' | 'noseStyle' | 'hairStyle']: readonly UnityAvatar[K][] }>;

function pick<T extends string>(options: readonly T[], value: string): T {
  return options.find(option => option === value) ?? options[0];
}

export default function CharacterShowcaseScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><Showcase key={preview} preview={preview} /></AmbientBackdropProvider>;
}

function Showcase({ preview }: { preview?: string }) {
  const [body, setBody] = useState<UnityAvatar['body']>('male');
  const [faceStyle, setFaceStyle] = useState<UnityAvatar['faceStyle']>('original');
  const [noseStyle, setNoseStyle] = useState<UnityAvatar['noseStyle']>('wide');
  const [hairStyle, setHairStyle] = useState<UnityAvatar['hairStyle']>('parted');
  const [headband, setHeadband] = useState(true);
  const [section, setSection] = useState('Corps');
  const [skinTone, setSkinTone] = useState<UnityAvatar['skinTone']>('tan');
  const [eyeColor, setEyeColor] = useState<UnityAvatar['eyeColor']>('blue');
  const [hairColor, setHairColor] = useState<UnityAvatar['hairColor']>('brown');
  const [shirtColor, setShirtColor] = useState<UnityAvatar['shirtColor']>('cyan');
  const [pantsColor, setPantsColor] = useState<UnityAvatar['pantsColor']>('violet');
  const [boxingGloves, setBoxingGloves] = useState(true);
  const [dumbbell, setDumbbell] = useState(false);
  const [weapon, setWeapon] = useState<UnityAvatar['weapon']>();
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
  const traits = TRAITS[body];
  const face = pick(traits.faceStyle, faceStyle), nose = pick(traits.noseStyle, noseStyle), hair = pick(traits.hairStyle, hairStyle);
  const avatar: UnityAvatar = { body, hairStyle: hair, headband, visible: true,
    skinTone, eyeColor, hairColor, shirtColor, pantsColor, boxingGloves, dumbbell, weapon,
    weaponType: weapon ? 'SWORD' : 'FIST',
    faceStyle: face, noseStyle: nose };
  if (playing) return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    <BattleView battle={BATTLE_FIXTURES.duel} demo unityPlayer={avatar}
      unityEnemy={{ ...avatar, body: body === 'male' ? 'female' : 'male', hairStyle: body === 'male' ? 'buns' : 'parted',
        faceStyle: 'original', noseStyle: 'original',
        weapon: weapon === 'ferPlay' ? 'huilesson' : weapon === 'huilesson' ? 'ferPlay' : undefined,
        skinTone: skinTone === 'deep' ? 'light' : 'deep', eyeColor: 'brown', hairColor: 'black',
        shirtColor: shirtColor === 'cyan' ? 'coral' : 'cyan', pantsColor: pantsColor === 'coral' ? 'violet' : 'coral', headband: false }}
      onDismiss={() => { setReady(false); setPlaying(false); }} />
  </View>;
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    {preview !== 'inventory' && unityCombatAvailable && !failed && <UnityAvatarInspector avatar={avatar} pose={pose} phase={.5} animated={animated}
      view={view} azimuth={azimuth} viewport={{ x: 0, y: (controlsHeight + insets.bottom) / window.height, width: 1,
        height: Math.max(.1, (window.height - controlsHeight - headerHeight - insets.top - insets.bottom) / window.height) }}
      onReady={() => setReady(true)} onError={() => setFailed(true)} />}
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.header} onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}>
        <Text style={styles.title}>ATELIER AVATAR</Text>
        <Text style={styles.subtitle} testID={ready && !failed ? 'quaternius-ready' : undefined}>
          {preview === 'inventory' ? 'Aperçu inventaire' : !unityCombatAvailable ? 'Ce POC nécessite le development build avec Unity.'
            : failed ? 'Le rendu 3D n’a pas démarré.' : ready ? 'Spike local · Visage et nez' : 'Chargement…'}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le showcase" onPress={() => {
          if (router.canGoBack()) router.back(); else router.replace('/combat-demo?mob=pebble');
        }}><Text style={styles.link}>Fermer</Text></Pressable>
      </View>
      {preview === 'inventory' && <View style={{ flex: 1 }}>
        <AvatarPreview avatar={avatar} label="Aperçu inventaire" />
      </View>}
      <View style={styles.controls} onLayout={({ nativeEvent }) => setControlsHeight(nativeEvent.layout.height)}>
        <View style={styles.row}>
          {['Corps', 'Traits', 'Cheveux', 'Tenue', 'Mouvements'].map(label =>
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
        {section === 'Traits' && <>
          <View style={styles.row}>
            {traits.faceStyle.map(value => <Choice key={value} label={AVATAR_LABELS.faceStyle[value]} selected={face === value} onPress={() => setFaceStyle(value)} />)}
          </View>
          <View style={styles.row}>
            {traits.noseStyle.map(value => <Choice key={value} label={AVATAR_LABELS.noseStyle[value]} selected={nose === value} onPress={() => setNoseStyle(value)} />)}
          </View>
        </>}
        {section === 'Cheveux' && <>
        <View style={styles.row}>
          {traits.hairStyle.map(value => <Choice key={value} label={AVATAR_LABELS.hairStyle[value]} selected={hair === value} onPress={() => setHairStyle(value)} />)}
        </View>
        <View style={styles.row}>
          {([{ label: 'Châtains', value: 'brown' }, { label: 'Noirs', value: 'black' }, { label: 'Blonds', value: 'blond' }] as const).map(({ label, value }) =>
            <Choice key={value} label={label} selected={hairColor === value} onPress={() => setHairColor(value)} />)}
        </View>
        </>}
        {section === 'Tenue' && <>
        <View style={styles.row}>
          <Choice label="Blanc" selected={shirtColor === 'base'} onPress={() => setShirtColor('base')} />
          <Choice label="Ardoise" selected={shirtColor === 'cyan'} onPress={() => setShirtColor('cyan')} />
          <Choice label="Corail" selected={shirtColor === 'coral'} onPress={() => setShirtColor('coral')} />
        </View>
        <View style={styles.row}>
          {([{ label: 'Jogging', value: 'base' }, { label: 'Guinzz violet', value: 'violet' },
            { label: 'Guinzz cyan', value: 'cyan' }, { label: 'Guinzz corail', value: 'coral' }] as const).map(({ label, value }) =>
            <Choice key={value} label={label} selected={pantsColor === value} onPress={() => setPantsColor(value)} />)}
        </View>
        <View style={styles.row}>
          {<Choice label={headband ? 'Retirer le bandeau' : 'Équiper le bandeau'} selected={headband} onPress={() => setHeadband(!headband)} />}
        </View>
        <View style={styles.row}>
          <Choice label={boxingGloves ? 'Retirer les gants' : 'Équiper les gants dorés'} selected={boxingGloves} onPress={() => { setBoxingGloves(!boxingGloves); setDumbbell(false); setWeapon(undefined); }} />
          <Choice label="Gants" selected={view === 2} onPress={() => { setView(2); setAzimuth(25); }} />
        </View>
        <View style={styles.row}>
          <Choice label={dumbbell ? 'Retirer l’haltère' : 'Équiper Le Poids Lourd'} selected={dumbbell} onPress={() => { setDumbbell(!dumbbell); setBoxingGloves(false); setWeapon(undefined); }} />
          <Choice label="Prise" selected={view === 2} onPress={() => { setPose('attack'); setAnimated(false); setView(2); setAzimuth(-65); }} />
        </View>
        <View style={styles.row}>
          {([{ label: 'Fer play', value: 'ferPlay' }, { label: 'Huilesson', value: 'huilesson' }] as const).map(item =>
            <Choice key={item.value} label={weapon === item.value ? `Retirer ${item.label}` : `Équiper ${item.label}`} selected={weapon === item.value}
              onPress={() => { setWeapon(weapon === item.value ? undefined : item.value); setDumbbell(false); setBoxingGloves(false); }} />)}
        </View>
        {dumbbell && <Text style={styles.subtitle}>Essai atelier · animations à adapter</Text>}
        </>}
        {section === 'Mouvements' && <>
        <View style={styles.row}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poseList} contentContainerStyle={styles.poseRow}>
            {([{ label: 'Repos', pose: 'idle' }, { label: weapon ? 'Taille' : 'Direct', pose: 'attack' }, { label: weapon ? 'Slash' : 'Uppercut', pose: 'critical' },
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
