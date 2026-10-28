import { StyleSheet, Text, View } from 'react-native';
import { attributeLabel, color, space, type } from '@/design/tokens';
import type { TogetherBonus } from '@/features/health/togetherInbox';

export function TogetherBonusReceipt({ bonus }: { bonus: TogetherBonus }) {
  return <View style={styles.content}>
    <Text style={styles.title}>Sport ensemble ×{bonus.multiplier}</Text>
    <Text style={styles.title}>+{bonus.bonusXp} XP</Text>
    <Text style={styles.body}>Complément de la séance du {new Date(bonus.occurredAt).toLocaleDateString('fr-FR')}</Text>
    <Text style={styles.body}>Multiplicateur ×{bonus.previousMultiplier} → ×{bonus.multiplier}</Text>
    <Text style={styles.body}>{bonus.totalBonusXp} XP de groupe cumulées · {bonus.workoutTotalXp} XP pour cette séance</Text>
    <Text style={styles.body}>Niveau {bonus.level.before} → {bonus.level.after} · {bonus.skillPointsGranted} point{bonus.skillPointsGranted === 1 ? '' : 's'} de compétence</Text>
    {(['strength', 'endurance', 'mobility', 'dexterity', 'vitality'] as const).map((attribute) =>
      <Text key={attribute} style={styles.body}>{attributeLabel[attribute]} : {bonus.attributes[attribute].before} → {bonus.attributes[attribute].after}</Text>)}
    {bonus.titlesUnlocked.map((title) => <Text key={title.id} style={styles.body}>Titre débloqué : {title.name}</Text>)}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: space.md, padding: space.md }, title: { ...type.title, color: color.accent }, body: { ...type.body, color: color.text } });
