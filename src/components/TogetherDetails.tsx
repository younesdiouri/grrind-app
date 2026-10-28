import { StyleSheet, Text } from 'react-native';
import { color, type } from '@/design/tokens';
import { togetherLabel, type TogetherStatus } from '@/features/health/together';

export function TogetherDetails({ together }: { together: TogetherStatus | undefined }) {
  if (!together) return null;
  return <Text style={styles.detail}>{togetherLabel(together)}{together.status === 'VERIFIED'
    ? `\n${together.soloXp} XP avant groupe → ${together.totalXp} XP au total` : ''}</Text>;
}
const styles = StyleSheet.create({ detail: { ...type.label, color: color.textMuted } });
