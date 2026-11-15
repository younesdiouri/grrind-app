import type { QueryClient } from '@tanstack/react-query';
import { isCurrentOwner, type SessionOwner } from '@/features/auth/session';
import type { Failure } from '@/features/auth/problems';
import { refreshGuild, updateGuild, type GuildChanges, type GuildActionOutcome } from './guildActions.ts';
import { isGuildGone } from './guildRefresh.ts';
import { myGuildQueryKey, type GuildDetail } from './useMyGuild.ts';

/** La réponse PATCH ne porte pas les membres ; une autre guilde ou connexion ne doit jamais la recevoir. */
export async function saveGuild(guildId: string, changes: GuildChanges, client: QueryClient,
  owner: SessionOwner | null, onGone: () => void): Promise<GuildActionOutcome | null> {
  if (!isCurrentOwner(owner)) return null;
  const outcome = await updateGuild(guildId, changes);
  if (!isCurrentOwner(owner)) return null;
  if (outcome.ok) {
    client.setQueryData<GuildDetail | null>(myGuildQueryKey(owner.id), previous =>
      previous?.id === guildId ? { ...previous, ...outcome.guild } : previous);
  } else if (isGuildGone(outcome.failure)) {
    onGone();
    return null;
  } else if (outcome.failure.kind === 'problem' && outcome.failure.problem.type === 'https://grrind.app/problems/forbidden') {
    void client.invalidateQueries({ queryKey: myGuildQueryKey(owner.id) });
  }
  return outcome;
}

/** Le détail et sa disparition appartiennent à la connexion qui a lancé la lecture. */
export async function syncGuild(guildId: string, client: QueryClient,
  owner: SessionOwner | null, onGone: () => void): Promise<Failure | null> {
  if (!isCurrentOwner(owner)) return null;
  const outcome = await refreshGuild(guildId);
  if (!isCurrentOwner(owner)) return null;
  if (outcome.ok) {
    client.setQueryData(myGuildQueryKey(owner.id), outcome.guild);
    return null;
  }
  if (isGuildGone(outcome.failure)) { onGone(); return null; }
  return outcome.failure;
}
