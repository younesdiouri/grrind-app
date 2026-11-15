import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { QueryObserver } from '@tanstack/react-query';
import type { QueryObserverOptions } from '@tanstack/react-query';
import type { Failure } from '@/features/auth/problems';
import type { components } from '@/api/schema';
import type { Inventory } from '@/features/inventory/inventory';
import type { SyncSummary } from '@/features/reward/timeline';

// Les hooks, la session, les clients HTTP et React Query sont réels.
const require = createRequire(import.meta.url);
const items = new Map<string, string>();
let storageHold: ReturnType<typeof Promise.withResolvers<void>> | null = null;
let storageStarted = Promise.withResolvers<void>();
mock.module(require.resolve('expo-secure-store'), { namedExports: {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => {
    if (key.startsWith('grrind.sale.') || key === 'grrind.shop.action-keys') {
      storageStarted.resolve(); await storageHold?.promise;
    }
    return items.get(key) ?? null;
  },
  setItemAsync: async (key: string, value: string) => { items.set(key, value); },
  deleteItemAsync: async (key: string) => { items.delete(key); },
} });
mock.module(require.resolve('expo-crypto'), { namedExports: { randomUUID } });
mock.module('expo-router', { namedExports: { useIsFocused: () => true } });
mock.module(new URL('./config.ts', import.meta.url), { namedExports: { API_BASE_URL: 'https://api.test' } });
mock.module(new URL('../features/diagnostics/journal.ts', import.meta.url), { namedExports: {
  getJournal: () => ({ sessionActive: true }), noteAccessTokenReused: () => {},
  noteSessionAdopted: () => {}, noteSessionForgotten: () => {}, noteSessionLost: () => {},
} });

let offline = false;
let status = 200;
let hold: ReturnType<typeof Promise.withResolvers<void>> | null = null;
let refreshHold: ReturnType<typeof Promise.withResolvers<void>> | null = null;
let refreshStarted = Promise.withResolvers<void>();
let refreshRequest: Request | null = null;
let started = Promise.withResolvers<void>();
let guildProblem: 'forbidden' | 'guild-not-found' | null = null;
const savedGuild: components['schemas']['Guild'] = {
  id: 'guild-A', name: 'Nom normalisé serveur', memberCount: 2, capacity: 30, role: 'FOUNDER', createdAt: '2026-11-15T10:00:00Z',
  emblem: { symbol: 'YOGA', backgroundColor: 'MINT', symbolColor: 'NIGHT' },
};
const requests: Request[] = [];
mock.method(globalThis, 'fetch', async (input: Request) => {
  const path = new URL(input.url).pathname;
  if (path === '/api/auth/login') {
    const { email: id } = await input.json();
    return Response.json({ user: { id }, tokens: { accessToken: id, refreshToken: `refresh-${id}`, expiresIn: 900 } });
  }
  if (path === '/api/auth/logout') return new Response(null, { status: 204 });
  if (path === '/api/auth/refresh') {
    refreshRequest = input; refreshStarted.resolve(); await refreshHold?.promise;
    return Response.json({ user: { id: 'A' }, tokens: { accessToken: 'A-new', refreshToken: 'refresh-A-new', expiresIn: 900 } });
  }
  requests.push(input);
  const owner = input.headers.get('Authorization')?.replace('Bearer ', '');
  const waiting = hold;
  started.resolve();
  await waiting?.promise;
  if (offline) throw new TypeError('offline');
  if (input.method === 'PATCH' && path === '/api/guilds/guild-A') {
    if (guildProblem) return Response.json({ type: `https://grrind.app/problems/${guildProblem}`, title: 'Refus', detail: 'Refus',
      status: guildProblem === 'forbidden' ? 403 : 404 }, { status: guildProblem === 'forbidden' ? 403 : 404 });
    return Response.json(savedGuild);
  }
  if (status !== 200 && owner !== 'A-new') return Response.json({ type: 'https://grrind.app/problems/access-token-expired', status }, { status });
  const data = { owner, coins: owner === 'A' ? 10 : 20 };
  return Response.json(path === '/api/guilds/mine' ? { guild: data } : data);
});

