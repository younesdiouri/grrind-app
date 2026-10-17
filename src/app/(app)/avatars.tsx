import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSharedValue } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { SystemFrame } from '@/components/SystemFrame';
import { appearanceArt, color, control, frame, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import { useAppearances } from '@/features/combat/useAppearances';
import { appearanceArtwork } from '@/features/combat/appearances';
import { equippedArtwork } from '@/features/combat/equippedArtwork';
import { FighterSprite } from '@/features/combat/FighterSprite';
import { BattleView } from '@/features/combat/BattleView';
import { BATTLE_FIXTURES } from '@/features/combat/fixtures';
import type { FighterPose } from '@/features/combat/fighterMotion';

const poses: { value: FighterPose; label: string }[] = [
  { value: 'idle', label: 'Garde' }, { value: 'attack', label: 'Attaque' }, { value: 'hit', label: 'Coup reçu' },
  { value: 'critical', label: 'Critique' }, { value: 'dodge', label: 'Esquive' },
  { value: 'combo', label: 'Combo' }, { value: 'replay', label: 'Relance' },
];

export default function AvatarsScreen() {
  const catalog = useAppearances();
  const [key, setKey] = useState('STRENGTH_V1');
  const [view, setView] = useState<'back' | 'front'>('back');
  const [pose, setPose] = useState<FighterPose>('idle');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState(false);
  const clock = useSharedValue(0);
  if (!__DEV__) return <Redirect href="/" />;
  const models = catalog.data?.appearances ?? [];
  const model = models.find((entry) => entry.key === key) ?? models[0];
  const items = (catalog.data?.equipment ?? []).filter((entry) => entry.selectable && entry.compatibleAppearances.includes(model?.key ?? ''));
  const equipment = Object.fromEntries(items.filter((item) => selected[item.slot] === item.key)
    .map((item) => [item.slot, { key: item.key, artworkVersion: item.version }]));
  const fighter = { appearance: model?.key, equipment };
  const artwork = appearanceArtwork(models, model?.key, view, model?.name ?? 'Avatar');
  if (playing && model) {
    const enemy = models[(models.indexOf(model) + 1) % models.length];
    const sample = BATTLE_FIXTURES.victoire;
    return <View style={styles.fullscreen}>
      <Stack.Screen options={{ headerShown: false }} />
      <BattleView battle={{ ...sample, player: { ...sample.player, appearance: model.key, equipment },
        enemy: { ...sample.enemy, key: null, name: enemy.name, appearance: enemy.key, equipment, imageUrls: null, introduction: null } }}
        heroArt={appearanceArtwork(models, model.key, 'back', model.name)}
        enemyArt={appearanceArtwork(models, enemy.key, 'front', enemy.name)}
        heroEquipment={equippedArtwork(items, fighter, 'back')}
        opponentEquipment={equippedArtwork(items, { appearance: enemy.key, equipment }, 'front')}
        demo onDismiss={() => setPlaying(false)} />
    </View>;
  }
  return <ScrollView contentContainerStyle={styles.screen}>
    <Stack.Screen options={{ title: 'Atelier des avatars' }} />
    <Text style={styles.title}>Avatars sportifs</Text>
    <Text style={styles.body}>Aperçu sans gain ni modification de ton équipement.</Text>
    {catalog.isLoading && <ActivityIndicator color={color.accent} />}
    {catalog.isError && <Text style={styles.body}>{messageFor(catalog.error)}</Text>}
    <View style={styles.options}>
      {models.filter((entry) => entry.selectable).map((entry) => <Pressable key={entry.key}
        testID={`art-avatar-${entry.key}`} accessibilityRole="button" accessibilityLabel={entry.name}
        accessibilityState={{ selected: model?.key === entry.key }} onPress={() => setKey(entry.key)}
        style={[styles.option, model?.key === entry.key && styles.selected]}><Text style={styles.label}>{entry.name}</Text></Pressable>)}
    </View>
    <SystemFrame tier="hero" contentStyle={styles.preview}>
      {artwork && <FighterSprite key={model?.key + view + JSON.stringify(equipment)} artwork={artwork}
        equipment={equippedArtwork(items, fighter, view)} clock={clock} beats={[]} pose={pose} staticPreview />}
    </SystemFrame>
    <View style={styles.options}>
      {(['back', 'front'] as const).map((value) => <Button key={value} label={value === 'back' ? 'Vers la droite' : 'Vers la gauche'}
        variant={view === value ? 'solid' : 'quiet'} onPress={() => setView(value)} />)}
    </View>
    <View style={styles.options}>
      {poses.map((entry) => <Pressable key={entry.value} testID={`art-pose-${entry.value}`}
        accessibilityRole="button" accessibilityLabel={entry.label} accessibilityState={{ selected: pose === entry.value }}
        onPress={() => setPose(entry.value)} style={[styles.option, pose === entry.value && styles.selected]}>
        <Text style={styles.label}>{entry.label}</Text></Pressable>)}
    </View>
    <Text style={styles.title}>Équipements</Text>
    {items.map((item) => <Pressable key={item.key} testID={`art-item-${item.key}`} accessibilityRole="checkbox"
      accessibilityLabel={item.name} accessibilityState={{ checked: selected[item.slot] === item.key }}
      onPress={() => setSelected((current) => ({ ...current, [item.slot]: current[item.slot] === item.key ? '' : item.key }))}
      style={[styles.item, selected[item.slot] === item.key && styles.selected]}>
      <Image source={{ uri: item.iconUrl }} style={styles.icon} contentFit="contain" />
      <Text style={styles.label}>{item.name}</Text>
    </Pressable>)}
    <Button label="Jouer un combat de démonstration" disabled={!model} onPress={() => setPlaying(true)} />
    <Button label="Actualiser le catalogue" variant="quiet" onPress={() => void catalog.refetch()} />
    <Button label="Choisir mon avatar" variant="quiet" onPress={() => router.push('/reglages')} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md, backgroundColor: color.background },
  fullscreen: { flex: 1, backgroundColor: color.background },
  title: { ...type.title, color: color.text }, body: { ...type.body, color: color.textMuted },
  label: { ...type.label, color: color.text, letterSpacing: 0 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { padding: space.sm, borderWidth: control.borderWidth, borderColor: color.border, borderRadius: frame.standard.radius },
  selected: { borderColor: color.accent, backgroundColor: color.surfaceRaised },
  preview: { height: appearanceArt.overviewHeight },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm,
    borderWidth: control.borderWidth, borderColor: color.border, borderRadius: frame.standard.radius },
  icon: { width: appearanceArt.itemIconSize, height: appearanceArt.itemIconSize },
});
