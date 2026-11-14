import type { components } from '@/api/schema';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SystemFrame } from '@/components/SystemFrame';
import { attributeColor, attributeLabel, color, disciplineLabel, space, type, typography } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { compactDuration } from '@/features/progression/workoutStats';
import { WEEK_ATTRIBUTES, type WeekProgress } from '@/features/progression/week';

type TrainingPlan = components['schemas']['WeekTrainingPlan'];

export function WeekTrainingAdvice({ onOpen }: { onOpen: () => void }) {
  return <View style={styles.stack}>
    <Text style={styles.note}>Des sports pour compléter tes jauges.</Text>
    <Button label="Voir les sports" variant="quiet" onPress={onOpen} />
  </View>;
}

export function WeekTrainingPlansView({ week, now, loading, failure, refreshing = false, onRetry, onGuide, onBack }: {
  week?: WeekProgress;
  now: Date;
  loading: boolean;
  failure?: Failure | null;
  refreshing?: boolean;
  onRetry: () => void;
  onGuide: () => void;
  onBack: () => void;
}) {
  // Les trois choix partagent la même expiration serveur. Aucun gain périmé ne reste visible.
  const expired = week?.trainingPlans.some(plan => Date.parse(plan.expiresAt) <= now.getTime()) ?? false;
  const plans = failure || expired ? [] : week?.trainingPlans ?? [];
  const previous = week?.previous;
  const full = week && previous && WEEK_ATTRIBUTES.every(attribute => week.current.attributes[attribute] >= previous.attributes[attribute]);
  const emptyMessage = !week?.previous ? 'Ta semaine de référence se construit.'
    : full ? 'Tes quatre jauges sont déjà remplies.'
      : week.current.sessions === 0 ? 'Synchronise une première séance pour recevoir des suggestions.'
        : 'Aucune suggestion disponible pour aujourd’hui.';
  return <View style={styles.stack}>
    <Text style={styles.heading} accessibilityRole="header">Tes sports du jour</Text>
    {loading ? <View style={styles.panel} accessibilityLiveRegion="polite"><ActivityIndicator color={color.accent} /><Text style={styles.note}>Chargement des suggestions…</Text></View> : null}
    {failure ? <View style={styles.stack} accessibilityLiveRegion="polite">
      <Text style={styles.note}>{messageFor(failure)}</Text>
      <Button label="Réessayer" variant="quiet" busy={refreshing} onPress={onRetry} />
    </View> : expired ? <View style={styles.stack} accessibilityLiveRegion="polite">
      <Text style={styles.note}>Ces estimations ont expiré. Actualise-les avant de choisir.</Text>
      <Button label="Actualiser" variant="quiet" busy={refreshing} onPress={onRetry} />
    </View> : week ? <>
      {refreshing ? <Text style={styles.caption} accessibilityLiveRegion="polite">Actualisation…</Text> : null}
      {plans.length === 0 ? <Text style={styles.note}>{emptyMessage}</Text> : <>
        <Text style={styles.note}>Choisis une option : ces alternatives ne se cumulent pas.</Text>
        <Text style={styles.caption}>Il te manque : {amounts(plans[0].remaining)}</Text>
        {plans.map((plan, index) => <WeekTrainingPlanView key={index} plan={plan} option={index + 1} />)}
        <Text style={styles.caption}>Estimations en solo, avec tes bonus actuels et les plafonds du jour. Sans bonus ensemble ni hypothèse de distance, dénivelé ou fréquence cardiaque. Seules les séances réellement importées comptent.</Text>
      </>}
    </> : null}
    <Button label="Guide des sports" variant="quiet" onPress={onGuide} />
    <Button label="Retour" variant="quiet" onPress={onBack} />
  </View>;
}

function amounts(values: TrainingPlan['remaining']) {
  return WEEK_ATTRIBUTES.filter(attribute => values[attribute] > 0)
    .map(attribute => `${values[attribute]} pts ${attributeLabel[attribute].toLowerCase()}`).join(' · ');
}

/** Uniquement des valeurs serveur ; aucun barème ni estimateur de gains côté client. */
function WeekTrainingPlanView({ plan, option }: { plan: TrainingPlan; option: number }) {
  return <SystemFrame accent="gain" contentStyle={styles.panel}>
    <Text style={styles.title} accessibilityRole="header">Option {option}</Text>
    {plan.sessions.map((session, index) => <View key={`${session.discipline}-${index}`} style={styles.session}>
      <View style={styles.head}><Text style={styles.sport}>{disciplineLabel[session.discipline]}</Text><Text style={styles.duration}>{compactDuration(session.durationSeconds)}</Text></View>
      <Text style={styles.duration}>{session.estimatedXp} XP estimés</Text>
      <View style={styles.missing}>
        {WEEK_ATTRIBUTES.filter(attribute => session.estimatedGains[attribute] > 0).map(attribute => <Text key={attribute} style={[styles.caption, { color: attributeColor[attribute] }]}>
          {attributeLabel[attribute]} +{session.estimatedGains[attribute]}
        </Text>)}
      </View>
    </View>)}
    <Text style={styles.note}>{plan.completesWeek ? 'Ce plan devrait remplir tes quatre jauges.' : `Après ce plan : ${amounts(plan.remainingAfter)} à compléter.`}</Text>
  </SystemFrame>;
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  heading: { ...type.title, color: color.text },
  panel: { padding: space.md, gap: space.sm },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.label, color: color.gain, fontFamily: typography.display.semibold },
  caption: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  note: { ...type.body, color: color.textMuted },
  missing: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  session: { gap: space.sm, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  sport: { ...type.body, color: color.text, flexShrink: 1, fontFamily: typography.display.semibold },
  duration: { ...type.body, color: color.accent, fontFamily: typography.display.semibold },
});
