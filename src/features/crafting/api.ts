import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { queryForOwner } from '@/api/privateQueries';
import { useAuth } from '@/features/auth/useAuth';
import { captureSessionGuard } from '@/features/auth/session';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { shopActionKeys } from '@/features/shop/actionKeyStore';
import { createConfirmedAction } from '@/features/alam/confirmedAction';
import { craftingWasRefused } from './refusal.ts';

export const craftingQueryKey = (userId: string | null) => ['crafting', userId] as const;
export function craftingOptions(userId: string | null) {
  return queryOptions<components['schemas']['CraftingRecipes'], Failure>({
    queryKey: craftingQueryKey(userId), enabled: userId !== null,
    queryFn: ({ signal }) => queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/crafting/recipes', { signal }))),
  });
}
export function useCraftingRecipes() {
  const auth = useAuth();
  return useQuery(craftingOptions(auth.status === 'signedIn' ? auth.user.id : null));
}
const craft = createConfirmedAction(shopActionKeys, (intention, key) => api.POST('/api/crafting', {
  body: { recipeKey: intention.split(':').slice(2).join(':') },
  params: { header: { 'Idempotency-Key': key } },
}), craftingWasRefused, String, captureSessionGuard);
export function craftEquipment(playerId: string, recipeKey: string) { return craft(`craft:${playerId}:${recipeKey}`); }