const { signIn, signOut, getSessionOwner, getState } = await import('../features/auth/session.ts');
const { queryClient: client } = await import('./queryClient.ts');
const { inventoryOptions } = await import('../features/inventory/useInventory.ts');
const { myGuildOptions, myGuildQueryKey } = await import('../features/community/useMyGuild.ts');
const { risalatOptions } = await import('../features/community/useRisalat.ts');
const { guildWeeklyOptions } = await import('../features/community/useGuildWeekly.ts');
const { playerOptions } = await import('../features/community/usePlayer.ts');
const { shopOptions } = await import('../features/shop/useShop.ts');
const { craftingOptions, craftEquipment } = await import('../features/crafting/api.ts');
const { equipItem } = await import('../features/inventory/equipmentActions.ts');
const { inventoryQueryKey, mutateInventory, updateInventoryForOwner, refreshInventoryAfterReward } = await import('../features/inventory/inventoryCache.ts');
const { syncGuild, saveGuild } = await import('../features/community/guildCache.ts');
const { purchaseItem, openChest } = await import('../features/shop/actions.ts');
const { salesFor } = await import('../features/inventory/sales.ts');

beforeEach(async () => {
  client.clear();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  offline = false; status = 200; hold = null; started = Promise.withResolvers<void>(); requests.length = 0;
  storageHold = null; storageStarted = Promise.withResolvers<void>(); items.clear();
  refreshHold = null; refreshStarted = Promise.withResolvers<void>(); refreshRequest = null;
  guildProblem = null;
  assert.deepEqual(await signIn('A', 'password'), { ok: true });
});
afterEach(async () => { hold?.resolve(); storageHold?.resolve(); refreshHold?.resolve(); await signOut(); client.clear(); });

const privateOptions: [string, (owner: string | null) => QueryObserverOptions<unknown, Failure>][] = [
  ['inventaire', inventoryOptions], ['guilde', myGuildOptions],
  ['risalat', risalatOptions], ['classement de guilde', owner => guildWeeklyOptions(owner, 'same-guild')],
  ['profil de coéquipier', owner => playerOptions(owner, 'same-player')],
  ['boutique', shopOptions], ['recettes', craftingOptions],
] as [string, (owner: string | null) => QueryObserverOptions<unknown, Failure>][];

for (const [name, options] of privateOptions) {
  test(`${name} : aucune lecture sans session`, async () => {
    await signOut();
    const observer = new QueryObserver(client, options(null));
    const stop = observer.subscribe(() => {});
    try {
      assert.equal(observer.getCurrentResult().data, undefined);
      assert.equal(observer.getCurrentResult().fetchStatus, 'idle');
      assert.equal(requests.length, 0);
    } finally { stop(); }
  });

  test(`${name} : B ne voit jamais A, même pendant une lecture lente puis hors ligne`, async () => {
    const a = options('A');
    assert.deepEqual(await client.fetchQuery(a), { owner: 'A', coins: 10 });
    await signOut();
    await signIn('B', 'password');
    hold = Promise.withResolvers<void>();
    const observer = new QueryObserver(client, options('B'));
    const stop = observer.subscribe(() => {});
    try {
      assert.equal(observer.getCurrentResult().data, undefined);
      offline = true; hold.resolve();
      await observer.refetch();
      assert.equal(observer.getCurrentResult().data, undefined);
      assert.deepEqual(observer.getCurrentResult().error, { kind: 'offline' });
    } finally { stop(); }
  });

  test(`${name} : réponse A tardive ignorée, retour sur A relu`, async () => {
    hold = Promise.withResolvers<void>();
    const waiting = hold;
    const a = options('A');
    const pending = client.fetchQuery(a).catch(() => null);
    await started.promise;
    const requestA = requests.at(-1)!;
    await signOut();
    assert.equal(requestA.signal.aborted, true);
    assert.equal(client.getQueryData(a.queryKey!), undefined);
    await signIn('B', 'password'); hold = null;
    const b = options('B');
    assert.deepEqual(await client.fetchQuery(b), { owner: 'B', coins: 20 });
    waiting.resolve(); await pending;
    assert.deepEqual(client.getQueryData(b.queryKey!), { owner: 'B', coins: 20 });
    assert.equal(client.getQueryState(b.queryKey!)?.isInvalidated, false);
    await signOut(); await signIn('A', 'password');
    const observer = new QueryObserver(client, options('A'));
    assert.equal(observer.getCurrentResult().data, undefined);
    assert.deepEqual(await client.fetchQuery(options('A')), { owner: 'A', coins: 10 });
  });
}

for (const returnToA of [false, true]) {
  test(`équipement A tardif ignoré ${returnToA ? 'après le retour sur A' : 'chez B'}`, async () => {
    const owner = getSessionOwner();
    hold = Promise.withResolvers<void>(); const waiting = hold;
    const pending = mutateInventory(client, owner, () => equipItem('HEAD', 'item'));
    await started.promise;
    await signOut(); await signIn('B', 'password'); hold = null;
    if (returnToA) { await signOut(); await signIn('A', 'password'); }
    const current = returnToA ? 'A' : 'B';
    const fresh = await client.fetchQuery(inventoryOptions(current));
    waiting.resolve();
    assert.equal(await pending, null);
    updateInventoryForOwner(client, owner, previous => previous === undefined ? previous : { ...previous, coins: 999 });
    assert.deepEqual(client.getQueryData(inventoryQueryKey(current)), fresh);
    assert.equal(client.getQueryState(inventoryQueryKey(current))?.isInvalidated, false);
    if (!returnToA) assert.equal(client.getQueryData(inventoryQueryKey('A')), undefined);
  });
}

