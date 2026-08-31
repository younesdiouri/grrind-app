import { StyleSheet, Text, View } from 'react-native';

import { CoinAmount } from '@/components/CoinAmount';
import type { components } from '@/api/schema';
import { coinReasonLabel, color, space, type } from '@/design/tokens';

type CoinTransactionRowProps = {
  reason: components['schemas']['CoinTransaction']['reason'];
  /** `CoinTransaction.amount`, rendu à l'identique — rien à recalculer. Toujours **signé**,
   *  même si aucune ligne négative n'existe encore en v1 : voir le docblock de `CoinAmount`. */
  amount: number;
  /** Déjà en phrase — `formatOccurredAt`. La ligne n'a pas d'horloge, même idiome que
   *  `BattleRow`. */
  when: string;
};

/**
 * Une ligne de l'historique de la bourse — le pendant, pour le ledger de pièces, de `BattleRow`
 * pour l'historique des combats. Purement présentative, pour la même raison : aucune date
 * brute n'y entre, et la mise en phrase de la raison est déjà tranchée par `coinReasonLabel`.
 */
export function CoinTransactionRow({ reason, amount, when }: CoinTransactionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.reason}>{coinReasonLabel[reason]}</Text>
        <Text style={styles.when}>{when}</Text>
      </View>

      <CoinAmount amount={amount} signed />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  body: { flex: 1, gap: space.xs },
  reason: { ...type.body, color: color.text },
  when: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
