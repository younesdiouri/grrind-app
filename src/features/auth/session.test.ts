import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { beforeEach, mock, test } from 'node:test';

import type { components } from '@/api/schema';

// Fake only native storage, diagnostics and HTTP. restore/adopt/refresh and tokenStore are real.
const require = createRequire(import.meta.url);
const items = new Map<string, string>();
const deleted: string[] = [];
const reasons: unknown[] = [];
let readFailure: string | null = null;
let writeFailure: string | null = null;
let rotations = 0;
let serverStatus = 200;
const liveTokens = new Set<string>();
const user = { id: 'qa-user' } as components['schemas']['UserProfile'];

mock.module(require.resolve('expo-secure-store'), { namedExports: {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => {
    if (key === readFailure) throw new Error('errSecInteractionNotAllowed');
    return items.get(key) ?? null;
  },
  setItemAsync: async (key: string, value: string) => {
    if (key === writeFailure) throw new Error('errSecInteractionNotAllowed');
    items.set(key, value);
  },
  deleteItemAsync: async (key: string) => { deleted.push(key); items.delete(key); },
} });
mock.module(new URL('../diagnostics/journal.ts', import.meta.url), { namedExports: {
  getJournal: () => ({ sessionActive: true }),
  noteAccessTokenReused: () => {},
  noteSessionAdopted: () => {},
  noteSessionForgotten: () => {},
  noteSessionLost: (reason: unknown) => reasons.push(reason),
} });
mock.module(new URL('../../api/publicClient.ts', import.meta.url), { namedExports: {
  publicApi: { POST: async (_path: string, { body }: { body: { refreshToken: string } }) => {
    if (serverStatus === 0) throw new Error('offline');
    if (serverStatus !== 200 || !liveTokens.delete(body.refreshToken)) {
      return { response: new Response(null, { status: serverStatus === 200 ? 401 : serverStatus }) };
    }
    rotations += 1;
    const refreshToken = `refresh-${rotations}`;
    liveTokens.add(refreshToken);
    return { data: { user, tokens: { accessToken: `jwt-${rotations}`, refreshToken, expiresIn: 900 } } };
  } },
} });

let processNumber = 0;
async function boot() {
  const tokenStore = await import('./tokenStore.ts');
  tokenStore.setAccessToken(null);
  // A fresh session singleton models a new process while the fake Keychain survives.
  const session = await import(`./session.ts?process=${++processNumber}`) as typeof import('./session');
  await session.restore();
  return session;
}

beforeEach(() => {
  items.clear(); deleted.length = 0; reasons.length = 0;
  readFailure = null; writeFailure = null; rotations = 0; serverStatus = 200;
  items.set('grrind.refreshToken', 'refresh-0');
  liveTokens.clear(); liveTokens.add('refresh-0');
});

test('deux démarrages rapprochés reprennent le JWT sans seconde rotation', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-01T07:21:00Z') });
  assert.equal((await boot()).getState().status, 'signedIn');
  t.mock.timers.tick(12 * 60_000);
  assert.equal((await boot()).getState().status, 'signedIn');
  assert.equal(rotations, 1);
});

test('un JWT expiré déclenche une nouvelle rotation', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  await boot();
  t.mock.timers.tick(20 * 60_000);
  assert.equal((await boot()).getState().status, 'signedIn');
  assert.equal(rotations, 2);
});

test('un JWT inaccessible retombe sur le refresh sans effacer la session', async () => {
  readFailure = 'grrind.session';
  assert.equal((await boot()).getState().status, 'signedIn');
  assert.equal(rotations, 1);
  assert.deepEqual(deleted, []);
});

test('cinq réveils en vingt minutes ne rejouent aucun refresh consommé', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await boot()).getState().status, 'signedIn');
    t.mock.timers.tick(5 * 60_000);
  }
  assert.equal(rotations, 2);
});

test('un refresh inaccessible termine la restauration sans effacer le Keychain', async () => {
  readFailure = 'grrind.refreshToken';
  assert.equal((await boot()).getState().status, 'signedOut');
  assert.equal(items.get('grrind.refreshToken'), 'refresh-0');
  assert.deepEqual(deleted, []);
  assert.ok(reasons.length > 0);
});

test('un Keychain vide finit signé dehors et efface les deux items', async () => {
  items.clear();
  assert.equal((await boot()).getState().status, 'signedOut');
  assert.equal(deleted.length, 2);
});

test('une panne d’écriture du refresh conserve le JWT neuf en mémoire', async () => {
  writeFailure = 'grrind.refreshToken';
  const session = await boot();
  assert.equal(session.getState().status, 'signedIn');
  assert.equal(session.getAccessToken(), 'jwt-1');
  assert.deepEqual(deleted, []);
  assert.ok(reasons.length > 0);
});

test('une panne d’écriture du JWT conserve le refresh successeur', async () => {
  writeFailure = 'grrind.session';
  assert.equal((await boot()).getState().status, 'signedIn');
  assert.equal(items.get('grrind.refreshToken'), 'refresh-1');
  assert.deepEqual(deleted, []);
});

test('un refus serveur définitif oublie la session', async () => {
  serverStatus = 401;
  assert.equal((await boot()).getState().status, 'signedOut');
  assert.equal(items.size, 0);
});

test('une panne réseau conserve le refresh pour le démarrage suivant', async () => {
  serverStatus = 0;
  assert.equal((await boot()).getState().status, 'signedOut');
  assert.equal(items.get('grrind.refreshToken'), 'refresh-0');
  serverStatus = 200;
  assert.equal((await boot()).getState().status, 'signedIn');
});
