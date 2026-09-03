import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { QueryClient } from '@tanstack/react-query';

import type { Inventory } from './inventory.ts';
import { INVENTORY_QUERY_KEY, refreshInventoryAfterReward } from './inventoryCache.ts';
import type { SyncSummary } from '../reward/timeline.ts';

function summary(): SyncSummary {
  return JSON.parse(
    readFileSync(new URL('../../../fixtures/sync-summary/trois-workouts.json', import.meta.url), 'utf8'),
  ) as SyncSummary;
}

test('la fermeture de la récompense actualise immédiatement le solde du sac en cache', async () => {
  const queryClient = new QueryClient();
  const inventory = {
    coins: 0,
    items: [],
    equipment: {},
  } as unknown as Inventory;
  const reward = summary();
  const expectedCoins = reward.imported.at(-1)?.coins.after;

  queryClient.setQueryData(INVENTORY_QUERY_KEY, inventory);

  await refreshInventoryAfterReward(queryClient, reward);

  assert.equal(queryClient.getQueryData<Inventory>(INVENTORY_QUERY_KEY)?.coins, expectedCoins);
  assert.equal(queryClient.getQueryState(INVENTORY_QUERY_KEY)?.isInvalidated, true);
});
