import type { components } from '@/api/schema';
import { StyleSheet, Text, View } from 'react-native';

import { SystemFrame } from '@/components/SystemFrame';
import { attributeColor, attributeLabel, color, disciplineLabel, space, type, typography } from '@/design/tokens';
import { compactDuration } from '@/features/progression/workoutStats';
import { WEEK_ATTRIBUTES } from '@/features/progression/week';

type TrainingPlan = components['schemas']['WeekTrainingPlan'];

/** Uniquement des valeurs serveur ; aucun barème ni estimateur de gains côté client. */
export function WeekTrainingPlanView({ plan }: { plan: TrainingPlan }) {
  return <SystemFrame accent="gain" contentStyle={styles.panel}>
    <View style={styles.head}><Text style={styles.title}>BOUCLE TA SEMAINE</Text><Text style={styles.caption}>AUJOURD’HUI</Text></View>
    <Text style={styles.note}>Il te manque</Text>
    <View style={styles.missing}>
      {WEEK_ATTRIBUTES.filter(attribute => plan.remaining[attribute] > 0).map(attribute => <Text key={attribute} style={[styles.amount, { color: attributeColor[attribute] }]}>
        {attributeLabel[attribute]} · {plan.remaining[attribute]} pts
      </Text>)}
    </View>
    {plan.sessions.map((session, index) => <View key={`${session.discipline}-${index}`} style={styles.session}>
      <View style={styles.head}><Text style={styles.sport}>{index + 1}. {disciplineLabel[session.discipline]}</Text><Text style={styles.duration}>{compactDuration(session.durationSeconds)}</Text></View>
      <View style={styles.missing}>
        {WEEK_ATTRIBUTES.filter(attribute => session.estimatedGains[attribute] > 0).map(attribute => <Text key={attribute} style={[styles.caption, { color: attributeColor[attribute] }]}>
          {attributeLabel[attribute]} +{session.estimatedGains[attribute]}
        </Text>)}
      </View>
    </View>)}
    <Text style={styles.note}>{plan.completesWeek ? 'Ce plan devrait remplir tes quatre jauges.' : `Après ce plan : ${WEEK_ATTRIBUTES.filter(attribute => plan.remainingAfter[attribute] > 0).map(attribute => `${plan.remainingAfter[attribute]} pts ${attributeLabel[attribute].toLowerCase()}`).join(' · ')} à compléter.`}</Text>
    <Text style={styles.caption}>Gains estimés en solo · bonus actuels et plafonds du jour</Text>
  </SystemFrame>;
}

const styles = StyleSheet.create({
  panel: { padding: space.md, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.label, color: color.gain, fontFamily: typography.display.semibold },
  caption: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  note: { ...type.body, color: color.textMuted },
  missing: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  amount: { ...type.label },
  session: { gap: space.sm, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  sport: { ...type.body, color: color.text, flexShrink: 1, fontFamily: typography.display.semibold },
  duration: { ...type.body, color: color.accent, fontFamily: typography.display.semibold },
});
