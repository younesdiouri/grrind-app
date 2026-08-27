import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { color, space, type, xpNoCreditReasonLabel } from '@/design/tokens';

/**
 * La ligne qui prend la place du calcul quand il n'y a pas eu de calcul.
 *
 * De la même famille que `BreakdownRow`, et posée au même endroit — mais elle ne porte pas de
 * nombre, parce qu'il n'y en a pas. Une ligne « base : 0 » mentirait sur un calcul qui n'a
 * jamais eu lieu, et c'est précisément ce que le serveur a refusé d'envoyer.
 *
 * **Ni `gain` ni `loss`.** Le vocabulaire de couleur de `BreakdownRow` dit « tu as gagné » ou
 * « on t'a repris » ; ici il ne s'est produit ni l'un ni l'autre. La séance compte, elle
 * nourrit Vitality, elle ne rapporte simplement pas d'expérience — c'est une règle du jeu, et
 * elle se lit dans le ton de ce qui s'explique, pas dans celui de ce qui se célèbre.
 *
 * Le libellé sort de `xpNoCreditReasonLabel`, indexé sur l'union du schéma : une raison
 * ajoutée au contrat casse la compilation, elle ne traverse pas en `undefined`.
 */
export function NoCreditRow({
  reason,
}: {
  reason: NonNullable<components['schemas']['RewardSummary']['xp']['reason']>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{xpNoCreditReasonLabel[reason]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { ...type.body, color: color.textMuted, flexShrink: 1 },
});
