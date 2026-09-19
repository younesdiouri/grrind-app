import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { shopActionKeys } from '@/features/shop/actionKeyStore';
import { createConfirmedAction } from '@/features/alam/confirmedAction';
import { craftingWasRefused } from './refusal';

export const CRAFTING_KEY = ['crafting'] as const;
export function useCraftingRecipes() {
  return useQuery<components['schemas']['CraftingRecipes'], Failure>({
    queryKey: CRAFTING_KEY, queryFn: () => queryOrFailure(() => api.GET('/api/crafting/recipes')),
  });
}
const craft = createConfirmedAction(shopActionKeys, (intention, key) => api.POST('/api/crafting', {
  body: { recipeKey: intention.split(':').slice(2).join(':') },
  params: { header: { 'Idempotency-Key': key } },
}), craftingWasRefused);
export function craftEquipment(playerId: string, recipeKey: string) { return craft(`craft:${playerId}:${recipeKey}`); }
