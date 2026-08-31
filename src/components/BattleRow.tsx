import { StyleSheet, Text, View } from 'react-native';

import { BattleResultBadge } from '@/components/BattleResultBadge';
import { CoinAmount } from '@/components/CoinAmount';
import type { components } from '@/api/schema';
import { color, space, type } from '@/design/tokens';

type BattleRowProps = {
  result: components['schemas']['BattleSummary']['result'];
  /** Déjà traduit par le serveur, depuis la clé du **snapshot** du combat — jamais depuis le
   *  catalogue courant : un combat joué est un fait écrit, et `combat.yaml` continue de bouger. */
  enemyName: string;
  /** Déjà en phrase — `formatTurns`. La ligne n'accorde pas les pluriels, comme `SessionCard`
   *  ne formate pas sa durée. */
  turns: string;
  /** Déjà en phrase — `formatFoughtAt`. La ligne n'a pas d'horloge. */
  when: string;
  /**
   * `BattleSummary.rewards.coins.gained` (#227), rendu à l'identique — rien à recalculer.
   *
   * **Jamais le loot.** Vingt lignes portant chacune une carte d'objet ne seraient plus une
   * liste, ce serait un mur ; et le butin d'un combat précis se retrouve déjà en l'ouvrant, ce
   * que la liste permet sans qu'il faille le répéter ici. Zéro ne s'affiche pas non plus — un
   * combat sans gain ne montre rien de plus qu'avant #227.
   */
  coinsGained: number;
};

/**
 * Une ligne de l'historique des combats.
 *
 * Purement présentative : aucune date brute, aucun nombre à accorder n'y entre. Le tap qui
 * mènera au rejeu n'est pas ici non plus — c'est un geste de navigation, il vivra à l'endroit
 * qui compose la ligne, comme `GuildMemberRow` dans son roster.
 */
export function BattleRow({ result, enemyName, turns, when, coinsGained }: BattleRowProps) {
  return (
    <View style={styles.row}>
      <BattleResultBadge result={result} />

      <View style={styles.body}>
        <Text style={styles.enemy} numberOfLines={1}>
          {enemyName}
        </Text>
        <Text style={styles.meta}>
          {turns} · {when}
        </Text>
      </View>

      {coinsGained > 0 && <CoinAmount amount={coinsGained} />}
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
  enemy: { ...type.body, color: color.text },
  meta: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
