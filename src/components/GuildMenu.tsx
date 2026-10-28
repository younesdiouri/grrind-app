import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { components } from '@/api/schema';
import { GuildMemberRow } from '@/components/GuildMemberRow';
import { color, control, frame, guildUi, opacity, space, type, typography } from '@/design/tokens';

export const GUILD_TABS = { week: 'Semaine', chat: 'Chat', members: 'Membres', risalat: 'Risālāt', settings: 'Réglages' } as const;
export type GuildTab = keyof typeof GUILD_TABS;
type Member = components['schemas']['GuildMember'];

const ICONS: Record<GuildTab, string> = {
  week: 'M8 3h8v8a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 3v5m-4 0h8',
  chat: 'M4 4h16v12H9l-5 4Z M8 8h8M8 12h5',
  members: 'M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-6 17v-3a6 6 0 0 1 12 0v3Zm14-16a4 4 0 0 1 0 8m1 2a5 5 0 0 1 3 5v1',
  risalat: 'M3 5h18v14H3Zm0 0 9 8 9-8',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
};

export function GuildIcon({ name, tint = color.accent, size = guildUi.iconSize }: { name: GuildTab; tint?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <Path d={ICONS[name]} fill="none" stroke={tint} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

export function GuildTabs({ selected, onSelect, myTurn = false }: {
  selected: GuildTab; onSelect(tab: GuildTab): void; myTurn?: boolean;
}) {
  return <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Guilde">
    {(Object.keys(GUILD_TABS) as GuildTab[]).map(key => <Pressable key={key}
      testID={`guild-tab-${key}`} accessibilityRole="tab" aria-selected={selected === key}
      accessibilityLabel={`${GUILD_TABS[key]}${key === 'risalat' && myTurn ? ', c’est ton tour' : ''}`}
      onPress={() => onSelect(key)} style={({ pressed }) => [styles.tab, selected === key && styles.selected, pressed && styles.pressed]}>
      <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <GuildIcon name={key} tint={selected === key ? color.accent : color.textMuted} />
        {key === 'risalat' && myTurn && <View style={styles.dot} />}
      </View>
      <Text style={[styles.tabLabel, selected === key && styles.selectedLabel]}>{GUILD_TABS[key]}</Text>
    </Pressable>)}
  </View>;
}

export function GuildMembers({ members, canExclude, excludingId, onProfile, onExclude }: {
  members: Member[]; canExclude: boolean; excludingId: string | null;
  onProfile(id: string): void; onExclude(member: Member): void;
}) {
  return <View style={styles.members}>
    {[...members].sort((a, b) => b.level - a.level).map(member => <View key={member.id} style={styles.member}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${member.displayName}, niveau ${member.level}, voir le profil`}
        onPress={() => onProfile(member.id)} style={({ pressed }) => [styles.profile, pressed && styles.pressed]}>
        <GuildMemberRow member={member} />
      </Pressable>
      {canExclude && member.role !== 'FOUNDER' && <Pressable testID={`guild-exclude-${member.id}`}
        accessibilityRole="button" accessibilityLabel={`Exclure ${member.displayName}`}
        accessibilityHint="Ouvre une confirmation avant l’exclusion" disabled={excludingId !== null}
        onPress={() => onExclude(member)} style={({ pressed }) => [styles.exclude, pressed && styles.pressed]}>
        {excludingId === member.id ? <ActivityIndicator color={color.danger} /> : <Text style={styles.cross}>×</Text>}
      </Pressable>}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: space.sm, gap: space.xs, borderBottomWidth: control.borderWidth, borderBottomColor: color.border },
  tab: { flex: 1, minHeight: guildUi.tabHeight, alignItems: 'center', justifyContent: 'center', gap: space.xs,
    borderBottomWidth: frame.segmentThickness, borderBottomColor: 'transparent' },
  selected: { backgroundColor: guildUi.heroLight, borderBottomColor: color.accent },
  tabLabel: { fontSize: guildUi.tabLabelSize, fontFamily: typography.display.semibold, color: color.textMuted },
  selectedLabel: { color: color.accent },
  icon: { position: 'relative' },
  dot: { position: 'absolute', top: -space.xs, right: -space.xs, width: space.sm, height: space.sm, borderRadius: space.sm, backgroundColor: color.gain },
  members: { gap: space.sm },
  member: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: control.borderWidth, borderBottomColor: color.border, paddingVertical: space.md },
  profile: { flex: 1, minWidth: 0 },
  exclude: { width: control.backSize, height: control.backSize, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  cross: { ...type.title, color: color.textMuted },
  pressed: { opacity: opacity.pressed },
});
