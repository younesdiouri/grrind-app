import { StyleSheet, View } from 'react-native';
import type { components } from '@/api/schema';
import { LeagueBackdrop } from '@/components/LeagueBackdrop';
import { color, leagueArt, radius } from '@/design/tokens';
import { AvatarPreview } from '@/features/avatar/AvatarPreview';
import { usePortraitVisibility } from '@/features/avatar/PortraitScrollView';
import { serverAvatar } from '@/features/combat/serverAvatar';
import { leagueLabel } from '@/features/league/league';

export function GuildPortrait({ member, size = leagueArt.thumbnailSize }: {
  member: components['schemas']['GuildMember']; size?: number;
}) {
  const { ref, onLayout, visible } = usePortraitVisibility();
  const avatar = serverAvatar(member.avatar, member.headEquipment ? { HEAD: member.headEquipment } : {});
  const label = `Portrait de ${member.displayName} · Ligue ${leagueLabel[member.league.tier]}${avatar.headband ? ' · Bandeau éclair' : ''}`;
  return <View ref={ref} collapsable={false} onLayout={onLayout} style={{ width: size, height: size }}
    accessible accessibilityRole="image" accessibilityLabel={label}>
    <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LeagueBackdrop tier={member.league.tier} compact />
      <View style={styles.portrait}>
        <AvatarPreview avatar={avatar} label={label} framing="portrait" fallbackName={member.displayName} enabled={visible} />
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  portrait: { position: 'absolute', top: leagueArt.thumbnailPortraitTop, left: leagueArt.thumbnailPortraitLeft,
    width: leagueArt.thumbnailPortraitWidth, aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: color.background },
});
