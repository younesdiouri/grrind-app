import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoinAmount } from '@/components/CoinAmount';
import { SystemFrame } from '@/components/SystemFrame';
import type { DecorativeGlow } from '@/design/decorativeGlow';
import { color, opacity, space, type, typography } from '@/design/tokens';

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
  /** Déjà résolu par l'écran ; la ligne reste pure, y compris dans la preview SSR. */
  glow: DecorativeGlow;
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
export function BagRow({ summary, onPress, glow }: BagRowProps) {
  const accessibilityLabel =
    summary === undefined
      ? 'Sac et bourse'
      : `Sac et bourse, ${summary.itemCount} objet${summary.itemCount > 1 ? 's' : ''}, ${summary.coins} pièce${summary.coins > 1 ? 's' : ''}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID="bag-row"
    >
      <SystemFrame
        tier="hero"
        style={glow.effect === undefined ? undefined : { boxShadow: glow.effect.boxShadow }}
        contentStyle={styles.row}
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
      </SystemFrame>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { alignSelf: 'stretch' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
  },
  // Même retour d'appui que `DangerRow` et `Button` : la ligne s'éteint sous le doigt, rien
  // ne se déplace.
  pressed: { opacity: opacity.pressed },
  identity: { flex: 1, gap: space.xs },
  label: { ...type.body, fontFamily: typography.display.semibold, color: color.text },
  detail: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  chevron: { ...type.body, color: color.textMuted },
});
