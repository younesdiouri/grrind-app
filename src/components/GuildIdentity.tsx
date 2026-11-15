import { StyleSheet, Text, View } from 'react-native';
import { GuildEmblem } from '@/components/GuildEmblem';
import { color, guildUi, space, type, typography } from '@/design/tokens';
import type { Emblem } from '@/features/community/guildEmblem';

export function GuildIdentity({ name, memberCount, emblem }: { name: string; memberCount: number; emblem?: Emblem | null }) {
  return <View style={styles.identity}>
    <GuildEmblem emblem={emblem} />
    <View style={styles.text}>
      <Text style={styles.name} accessibilityRole="header">{name}</Text>
      <Text style={styles.members}>{memberCount} membre{memberCount === 1 ? '' : 's'}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  text: { flex: 1, minWidth: 0, gap: space.xs },
  name: { fontFamily: typography.display.bold, fontSize: guildUi.titleSize, color: color.text },
  members: { ...type.body, color: color.textMuted },
});
