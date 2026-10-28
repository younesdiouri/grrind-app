import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { GuildIcon } from '@/components/GuildMenu';
import { initialsOf } from '@/components/initials';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { SystemFrame } from '@/components/SystemFrame';
import { color, control, frame, guildUi, opacity, radius, space, type, typography } from '@/design/tokens';

type Entry = components['schemas']['GuildWeeklyLeaderboardEntry'];
type Board = components['schemas']['GuildWeeklyLeaderboard'];

function sessions(count: number) { return `${count} séance${count > 1 ? 's' : ''}`; }
function rankLabel(entry: Entry, entries: Entry[]) {
  if (entry.rank === null) return 'pas encore classé';
  const tied = entries.filter(other => other.rank === entry.rank).length > 1;
  return `${entry.rank}${entry.rank === 1 ? 'er' : 'e'}${tied ? ' ex æquo' : ''}`;
}

export function GuildWeeklyBoard({ board, playerId, onProfile, summary }: {
  board: Board; playerId: string; onProfile(id: string): void; summary?: ReactNode;
}) {
  const podium = board.entries.filter(entry => entry.rank !== null && entry.rank <= 3).slice(0, 3);
  const orderedPodium = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  const remaining = board.entries.filter(entry => !podium.includes(entry));
  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: board.timezone };
  const start = new Date(board.weekStartsAt).toLocaleDateString('fr-FR', dateOptions);
  const end = new Date(new Date(board.weekEndsAt).getTime() - 1).toLocaleDateString('fr-FR', dateOptions);
  const label = (entry: Entry) => `${entry.member.displayName}${entry.member.id === playerId ? ', vous' : ''}, ${rankLabel(entry, board.entries)}, ${sessions(entry.workoutCount)}`;

  return <View style={styles.board} testID="guild-weekly-board">
    <View style={styles.heading}>
      <Text style={styles.overline}>CETTE SEMAINE</Text>
      <Text style={styles.dates}>{start} — {end}</Text>
      <Text style={styles.total}>{sessions(board.totalWorkouts)} ensemble</Text>
    </View>
    {podium.length > 0 ? <View style={styles.podium}>
      {orderedPodium.map(entry => {
        const first = entry.rank === 1;
        const tint = first ? color.accent : entry.rank === 2 ? guildUi.silver : guildUi.bronze;
        return <Pressable key={entry.member.id} testID={`guild-podium-${entry.member.id}`}
          accessibilityRole="button" accessibilityLabel={label(entry)} onPress={() => onProfile(entry.member.id)}
          style={({ pressed }) => [styles.podiumColumn, pressed && styles.pressed]}>
          <View style={styles.podiumPerson}>
            <View style={[styles.portrait, { borderColor: tint }, first && styles.firstPortrait]}>
              <Text style={[styles.initials, { color: tint }]}>{initialsOf(entry.member.displayName)}</Text>
              {first && <View style={styles.trophy}><GuildIcon name="week" tint={color.accent} /></View>}
            </View>
            <Text numberOfLines={1} style={styles.name}>{entry.member.displayName}</Text>
            {entry.member.id === playerId && <Text style={styles.you}>VOUS</Text>}
            <Text style={[styles.score, { color: tint }]}>{entry.workoutCount}</Text>
            <Text style={styles.note}>séance{entry.workoutCount > 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.pedestal, { borderTopColor: tint,
            minHeight: guildUi.podiumBase + (entry.rank === 1 ? 2 : entry.rank === 2 ? 1 : 0) * guildUi.podiumRise }, first && styles.firstPedestal]}>
            <Text style={[styles.rank, { color: tint }]}>{entry.rank}</Text>
            {board.entries.filter(other => other.rank === entry.rank).length > 1 && <Text style={styles.tied}>ex æquo</Text>}
          </View>
        </Pressable>;
      })}
    </View> : <SystemFrame contentStyle={styles.empty}>
      <GuildIcon name="week" size={guildUi.crestSize} />
      <Text style={styles.emptyTitle}>La semaine commence ici</Text>
      <Text style={styles.emptyNote}>La première séance ouvrira le classement.</Text>
    </SystemFrame>}
    {summary}
    {remaining.length > 0 && <View style={styles.ranking}>
      <Text style={styles.listTitle} accessibilityRole="header">L’équipe</Text>
      {remaining.map(entry => <Pressable key={entry.member.id} testID={`guild-ranking-${entry.member.id}`}
        accessibilityRole="button" accessibilityLabel={label(entry)} onPress={() => onProfile(entry.member.id)}
        style={({ pressed }) => [styles.row, entry.member.id === playerId && styles.ownRow, pressed && styles.pressed]}>
        <Text style={styles.rowRank}>{entry.rank ?? '—'}</Text>
        <PlayerAvatar name={entry.member.displayName} />
        <View style={styles.rowPerson}>
          <Text style={styles.name} numberOfLines={1}>{entry.member.displayName}</Text>
          {entry.member.id === playerId ? <Text style={styles.you}>VOUS</Text>
            : entry.rank !== null && board.entries.filter(other => other.rank === entry.rank).length > 1
              ? <Text style={styles.note}>ex æquo</Text> : null}
        </View>
        <View style={styles.rowScore}><Text style={styles.count}>{entry.workoutCount}</Text><Text style={styles.note}>séance{entry.workoutCount > 1 ? 's' : ''}</Text></View>
      </Pressable>)}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  board: { gap: space.lg },
  heading: { alignItems: 'center', gap: space.xs },
  overline: { ...type.label, color: color.accent, fontFamily: typography.display.semibold },
  dates: { fontSize: guildUi.titleSize, fontFamily: typography.display.bold, color: color.text },
  total: { ...type.body, color: color.textMuted },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingTop: space.md },
  podiumColumn: { flex: 1, minWidth: 0 },
  podiumPerson: { alignItems: 'center', gap: space.xs, paddingBottom: space.md },
  portrait: { width: guildUi.avatarSize, height: guildUi.avatarSize, borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised, borderWidth: frame.segmentThickness, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  firstPortrait: { width: guildUi.leaderAvatarSize, height: guildUi.leaderAvatarSize, boxShadow: guildUi.leaderShadow },
  initials: { fontSize: guildUi.titleSize, fontFamily: typography.display.bold },
  trophy: { position: 'absolute', top: -space.md, backgroundColor: color.background, paddingHorizontal: space.xs },
  name: { ...type.body, color: color.text, fontFamily: typography.display.semibold, maxWidth: '100%' },
  you: { ...type.label, color: color.accent, letterSpacing: 0 },
  score: { fontSize: guildUi.scoreSize, fontFamily: typography.display.bold, fontVariant: ['tabular-nums'] },
  note: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  pedestal: { alignItems: 'center', justifyContent: 'center', gap: space.xs, borderTopWidth: frame.segmentThickness,
    backgroundColor: color.surface, borderTopLeftRadius: frame.standard.radius, borderTopRightRadius: frame.standard.radius },
  firstPedestal: { backgroundColor: guildUi.heroSurface },
  rank: { fontSize: guildUi.rankSize, fontFamily: typography.display.bold },
  tied: { ...type.label, letterSpacing: 0, color: color.textMuted },
  empty: { padding: space.lg, gap: space.md, alignItems: 'center' },
  emptyTitle: { ...type.body, color: color.text, fontFamily: typography.display.semibold },
  emptyNote: { ...type.body, color: color.textMuted, textAlign: 'center' },
  ranking: { gap: space.xs },
  listTitle: { ...type.label, color: color.textMuted, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: control.minHeight,
    paddingVertical: space.sm, paddingHorizontal: space.sm, borderBottomWidth: control.borderWidth, borderBottomColor: color.border },
  ownRow: { backgroundColor: guildUi.heroLight, borderRadius: frame.standard.radius },
  rowRank: { ...type.body, color: color.textMuted, minWidth: space.lg, textAlign: 'center' },
  rowPerson: { flex: 1, gap: space.xs, minWidth: 0 },
  rowScore: { alignItems: 'flex-end', gap: space.xs },
  count: { ...type.body, color: color.accent, fontFamily: typography.display.bold, fontVariant: ['tabular-nums'] },
  pressed: { opacity: opacity.pressed },
});
