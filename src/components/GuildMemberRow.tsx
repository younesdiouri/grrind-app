import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { RoleBadge } from '@/components/RoleBadge';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar } from '@/components/XpBar';
import { progressFill } from '@/components/guildProgress';
import { color, space, type } from '@/design/tokens';

type GuildMemberRowProps = {
  /** La forme exacte de `GET /api/guilds/{id}` : rien à recomposer, rien à recopier. */
  member: components['schemas']['GuildMember'];
};

/**
 * La brique centrale de la guilde : un membre, sa progression, ce qu'il porte.
 *
 * `XpBar` et `TitleBadge` sont réutilisés **tels quels** — leur API ne bouge pas pour ce
 * ticket. Deux cas ne doivent rien déformer :
 *
 * - `title === null` : la ligne du titre disparaît, elle ne se vide pas.
 * - `xpToNextLevel === null` (niveau maximum) : il n'y a plus de palier à viser, et un
 *   remplissage à zéro dirait « rien acquis » là où c'est l'inverse. La barre reste pleine,
 *   par le même calcul que `timeline.ts` applique déjà au séquenceur de récompense.
 */
export function GuildMemberRow({ member }: GuildMemberRowProps) {
  return (
    <View style={styles.row}>
      <PlayerAvatar name={member.displayName} />

      <View style={styles.info}>
        <View style={styles.headLine}>
          <Text style={styles.name} numberOfLines={1}>
            {member.displayName}
          </Text>
          <RoleBadge role={member.role} />
        </View>

        <View style={styles.progressLine}>
          <Text style={styles.level}>Niv. {member.level}</Text>
          <View style={styles.barWrap}>
            <XpBar fill={progressFill(member)} />
          </View>
        </View>

        {member.title === null ? null : <TitleBadge name={member.title.name} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  info: { flex: 1, gap: space.xs },
  headLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.body, color: color.text, flexShrink: 1 },
  progressLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  level: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  barWrap: { flex: 1 },
});
