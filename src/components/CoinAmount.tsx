import { StyleSheet, Text, View } from 'react-native';

import { CoinIcon } from '@/components/CoinIcon';
import { color, space, type } from '@/design/tokens';

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
 * Le mot reste dans le libellé d'accessibilité, mais disparaît visuellement au profit du jeton
 * gravé. La monnaie se reconnaît ainsi avant de se lire, comme le niveau ou la Vitalité.
 */
export function CoinAmount({ amount, signed = false }: CoinAmountProps) {
  const sign = signed && amount > 0 ? '+' : '';
  const unit = Math.abs(amount) === 1 ? 'pièce' : 'pièces';

  return (
    <View style={styles.amount} accessible accessibilityLabel={`${sign}${amount} ${unit}`}>
      <CoinIcon />
      <Text style={styles.value} accessibilityElementsHidden>
        {sign}
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  value: { ...type.body, color: color.coin },
});
