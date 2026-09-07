import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { color, combatMotion, space, type } from '@/design/tokens';
import { BattleView } from '@/features/combat/BattleView';
import { AL_KASAL, EnemySprite } from '@/features/combat/EnemySprite';
import type { EnemyPose } from '@/features/combat/enemyMotion';
import { BATTLE_FIXTURES } from '@/features/combat/fixtures';
import { useAuth } from '@/features/auth/useAuth';

const POSES: { value: EnemyPose; label: string }[] = [
  { value: 'idle', label: 'Repos' }, { value: 'attack', label: 'Attaque' }, { value: 'hit', label: 'Coup reçu' },
];

export default function CombatDemoScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><CombatDemo /></AmbientBackdropProvider>;
}

function CombatDemo() {
  const auth = useAuth();
  const [pose, setPose] = useState<EnemyPose>('idle');
  const [scenario, setScenario] = useState<'victoire' | 'defaiteBoss' | null>(null);
  const clock = useSharedValue(0);
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerLeft: () => (
        <Pressable accessibilityRole="button" onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace(auth.status === 'signedIn' ? '/combat' : '/login');
        }} style={styles.close}>
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      ) }} />
      <Text style={styles.notice}>DÉMONSTRATION · AUCUN GAIN RÉEL</Text>
      {scenario ? (
        <BattleView battle={BATTLE_FIXTURES[scenario]} enemyArt={AL_KASAL} demo onDismiss={() => setScenario(null)} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Al-Kasal</Text>
          <Text style={styles.subtitle}>La paresse prend corps.</Text>
          <View style={styles.preview} testID={`al-kasal-${pose}`}>
            <EnemySprite artwork={AL_KASAL} clock={clock} beats={[]} pose={pose} />
          </View>
          <View style={styles.poses}>
            {POSES.map((option) => (
              <Pressable key={option.value} onPress={() => setPose(option.value)} accessibilityRole="button"
                accessibilityState={{ selected: pose === option.value }} style={[styles.pose, pose === option.value && styles.selected]}>
                <Text style={styles.poseLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Jouer une victoire" onPress={() => setScenario('victoire')} />
          <Button label="Jouer une défaite" variant="quiet" onPress={() => setScenario('defaiteBoss')} />
          <Text style={styles.subtitle}>Pendant le combat, touche pour passer au bilan, puis revenir ici.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  notice: { ...type.label, textAlign: 'center', color: color.textMuted, padding: space.sm },
  content: { padding: space.lg, gap: space.md },
  title: { ...type.title, color: color.text, textAlign: 'center' },
  subtitle: { ...type.body, color: color.textMuted, textAlign: 'center' },
  preview: { height: combatMotion.previewHeight },
  poses: { flexDirection: 'row', gap: space.sm },
  pose: { flex: 1, paddingVertical: space.md, borderWidth: 1, borderColor: color.border },
  selected: { borderColor: color.accent, backgroundColor: color.surfaceRaised },
  poseLabel: { ...type.label, color: color.text, textAlign: 'center', letterSpacing: 0 },
  close: { paddingVertical: space.sm, paddingRight: space.sm },
  closeText: { ...type.body, color: color.accent },
});
