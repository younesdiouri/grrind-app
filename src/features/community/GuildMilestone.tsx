import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '@/design/tokens';
import type { Guild } from '@/features/community/guildActions';

/**
 * Le jalon minimal une fois qu'on a une guilde — **l'aiguillage du ticket #42, pas l'écran des
 * membres**. Celui-ci (#43) affichera la liste ordonnée fondateur d'abord, les six briques de
 * #40 (`GuildMemberRow`, `CapacityGauge`…) : rien de tout ça n'est ici.
 *
 * Le typage accepte un `Guild` et pas un `GuildDetail` **exprès** : la réponse d'une fondation
 * ou d'un ralliement est une `Guild` sans `members`, et ce jalon doit s'afficher avec **elle**,
 * sans second appel. `GuildDetail` reste structurellement assignable (elle ne fait qu'ajouter
 * `members`), donc la même vue sert aussi la réponse de `GET /api/guilds/mine`.
 */
export function GuildMilestone({ guild }: { guild: Guild }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{guild.name}</Text>
      <Text style={styles.detail}>
        {guild.memberCount} / {guild.capacity} membres
      </Text>
      <Text style={styles.role}>
        {guild.role === 'FOUNDER' ? 'Tu es fondateur de cette guilde.' : 'Tu es membre de cette guilde.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  name: { ...type.title, color: color.text },
  detail: { ...type.body, color: color.textMuted },
  role: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