test('le rafraîchissement manuel tardif de guilde ne recrée pas A et ne retire pas la guilde B', async () => {
  hold = Promise.withResolvers<void>(); const waiting = hold;
  let gone = false;
  const pending = syncGuild('guild-A', client, getSessionOwner(), () => { gone = true; });
  await started.promise;
  await signOut(); await signIn('B', 'password'); hold = null;
  const b = myGuildOptions('B'); const fresh = await client.fetchQuery(b);
  waiting.resolve(); await pending;
  assert.deepEqual(client.getQueryData(b.queryKey), fresh);
  assert.equal(client.getQueryData(myGuildOptions('A').queryKey), undefined);
  assert.equal(gone, false);
});

test('la sauvegarde conserve les membres et adopte le nom et l’emblème reçus du serveur', async () => {
  const members: components['schemas']['GuildMember'][] = [];
  client.setQueryData(myGuildQueryKey('A'), { ...savedGuild, name: 'Ancien nom', members });
  const changes = { name: 'Saisie', emblem: { ...savedGuild.emblem, symbol: 'BOLT' as const } };
  const outcome = await saveGuild('guild-A', changes, client, getSessionOwner(), () => assert.fail('Guilde présente'));
  assert.equal(outcome?.ok, true);
  assert.deepEqual(await requests[0].json(), changes);
  assert.deepEqual(client.getQueryData(myGuildOptions('A').queryKey), { ...savedGuild, members });
});

test('une coupure ne change pas le cache et le retry renvoie les mêmes choix', async () => {
  const previous = { ...savedGuild, name: 'Avant', members: [] };
  client.setQueryData(myGuildOptions('A').queryKey, previous);
  const changes = { emblem: savedGuild.emblem };
  offline = true;
  assert.deepEqual(await saveGuild('guild-A', changes, client, getSessionOwner(), () => {}), { ok: false, failure: { kind: 'offline' } });
  assert.deepEqual(client.getQueryData(myGuildOptions('A').queryKey), previous);
  offline = false;
  assert.equal((await saveGuild('guild-A', changes, client, getSessionOwner(), () => {}))?.ok, true);
  assert.deepEqual(await requests[0].json(), await requests[1].json());
});

test('la perte de gestion invalide le rôle en cache ; la perte de guilde ferme le périmètre', async () => {
  client.setQueryData(myGuildQueryKey('A'), { ...savedGuild, members: [] });
  guildProblem = 'forbidden';
  assert.equal((await saveGuild('guild-A', { emblem: savedGuild.emblem }, client, getSessionOwner(), () => assert.fail()))?.ok, false);
  assert.equal(client.getQueryState(myGuildOptions('A').queryKey)?.isInvalidated, true);
  guildProblem = 'guild-not-found';
  let gone = false;
  assert.equal(await saveGuild('guild-A', { emblem: savedGuild.emblem }, client, getSessionOwner(), () => { gone = true; }), null);
  assert.equal(gone, true);
});

test('une sauvegarde tardive ne recrée pas la guilde de l’ancienne connexion', async () => {
  hold = Promise.withResolvers<void>(); const waiting = hold;
  const owner = getSessionOwner();
  const pending = saveGuild('guild-A', { emblem: savedGuild.emblem }, client, owner, () => assert.fail());
  await started.promise;
  await signOut(); await signIn('B', 'password'); hold = null;
  client.setQueryData(myGuildQueryKey('B'), { ...savedGuild, id: 'guild-B', members: [] });
  waiting.resolve();
  assert.equal(await pending, null);
  assert.equal(client.getQueryData(myGuildOptions('A').queryKey), undefined);
  assert.equal(client.getQueryData<components['schemas']['GuildDetail']>(myGuildOptions('B').queryKey)?.id, 'guild-B');
  const count = requests.length;
  assert.equal(await saveGuild('guild-A', { emblem: savedGuild.emblem }, client, owner, () => assert.fail()), null);
  assert.equal(requests.length, count);
});

test('un 401 tardif de mutation A ne rejoue jamais le geste avec le JWT de B', async () => {
  hold = Promise.withResolvers<void>(); const waiting = hold;
  const pending = equipItem('HEAD', 'item');
  await started.promise;
  await signOut(); await signIn('B', 'password');
  status = 401; waiting.resolve();
  assert.equal((await pending).ok, false);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers.get('Authorization'), 'Bearer A');
});

