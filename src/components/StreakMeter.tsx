import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { color, rarityColor, rarityLabel, space, type, typography } from '@/design/tokens';

export type StreakState = components['schemas']['StreakState'];

const WEEK = 7;

/**
 * La série de régularité (#182) : les jours, les sept derniers jours en pastilles, le prochain
 * coffre. Tout est lu sur `StreakState` — la règle des 6/7 et des 30 minutes est serveur.
 *
 * `fresh` allume en or les pastilles que la synchro vient de gagner. `days` remplace le
 * nombre quand l'appelant l'anime : Reanimated reste hors du design system, donc des previews.
 * `hero` est la tête de l'écran de récompense, `inline` la carte de l'accueil — comme `XpBar`.
 */
export function StreakMeter({
  state,
  fresh = 0,
  days,
  size = 'inline',
}: {
  state: StreakState;
  fresh?: number;
  days?: ReactNode;
  size?: 'inline' | 'hero';
}) {
  const hero = size === 'hero';
  const lit = Math.min(WEEK, state.sportDaysInLast7);
  const unit = state.days > 1 ? 'jours' : 'jour';

  return (
    <View
      style={styles.meter}
      accessible
      accessibilityLabel={`Série de ${state.days} ${unit}, ${lit} jours sportifs sur 7, prochain coffre ${rarityLabel[state.nextChestRarity]}`}
    >
      <View style={styles.head}>
        <Text style={styles.label}>SÉRIE</Text>
        <View style={styles.days}>
          {days ?? <Text style={[styles.count, hero && streakHeroCount]}>{state.days}</Text>}
          <Text style={styles.label}>{unit.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.pips}>
        {Array.from({ length: WEEK }, (_, index) => (
          <View
            key={index}
            style={[
              styles.pip,
              hero && styles.heroPip,
              index < lit && styles.lit,
              index < lit && index >= lit - fresh && styles.fresh,
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        {lit}/7 JOURS SPORTIFS · PROCHAIN COFFRE{' '}
        <Text style={{ color: rarityColor[state.nextChestRarity] }}>
          {rarityLabel[state.nextChestRarity].toUpperCase()}
        </Text>
      </Text>
    </View>
  );
}

/** Le compteur de tête, exporté pour la version animée de l'appelant — même jeu que `xpBarFill`. */
export const streakHeroCount = {
  ...type.display,
  fontFamily: typography.display.bold,
  fontWeight: typography.display.weight.bold,
};

const styles = StyleSheet.create({
  meter: { gap: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  days: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  count: { ...type.title, color: color.accent, padding: 0 },
  label: { ...type.label, color: color.textMuted },
  pips: { flexDirection: 'row', gap: space.xs },
  pip: { flex: 1, height: space.sm, borderRadius: space.xs, backgroundColor: color.surfaceRaised },
  heroPip: { height: space.md, borderRadius: space.sm },
  lit: { backgroundColor: color.accent },
  fresh: { backgroundColor: color.celebrate },
});
