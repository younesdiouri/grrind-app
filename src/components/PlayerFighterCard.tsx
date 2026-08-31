import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { color, radius, space, type } from '@/design/tokens';

type PlayerFighterCardProps = {
  /**
   * Le combattant de l'appelant, tel que `GET /api/enemies` le sert (#227) — modificateurs
   * équipés compris. C'est le seul endroit de l'API où leur effet se lit avant de s'engager :
   * `GET /api/progression` continue de rendre le socle nu du ledger, et rien ici ne le
   * recompose.
   */
  player: components['schemas']['BattleFighter'];
};

/**
 * Le bloc « toi », en tête du catalogue d'adversaires (#227).
 *
 * **Les cinq mêmes valeurs, dans la même unité et la même forme qu'`EnemyCard`** : points de
 * vie, dégâts, et les trois taux déjà résolus en pourcentages entiers côté serveur. C'est ce
 * qui rend la comparaison possible d'un coup d'œil — le catalogue existait déjà, l'intérêt de
 * lui ajouter son propre combattant est justement de pouvoir le lire à côté des adversaires
 * sans rien recomposer, ni ici ni ailleurs.
 *
 * Une carte à part plutôt qu'`EnemyCard` réutilisée : `BattleFighter` n'a ni `key`, ni `name`,
 * ni `minimumLevel` — un combattant sans identité de catalogue et sans verrou de niveau, ce
 * n'est pas un `Enemy` auquel il manquerait des champs, c'est une forme différente.
 */
export function PlayerFighterCard({ player }: PlayerFighterCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>Toi</Text>

      <View style={styles.stats}>
        <Stat label="Vie" value={String(player.hp)} />
        <Stat label="Dégâts" value={String(player.damage)} />
        <Stat label="Armure" value={`${player.mitigationPercent} %`} />
        <Stat label="Relance" value={`${player.extraTurnPercent} %`} />
        <Stat label="Esquive" value={`${player.dodgePercent} %`} />
      </View>
    </View>
  );
}

/** Même sous-composant qu'`EnemyCard`, dupliqué plutôt que partagé : chaque carte porte les
 *  siens, comme partout ailleurs dans le design system. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  name: { ...type.body, color: color.text },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { gap: space.xs },
  statValue: { ...type.body, color: color.text },
  statLabel: { ...type.label, color: color.textMuted },
});
