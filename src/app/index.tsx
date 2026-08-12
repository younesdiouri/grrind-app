import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '@/design/tokens';
import { FIXTURES, type FixtureName } from '@/features/reward/fixtures';

/**
 * Le sélecteur de fixtures du spike.
 *
 * Il n'a aucune vocation à survivre : c'est un banc d'essai pour jouer les trois cas réels
 * capturés sur le back, sur un appareil physique, sans réseau. Ce qu'on regarde ici, c'est
 * si React Native tient l'écran signature du produit — pas si l'écran est joli.
 */
export default function SpikeIndex() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.intro}>
        Trois réponses réelles du back, capturées sous l&apos;équilibrage v1. Toucher
        l&apos;écran pendant la séquence la saute.
      </Text>

      {(Object.keys(FIXTURES) as FixtureName[]).map((name) => {
        const summary = FIXTURES[name];
        return (
          <Link key={name} href={{ pathname: '/reward', params: { fixture: name } }} asChild>
            <View style={styles.card}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.detail}>
                {summary.xp.awarded > 0 ? '+' : ''}
                {summary.xp.awarded} XP · {summary.xp.breakdown.length} ligne
                {summary.xp.breakdown.length > 1 ? 's' : ''} ·{' '}
                {summary.level.reached.length > 0
                  ? `niveau ${summary.level.reached.join(', ')}`
                  : 'aucun niveau'}
                {summary.titlesUnlocked.length > 0
                  ? ` · ${summary.titlesUnlocked.length} titre`
                  : ''}
              </Text>
            </View>
          </Link>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  intro: { ...type.body, color: color.textMuted },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  name: { ...type.title, color: color.text },
  detail: { ...type.body, color: color.textMuted },
});
