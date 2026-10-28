import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { GuildIcon } from '@/components/GuildMenu';
import { SystemFrame } from '@/components/SystemFrame';
import { color, control, disciplineLabel, opacity, space, type } from '@/design/tokens';
import { formatTurnDeadline, risalaTimeLeft } from '@/features/community/format';

export function GuildRisalatSummary({ risalat, now, onOpen }: {
  risalat: components['schemas']['Risalat']; now: Date; onOpen(): void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Voir les Risālāt de la guilde"
    onPress={onOpen} style={({ pressed }) => pressed && styles.pressed}>
    <SystemFrame contentStyle={styles.summary}>
      <GuildIcon name="risalat" tint={color.gain} />
      <View style={styles.content}>
        {risalat.risalat.length === 0 ? <>
          <Text style={styles.title}>Prochaine Risāla</Text>
          <Text style={styles.note}>{formatTurnDeadline(risalat.nextRevealAt)}</Text>
        </> : risalat.risalat.map(risala => <View key={risala.id} style={styles.bonus}>
          <Text style={styles.title}>{disciplineLabel[risala.discipline]} <Text style={styles.gain}>+{risala.bonusPercent} % XP</Text></Text>
          <Text style={styles.note}>{risala.senderDisplayName ?? 'Risāla de la guilde'} · {risalaTimeLeft(risala.expiresAt, now)}</Text>
        </View>)}
        {risalat.turn?.mine && <Text style={styles.turn}>{risalat.turn.discipline === null ? 'C’est ton tour' : 'Ta prochaine Risāla est prête'}</Text>}
      </View>
      <Text style={styles.chevron} accessibilityElementsHidden>›</Text>
    </SystemFrame>
  </Pressable>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: control.minHeight },
  content: { flex: 1, gap: space.xs },
  bonus: { gap: space.xs },
  title: { ...type.body, color: color.text },
  note: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  gain: { color: color.gain },
  turn: { ...type.label, color: color.accent, letterSpacing: 0 },
  chevron: { ...type.title, color: color.textMuted },
  pressed: { opacity: opacity.pressed },
});
