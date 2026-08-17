import { Platform, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '@/design/tokens';

type InviteCodeBlockProps = {
  /** Les huit caractères tels que rendus par le serveur — aucune casse à corriger côté client. */
  code: string;
  /**
   * L'expiration, **déjà en phrase** — « valable jusqu'à demain 18 h ». Le calcul relatif
   * (aujourd'hui, demain, plus tard) vit avec le reste des formats de date, hors du design
   * system : une carte de preview fige un instant, elle n'a pas d'horloge. C'est le même
   * choix que `SessionCard.when`.
   */
  expiresAt: string;
};

/**
 * Le laissez-passer d'une guilde : un code à dicter, une date à laquelle il ne vaudra plus
 * rien.
 *
 * Le code n'est jamais un compte à rebours — les secondes se périmeraient dans l'écran
 * lui-même — et sa police est **monospace, à lettrage large** : le serveur a déjà retiré
 * `O`/`0` et `I`/`L`/`1` de son alphabet, la police système ne doit pas recoller ce que le
 * serveur a détaché.
 */
export function InviteCodeBlock({ code, expiresAt }: InviteCodeBlockProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.expiry}>{expiresAt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
    alignItems: 'center',
  },
  code: {
    ...type.code,
    color: color.text,
    textAlign: 'center',
    // Le nom de police est une décision de plateforme, pas une valeur de design : elle n'a
    // donc pas sa place dans les tokens, qui se lisent aussi depuis Node — voir tokens.ts.
    // 'monospace' est un nom générique qu'Android résout ; iOS l'ignore et il faut le nommer.
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  expiry: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
