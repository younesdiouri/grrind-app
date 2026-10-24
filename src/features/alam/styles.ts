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
  raidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md },
  raidTitle: { ...type.title, color: color.text, textShadowColor: color.background, textShadowRadius: space.sm },
  raidHeading: { padding: space.sm, gap: space.xs, borderRadius: radius.md, backgroundColor: color.surface },
  raidPanel: { padding: space.sm, gap: space.sm, borderRadius: radius.md, backgroundColor: color.surface },
  raidActions: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  raidNarration: { ...type.body, color: color.text, flex: 1 },
  raidRoster: { ...type.label, color: color.text, backgroundColor: color.surface, padding: space.xs, borderRadius: radius.sm },
  raidSummary: { position: 'absolute', top: space.md, bottom: space.md, right: space.md, width: '48%',
    backgroundColor: color.background, borderRadius: radius.md },
});
