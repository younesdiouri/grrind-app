import type { QueryClient } from '@tanstack/react-query';
import { isCurrentOwner, type SessionOwner } from '@/features/auth/session';
import type { Failure } from '@/features/auth/problems';
import { refreshGuild } from './guildActions.ts';
import { isGuildGone } from './guildRefresh.ts';
import { myGuildQueryKey } from './useMyGuild.ts';

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
