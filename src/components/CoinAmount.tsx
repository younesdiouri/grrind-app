import { StyleSheet, Text } from 'react-native';

import { color, type } from '@/design/tokens';

type CoinAmountProps = {
  amount: number;
  /**
   * Signé, avec son `+` — l'historique du ledger (`CoinTransaction.amount`) en aura besoin,
   * lui qui garde son signe même si aucune ligne négative n'existe encore en v1. Ailleurs — un
   * solde, le prix d'une carte d'objet, un gain de tirage — le montant vaut ce qu'il vaut et
   * ne porte pas de signe : `false` par défaut.
   */
  signed?: boolean;
};

/**
 * Un montant en pièces — la bourse, un prix, une ligne du ledger.
 *
 * `color.coin` et pas `color.celebrate` : une pièce se consulte, elle ne se célèbre pas — voir
 * le docblock du token. « Pièce » s'accorde comme `formatTurns` accorde ses tours : singulier
 * au-dessous de deux, y compris à zéro, pluriel au-delà.
 */
export function CoinAmount({ amount, signed = false }: CoinAmountProps) {
  const sign = signed && amount > 0 ? '+' : '';
  const unit = Math.abs(amount) === 1 ? 'pièce' : 'pièces';

  return (
    <Text style={styles.amount}>
      {sign}
      {amount} {unit}
    </Text>
  );
}

const styles = StyleSheet.create({
  amount: { ...type.body, color: color.coin },
});
