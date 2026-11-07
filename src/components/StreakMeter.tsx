import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { color, rarityColor, rarityLabel, space, type } from '@/design/tokens';

export type StreakState = components['schemas']['StreakState'];

const WEEK = 7;
/** Les seuils de palier, lus sur la description du contrat (#346) — affichés, jamais appliqués. */
const TIERS = new Set([3, 6]);

/**
 * La série d'assiduité (#360) : les jours d'ouverture consécutifs, puis la semaine en cours en
 * pastilles — une par jour de sport — avec le palier du coffre qu'elle vaut si elle s'arrêtait
 * là. Le palier vient de `chestRarity`, le client ne le déduit pas des pastilles.
 */
export function StreakMeter({ state }: { state: StreakState }) {
  const lit = Math.min(WEEK, state.sportDaysThisWeek);
  const unit = state.days > 1 ? 'jours' : 'jour';
  const rarity = rarityLabel[state.chestRarity];

  return (
    <View
      style={styles.meter}
      accessible
      accessibilityLabel={`Série de ${state.days} ${unit}, ${lit} jours de sport cette semaine, coffre ${rarity}`}
    >
      <View style={styles.head}>
        <Text style={styles.label}>SÉRIE</Text>
        <View style={styles.days}>
          <Text style={styles.count}>{state.days}</Text>
          <Text style={styles.label}>{unit.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.pips}>
        {Array.from({ length: WEEK }, (_, index) => (
          <View
            key={index}
            style={[styles.pip, TIERS.has(index) && styles.tier, index < lit && styles.lit]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        {lit}/7 JOURS DE SPORT · COFFRE{' '}
        <Text style={{ color: rarityColor[state.chestRarity] }}>{rarity.toUpperCase()}</Text>
      </Text>
      <Text style={styles.rule}>Ouvre l’app chaque jour : semaine complète, coffre le lundi.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  days: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  count: { ...type.title, color: color.accent, padding: 0 },
  label: { ...type.label, color: color.textMuted },
  rule: { ...type.body, color: color.textMuted },
  pips: { flexDirection: 'row', gap: space.xs },
  pip: { flex: 1, height: space.sm, borderRadius: space.xs, backgroundColor: color.surfaceRaised },
  tier: { marginLeft: space.sm },
  lit: { backgroundColor: color.accent },
});