test('une sortie pendant le refresh HTTP le laisse finir et bloque le rejeu de A après la connexion B', async () => {
  status = 401; refreshHold = Promise.withResolvers<void>();
  const pending = equipItem('HEAD', 'item'); await refreshStarted.promise;
  await signOut(); await signIn('B', 'password');
  refreshHold.resolve();
  assert.equal((await pending).ok, false);
  assert.equal(refreshRequest!.signal.aborted, false);
  assert.equal(requests.length, 1);
  assert.deepEqual(getState(), { status: 'signedIn', user: { id: 'B' } });
});

test('un refresh du même owner conserve les caches privés et permet le rejeu habituel', async () => {
  const a = await client.fetchQuery(inventoryOptions('A'));
  const owner = getSessionOwner(); status = 401;
  assert.equal((await equipItem('HEAD', 'item')).ok, true);
  assert.deepEqual(getSessionOwner(), owner);
  assert.deepEqual(client.getQueryData(inventoryQueryKey('A')), a);
  assert.deepEqual(requests.map(r => r.headers.get('Authorization')), ['Bearer A', 'Bearer A', 'Bearer A-new']);
});

for (const [name, send] of [
  ['achat', () => purchaseItem('item')], ['coffre', () => openChest('item')],
  ['fabrication', () => craftEquipment('A', 'recipe')],
  ['vente', () => salesFor('A').sell({ itemKey: 'item', expectedSellPriceCoins: 1 })],
] as const) {
  test(`${name} : une attente du Keychain de A ne déclenche pas d’écriture chez B`, async () => {
    storageHold = Promise.withResolvers<void>(); const waiting = storageHold;
    const pending = send(); await storageStarted.promise;
    await signOut(); await signIn('B', 'password');
    waiting.resolve();
    assert.equal((await pending).kind, 'refused');
    assert.equal(requests.length, 0);
  });
}

test('un ancien achat incertain garde son UUID après attribution au compte et chaque nouvel achat reçoit sa clé', async () => {
  items.set('grrind.shop.action-keys', JSON.stringify({ 'purchase:item': 'legacy-key' }));
  offline = true;
  await purchaseItem('item'); await purchaseItem('item');
  const key = (request: Request) => request.headers.get('Idempotency-Key');
  assert.deepEqual(requests.map(key), ['legacy-key', 'legacy-key']);
  await signOut(); await signIn('B', 'password');
  // B ne consomme pas l'intention attribuée à A.
  await purchaseItem('item'); offline = false;
  await purchaseItem('item'); await purchaseItem('item');
  assert.equal(key(requests[2]), 'legacy-key');
  assert.equal(key(requests[3]), 'legacy-key');
  assert.notEqual(key(requests[4]), 'legacy-key');
  await signOut(); await signIn('A', 'password');
  await purchaseItem('item');
  assert.equal(key(requests[5]), 'legacy-key');
});

test('le cache commun survit aux bascules et un ancien observer privé ne lit pas avec le JWT de B', async () => {
  client.setQueryData(['avatar-catalog'], { revision: 3 });
  const a = inventoryOptions('A'); await client.fetchQuery(a);
  await signOut(); await signIn('B', 'password');
  const count = requests.length;
  await assert.rejects(client.fetchQuery(a));
  assert.equal(requests.length, count);
  assert.deepEqual(client.getQueryData(['avatar-catalog']), { revision: 3 });
});

test('la fermeture de récompense actualise immédiatement le solde du seul sac courant', async () => {
  const inventory = { coins: 0, items: [], equipment: {} } as unknown as Inventory;
  const reward = JSON.parse(readFileSync(new URL('../../fixtures/sync-summary/trois-workouts.json', import.meta.url), 'utf8')) as SyncSummary;
  client.setQueryData(inventoryQueryKey('A'), inventory);
  const owner = getSessionOwner();
  await refreshInventoryAfterReward(client, reward, owner);
  assert.equal(client.getQueryData<Inventory>(inventoryQueryKey('A'))?.coins, reward.imported.at(-1)?.coins.after);
  assert.equal(client.getQueryState(inventoryQueryKey('A'))?.isInvalidated, true);
  await signOut(); await signIn('B', 'password');
  client.setQueryData(inventoryQueryKey('B'), inventory);
  await refreshInventoryAfterReward(client, reward, owner);
  assert.equal(client.getQueryData<Inventory>(inventoryQueryKey('B'))?.coins, 0);
  assert.equal(client.getQueryState(inventoryQueryKey('B'))?.isInvalidated, false);
});
