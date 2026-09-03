import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoinAmount } from '@/components/CoinAmount';
import { decorativeGlow, type DecorativeGlow } from '@/design/decorativeGlow';
import { color, opacity, radius, space, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';

type BagRowProps = {
  /**
   * Le solde et le compte du sac, ou `undefined` tant qu'ils ne sont pas connus.
   *
   * La ligne se dessine **quand même** dans ce cas : elle est le seul chemin vers le sac, et
   * une entrée qui n'apparaît qu'une fois l'inventaire chargé serait introuvable exactement
   * quand le réseau va mal. Ce qu'on ne sait pas ne s'écrit pas — ni zéro, ni tiret, qui
   * seraient tous deux des chiffres faux.
   */
  summary?: { coins: number; itemCount: number };
  onPress: () => void;
  /** La preview choisit un état lumineux concret ; l'app lit toujours la préférence système. */
  glow?: DecorativeGlow;
};

/**
 * L'entrée du sac, sur l'accueil — sous la carte du joueur, au-dessus de l'historique.
 *
 * C'est l'« action future » que le docblock de l'accueil gardait entre le résumé et l'archive
 * depuis le #84 : le résumé, l'action, **puis** l'archive. Posée sous l'historique, elle
 * deviendrait introuvable dès qu'un compte a des séances — c'est arrivé au lien vers Santé, et
 * la règle existe pour ça.
 *
 * Elle porte la bourse autant que le sac : les deux vivent dans la même réponse et sur le même
 * écran, et un solde qu'on ne voit qu'en ouvrant est un solde qu'on oublie.
 */
export function BagRow({ summary, onPress, glow: suppliedGlow }: BagRowProps) {
  const systemGlow = decorativeGlow('soft', useReducedMotion());
  const glow = suppliedGlow ?? systemGlow;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        glow.effect === undefined ? undefined : { boxShadow: glow.effect.boxShadow },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Sac et bourse"
      testID="bag-row"
    >
      <View style={styles.identity}>
        <Text style={styles.label}>Sac</Text>
        {summary === undefined ? null : (
          <Text style={styles.detail}>
            {summary.itemCount} objet{summary.itemCount > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {summary === undefined ? null : <CoinAmount amount={summary.coins} />}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  // Même retour d'appui que `DangerRow` et `Button` : la ligne s'éteint sous le doigt, rien
  // ne se déplace.
  pressed: { opacity: opacity.pressed },
  identity: { flex: 1, gap: space.xs },
  label: { ...type.body, color: color.text },
  detail: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  chevron: { ...type.body, color: color.textMuted },
});
