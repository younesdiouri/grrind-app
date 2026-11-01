import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { PlayerIdentity, type IdentityPlayer } from '@/components/PlayerIdentity';
import { SystemFrame } from '@/components/SystemFrame';
import { appearanceArt } from '@/design/tokens';
import { AvatarEntry } from '@/features/avatar/AvatarEntry';
import type { AvatarEquipment } from '@/features/combat/serverAvatar';

/** Public identity and equipped character, without the private inventory controls. */
export function PlayerProfile({ player, equipment, action, onLeaguePress, motion }: {
  player: IdentityPlayer; equipment: AvatarEquipment; action?: ReactNode; onLeaguePress?(): void; motion?: ReactNode;
}) {
  return <>
    <PlayerIdentity player={player} equipment={equipment} onLeaguePress={onLeaguePress} motion={motion} />
    {action}
    <SystemFrame tier="hero" style={styles.avatar} contentStyle={styles.content}>
      <AvatarEntry avatar={player.avatar} equipment={equipment} />
    </SystemFrame>
  </>;
}

const styles = StyleSheet.create({
  avatar: { height: appearanceArt.overviewHeight },
  content: { flex: 1 },
});
