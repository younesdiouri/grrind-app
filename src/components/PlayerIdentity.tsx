import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { components } from '@/api/schema';
import { LeagueBackdrop } from '@/components/LeagueBackdrop';
import { SystemFrame } from '@/components/SystemFrame';
import { TitleBadge } from '@/components/TitleBadge';
import { color, control, leagueArt, opacity, radius, space, type, typography } from '@/design/tokens';
import { AvatarPreview } from '@/features/avatar/AvatarPreview';
import { serverAvatar, type AvatarEquipment } from '@/features/combat/serverAvatar';
import { AVATAR_FIELDS, AVATAR_LABELS } from '@/features/avatar/avatar';
import { leagueLabel } from '@/features/league/league';

export type IdentityPlayer = Pick<components['schemas']['PlayerDetail'], 'displayName' | 'title' | 'level' | 'avatar' | 'league'>;

export function PlayerIdentity({ player, equipment = {}, onLeaguePress, motion }: {
  player: IdentityPlayer; equipment?: AvatarEquipment; onLeaguePress?(): void; motion?: ReactNode;
}) {
  const avatar = serverAvatar(player.avatar, equipment);
  const label = `Portrait de ${player.displayName} · ${AVATAR_FIELDS.map(field =>
    (AVATAR_LABELS[field] as Record<string, string>)[player.avatar[field]]).join(' · ')}${avatar.headband ? ' · Bandeau éclair' : ''}`;
  const league = `Ligue ${leagueLabel[player.league.tier]}`;
  const tint = leagueArt.presets[player.league.tier].metal;
  return <SystemFrame contentStyle={styles.identity}>
    <View style={styles.stage}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LeagueBackdrop tier={player.league.tier} />{motion}
      </View>
      <View style={styles.portrait}>
        <AvatarPreview avatar={avatar} framing="portrait" fallbackName={player.displayName} label={label} />
      </View>
    </View>
    <Text style={styles.name} accessibilityRole="header">{player.displayName}</Text>
    {player.title !== null && <View style={styles.title}><TitleBadge name={player.title.name} /></View>}
    <View style={styles.status}>
      {onLeaguePress ? <Pressable onPress={onLeaguePress} accessibilityRole="button" accessibilityLabel={`${league} · Ma semaine`}
        style={({ pressed }) => [styles.leagueButton, pressed && styles.pressed]}>
        <Text style={[styles.league, { color: tint }]}>{league} <Text style={styles.link}>· Ma semaine ›</Text></Text>
      </Pressable> : <Text style={[styles.league, { color: tint }]}>{league}</Text>}
      <Text style={styles.level}>Niveau {player.level}</Text>
    </View>
  </SystemFrame>;
}

const styles = StyleSheet.create({
  identity: { minHeight: leagueArt.cardMinHeight, alignItems: 'center', paddingHorizontal: space.sm, paddingBottom: space.md, gap: space.xs },
  stage: { width: '100%', maxWidth: leagueArt.stageWidth, aspectRatio: leagueArt.stageWidth / leagueArt.stageHeight },
  portrait: { position: 'absolute', top: leagueArt.portraitTop, left: leagueArt.portraitLeft,
    width: leagueArt.portraitWidth, aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: color.background },
  name: { fontSize: leagueArt.nameSize, fontFamily: typography.display.bold, color: color.text, textAlign: 'center' },
  title: { maxWidth: '100%', alignItems: 'center' },
  status: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: space.sm },
  league: { ...type.label, letterSpacing: 0, textAlign: 'center' },
  leagueButton: { minHeight: control.minHeight, justifyContent: 'center', paddingHorizontal: space.sm },
  link: { color: color.textMuted },
  level: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  pressed: { opacity: opacity.pressed },
});
