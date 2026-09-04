import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { DisciplineChip } from '@/components/DisciplineChip';
import { SystemFrame } from '@/components/SystemFrame';
import { color, space, type, typography } from '@/design/tokens';

type SessionCardProps = {
  discipline: components['schemas']['Discipline'];
  /**
   * La durée, **déjà mise en phrase**.
   *
   * La carte prend la discipline brute et la durée formatée, et ce n'est pas une
   * incohérence : la discipline est un vocabulaire fermé du contrat, dont le design system
   * porte la traduction ; « 1 h 05 » est une règle de langue qui vit dans `format.ts` avec
   * les autres. Un composant n'a pas à connaître les deux.
   */
  duration: string;
  /** Quand — déjà en phrase, elle aussi. La carte n'a pas d'horloge. */
  when?: string;
  /**
   * Les mesures, déjà formatées **et déjà filtrées**.
   *
   * Aucun appareil ne fournit tout : une mesure absente disparaît de la ligne au lieu de
   * s'afficher à zéro, parce qu'un `0 bpm` est une donnée fausse là où il n'y a pas de
   * donnée. Le tri se fait chez l'appelant, qui seul sait ce qui est absent.
   */
  measures?: string[];
};

/**
 * Une séance : ce qui a été fait, et ce qui a été mesuré.
 *
 * La même carte sert l'historique et le séquenceur. Elle n'a donc **rien** de la récompense :
 * pas d'XP, pas de niveau. Ce que la séance a rapporté se joue à côté d'elle, jamais dedans —
 * sinon la carte de l'historique porterait un chiffre qui a déjà été crédité, et le joueur
 * le compterait deux fois.
 */
export function SessionCard({ discipline, duration, when, measures }: SessionCardProps) {
  return (
    <SystemFrame contentStyle={styles.card}>
      <View style={styles.head}>
        <DisciplineChip discipline={discipline} />
        <Text style={styles.duration}>{duration}</Text>
      </View>

      {when === undefined ? null : <Text style={styles.meta}>{when}</Text>}

      {measures === undefined || measures.length === 0 ? null : (
        <Text style={styles.meta}>{measures.join(' · ')}</Text>
      )}
    </SystemFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    gap: space.xs,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  duration: { ...type.body, fontFamily: typography.display.semibold, color: color.text },
  meta: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
