import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { color, space, type, xpSourceLabel } from '@/design/tokens';

/**
 * Une ligne du calcul d'XP : d'où elle vient, combien elle pèse.
 *
 * **Le signe est porté par la couleur autant que par le nombre.** Une ligne négative n'est
 * pas une erreur — les rendements décroissants et le plafond quotidien sont des règles du
 * jeu, et les cacher dans un total ferait de l'écran un chiffre à croire au lieu d'un calcul
 * à suivre.
 *
 * Le libellé sort de `xpSourceLabel`, indexé sur l'union du schéma : une source ajoutée au
 * contrat casse la compilation ici, elle ne traverse pas en `undefined`.
 */
export function BreakdownRow({
  source,
  amount,
}: {
  source: components['schemas']['XpLine']['source'];
  amount: number;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{xpSourceLabel[source]}</Text>
      <Text style={[styles.amount, amount < 0 ? styles.loss : styles.gain]}>
        {amount > 0 ? '+' : ''}
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  label: { ...type.body, color: color.textMuted, flexShrink: 1 },
  amount: { ...type.body },
  gain: { color: color.gain },
  loss: { color: color.loss },
});
