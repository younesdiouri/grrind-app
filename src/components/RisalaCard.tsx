import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '@/design/tokens';
import { risalaDisciplineLabel } from '@/features/community/risalaDiscipline';

type RisalaCardProps = {
  /**
   * Brute, comme le contrat la type aujourd'hui (younesdiouri/grrind-back#201) : la résolution
   * en libellé se fait à l'intérieur, via `risalaDisciplineLabel` — le seul repli, jamais
   * dispersé d'un composant à l'autre.
   */
  discipline: string;
  /** `null` si l'expéditeur a quitté la guilde depuis la révélation : son défi reste, son nom
   *  n'est plus celui d'un co-équipier. */
  senderDisplayName: string | null;
  /**
   * Résolu par le serveur pour l'appelant — 150 s'il reçoit, 50 s'il a envoyé. Jamais dérivé
   * ici d'un `senderId === moi` : c'est une règle de jeu, le serveur seul l'arbitre.
   */
  bonusPercent: number;
  /** Déjà en phrase — `risalaTimeLeft`, la carte n'a pas d'horloge, comme `SessionCard`. */
  timeLeft: string;
};

/**
 * Une Risāla : le défi sportif qu'un membre envoie à toute sa guilde, pour la quinzaine.
 *
 * Purement présentative — aucune date brute, aucune clé de discipline non résolue n'y entre :
 * l'appelant a déjà tout mis en phrase, exactement comme `SessionCard` le fait pour une
 * séance. Le tap qui mène au profil de l'expéditeur (#119) n'est pas ici non plus : c'est un
 * geste de navigation, il vit à l'endroit qui compose la carte dans un `Link`, comme
 * `GuildMemberRow` dans `Roster`.
 */
export function RisalaCard({ discipline, senderDisplayName, bonusPercent, timeLeft }: RisalaCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.disciplineChip}>
          <Text style={styles.disciplineLabel}>{risalaDisciplineLabel(discipline).toUpperCase()}</Text>
        </View>
        <Text style={styles.bonus}>+{bonusPercent} %</Text>
      </View>

      <Text style={styles.sender}>
        Envoyée par {senderDisplayName ?? 'un membre qui a quitté la guilde'}
      </Text>

      <Text style={styles.timeLeft}>{timeLeft}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  disciplineChip: {
    alignSelf: 'flex-start',
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  disciplineLabel: { ...type.label, color: color.text },
  bonus: { ...type.body, color: color.accent },
  sender: { ...type.body, color: color.text },
  timeLeft: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
