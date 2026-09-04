import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { SystemFrame } from '@/components/SystemFrame';
import { color, opacity, radius, space, type, typography } from '@/design/tokens';

type EnemyCardProps = {
  /**
   * L'entrée du catalogue, telle que le serveur la sert. `name` arrive **déjà traduit**, dans
   * la langue négociée sur `Accept-Language` — le client n'a aucune table de correspondance,
   * comme pour les titres.
   */
  enemy: components['schemas']['Enemy'];
  /**
   * Le niveau requis n'est pas atteint.
   *
   * La comparaison se fait chez l'appelant (`catalogFor`), pas ici : la carte ne connaît pas
   * le joueur, et une carte qui saurait comparer serait une carte qu'on ne peut pas dessiner
   * sans un joueur. C'est la même frontière que `SessionCard`, qui reçoit une durée déjà mise
   * en phrase plutôt qu'une horloge.
   */
  locked?: boolean;
  /**
   * Ce qu'on peut faire de cet adversaire — un bouton, en pratique.
   *
   * Une **fente**, et non un `onPress` sur la carte : le design system ne connaît ni la
   * navigation ni les appels réseau, et une carte qui porterait son action deviendrait
   * indessinable sans elle. C'est la même frontière que `RisalaCard`, dont le tap vit à
   * l'endroit qui la compose, et que `GuildMemberRow`, enveloppée dans un `Link` par son
   * roster.
   *
   * Absente, la carte se lit sans rien proposer — c'est l'état d'un adversaire verrouillé,
   * et celui du catalogue avant que le lancement n'existe.
   */
  action?: ReactNode;
};

/**
 * Un adversaire du catalogue — ennemi ordinaire ou boss, **sous la même forme**.
 *
 * Il n'y a pas de variante « boss » et ce n'est pas un oubli : `Enemy` a exactement la même
 * forme pour les deux, et rien dans la charge utile ne dit lequel en est un. Voir
 * `features/combat/catalog.ts` pour la raison complète, et pour l'heuristique qu'il ne faut
 * pas réintroduire ici.
 *
 * Un adversaire verrouillé reste **visible et lisible** : c'est ce qui donne une raison de
 * monter de niveau. Il s'éteint par `opacity.inert` — le voile qui dit « là mais ne répond
 * pas », le même que partout ailleurs — plutôt que par une couleur propre, qui en ferait un
 * refus.
 */
export function EnemyCard({ enemy, locked = false, action }: EnemyCardProps) {
  return (
    <SystemFrame style={locked && styles.locked} contentStyle={styles.card}>
      <View style={styles.head}>
        <Text style={styles.name}>{enemy.name}</Text>
        <View style={styles.levelChip}>
          <Text style={styles.levelLabel}>NIVEAU {enemy.minimumLevel}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Vie" value={String(enemy.hp)} />
        <Stat label="Dégâts" value={String(enemy.damage)} />
        <Stat label="Armure" value={`${enemy.mitigationPercent} %`} />
        <Stat label="Relance" value={`${enemy.extraTurnPercent} %`} />
        <Stat label="Esquive" value={`${enemy.dodgePercent} %`} />
      </View>

      {action}
    </SystemFrame>
  );
}

/**
 * Une valeur de combat sous son nom.
 *
 * Les trois pourcentages sont **déjà résolus par le serveur** — jamais deux taux que le client
 * recomposerait, même règle que le `bonusPercent` des Risālāt. Il n'y a donc rien à calculer
 * ici, et rien à recalculer le jour où le back rééquilibre.
 */
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
    padding: space.md,
    gap: space.sm,
  },
  locked: { opacity: opacity.inert },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  // `flexShrink` : un nom traduit peut être long — « Souverain des cendres » — et c'est le nom
  // qui cède, jamais la pastille de niveau, qui est le seul repère de progression de la carte.
  name: { ...type.body, fontFamily: typography.display.semibold, color: color.text, flexShrink: 1 },
  levelChip: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  levelLabel: { ...type.label, color: color.textMuted },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { gap: space.xs },
  statValue: { ...type.body, color: color.text },
  statLabel: { ...type.label, color: color.textMuted },
});
