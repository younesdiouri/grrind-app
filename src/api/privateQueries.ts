import type { QueryClient } from '@tanstack/react-query';
import { getSessionOwner, isCurrentOwner, subscribe } from '@/features/auth/session';
import { OFFLINE } from '@/features/auth/problems';

const PRIVATE_ROOTS = new Set([
  'inventory', 'guilds', 'shop', 'crafting', 'players', 'profile', 'alam',
  'league', 'workouts', 'workout-stats', 'week-training-plan',
]);

/** Synchrone avec la session : aucun effet React différé entre la sortie et le login suivant. */
export function watchSessionQueries(client: QueryClient): () => void {
  let owner = getSessionOwner();
  return subscribe(() => {
    const next = getSessionOwner();
    if (owner?.id === next?.id && owner?.generation === next?.generation) return;
    owner = next;
    // https://tanstack.com/query/v5/docs/reference/QueryClient#queryclientremovequeries
    // Annule les lectures en vol, jamais le refresh HTTP de la session.
    client.removeQueries({ predicate: query => PRIVATE_ROOTS.has(String(query.queryKey[0])) });
  });
}

/** Un ancien observer ne doit pas remplir la clé de A avec une requête authentifiée pour B. */
export async function queryForOwner<T>(userId: string | null, read: () => Promise<T>): Promise<T> {
  const owner = getSessionOwner();
  if (!isCurrentOwner(owner) || owner.id !== userId) throw OFFLINE;
  const result = await read();
  if (!isCurrentOwner(owner)) throw OFFLINE;
  return result;
}
