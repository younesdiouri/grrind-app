import { StyleSheet } from 'react-native';
import { color, radius, space, type } from '@/design/tokens';

export const alamStyles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  title: { ...type.title, color: color.text },
  label: { ...type.label, color: color.accent },
  body: { ...type.body, color: color.text },
  muted: { ...type.body, color: color.textMuted },
  error: { ...type.body, color: color.danger },
  card: { padding: space.md, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  group: { gap: space.sm },
  track: { height: space.xs, borderRadius: radius.pill, backgroundColor: color.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.accent },
  member: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  copy: { flex: 1, gap: space.xs },
});
