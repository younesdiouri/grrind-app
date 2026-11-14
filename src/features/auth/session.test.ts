import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { beforeEach, mock, test } from 'node:test';

import type { components } from '@/api/schema';

// Fake only native storage, diagnostics and HTTP. restore/adopt/refresh and tokenStore are real.
const require = createRequire(import.meta.url);
const items = new Map<string, string>();
const deleted: string[] = [];
const written: { key: string; value: string }[] = [];
const reasons: unknown[] = [];
function deferred() {
  const { promise, resolve } = Promise.withResolvers<void>();
  return { promise, resolve };
}
let refreshResponse: ReturnType<typeof deferred> | null = null;
let refreshStarted = deferred();
let logoutResponse: ReturnType<typeof deferred> | null = null;
let logoutStarted = deferred();
let loginResponse: ReturnType<typeof deferred> | null = null;
let loginStarted = deferred();
let refreshStatus = 200;
let nativePause: {
  operation: 'read' | 'write' | 'delete'; key: string;
  started: ReturnType<typeof deferred>; finished: ReturnType<typeof deferred>;
} | null = null;
function pauseNative(operation: 'read' | 'write' | 'delete', key: string) {
  const pause = { operation, key, started: deferred(), finished: deferred() };
  nativePause = pause;
  return pause;
}
async function waitNative(operation: string, key: string) {
  if (nativePause?.operation === operation && nativePause.key === key) {
    const pause = nativePause;
    nativePause = null;
    pause.started.resolve();
    await pause.finished.promise;
  }
}
let readFailure: string | null = null;
let writeFailure: string | null = null;
let rotations = 0;
let serverStatus = 200;
const liveTokens = new Set<string>();
const user = { id: 'qa-user' } as components['schemas']['UserProfile'];
const nextUser = { id: 'next-user' } as components['schemas']['UserProfile'];

mock.module(require.resolve('expo-secure-store'), { namedExports: {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => {
    if (key === readFailure) throw new Error('errSecInteractionNotAllowed');
    const value = items.get(key) ?? null;
    await waitNative('read', key);
    return value;
  },
  setItemAsync: async (key: string, value: string) => {
    if (key === writeFailure) throw new Error('errSecInteractionNotAllowed');
    await waitNative('write', key);
    items.set(key, value);
    written.push({ key, value });
  },
  deleteItemAsync: async (key: string) => {
    await waitNative('delete', key);
    deleted.push(key); items.delete(key);
  },
} });
mock.module(new URL('../diagnostics/journal.ts', import.meta.url), { namedExports: {
  getJournal: () => ({ sessionActive: true }),
  noteAccessTokenReused: () => {},
  noteSessionAdopted: () => {},
  noteSessionForgotten: () => {},
  noteSessionLost: (reason: unknown) => reasons.push(reason),
} });
mock.module(new URL('../../api/publicClient.ts', import.meta.url), { namedExports: {
  publicApi: { POST: async (path: string, { body }: { body: { refreshToken: string } }) => {
    if (serverStatus === 0) throw new Error('offline');
    if (path === '/api/auth/logout') {
      logoutStarted.resolve();
      await logoutResponse?.promise;
      liveTokens.delete(body.refreshToken);
      return { response: new Response(null, { status: 204 }) };
    }
    if (path === '/api/auth/login' || path === '/api/auth/register') {
      liveTokens.add('next-refresh');
      loginStarted.resolve();
      await loginResponse?.promise;
      return { data: { user: nextUser,
        tokens: { accessToken: 'next-jwt', refreshToken: 'next-refresh', expiresIn: 900 } } };
    }
    if (serverStatus !== 200 || !liveTokens.delete(body.refreshToken)) {
      return { response: new Response(null, { status: serverStatus === 200 ? 401 : serverStatus }) };
    }
    rotations += 1;
    const refreshToken = `refresh-${rotations}`;
    liveTokens.add(refreshToken);
    refreshStarted.resolve();
    await refreshResponse?.promise;
    if (refreshStatus !== 200) return { response: new Response(null, { status: refreshStatus }) };
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
  items.clear(); deleted.length = 0; written.length = 0; reasons.length = 0;
  refreshResponse = null; refreshStarted = deferred();
  logoutResponse = null; logoutStarted = deferred();
  loginResponse = null; loginStarted = deferred(); refreshStatus = 200;
  nativePause = null;
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

test('une réponse de refresh après signOut ne réadopte pas la session quittée', async () => {
  const session = await boot();
  const statuses: string[] = [];
  session.subscribe(() => statuses.push(session.getState().status));
  written.length = 0;
  refreshResponse = deferred(); refreshStarted = deferred();
  const refreshing = session.refresh('jwt-1', null);
  await refreshStarted.promise;

  await session.signOut();
  assert.equal(session.getState().status, 'signedOut');
  refreshResponse.resolve();
  await refreshing;

  assert.deepEqual(statuses, ['signedOut']);
  assert.equal(session.getAccessToken(), null);
  assert.equal(items.size, 0, 'aucun successeur ne doit réouvrir la session au prochain process');
  assert.equal(liveTokens.size, 0, 'le successeur reçu après la sortie doit être révoqué');
  assert.deepEqual(written, [], 'une session quittée ne reprend pas les clés locales');
});

test('signOut oublie les deux jetons même si leur lecture Keychain est refusée', async () => {
  const session = await boot();
  readFailure = 'grrind.refreshToken';

  await assert.doesNotReject(session.signOut());

  assert.equal(session.getState().status, 'signedOut');
  assert.equal(session.getAccessToken(), null);
  assert.equal(items.size, 0);
  assert.deepEqual(deleted, ['grrind.refreshToken', 'grrind.session']);
});

function assertNextSession(session: Awaited<ReturnType<typeof boot>>) {
  assert.deepEqual(session.getState(), { status: 'signedIn', user: nextUser });
  assert.equal(session.getAccessToken(), 'next-jwt');
  assert.equal(items.get('grrind.refreshToken'), 'next-refresh');
  const stored = JSON.parse(items.get('grrind.session')!);
  assert.equal(stored.accessToken, 'next-jwt');
  assert.deepEqual(stored.user, nextUser);
  assert.ok(liveTokens.has('next-refresh'));
}

test('une nouvelle connexion survit au logout et au successeur tardifs de l’ancienne', async () => {
  const session = await boot();
  refreshResponse = deferred(); refreshStarted = deferred();
  const refreshing = session.refresh('jwt-1', null);
  await refreshStarted.promise;
  logoutResponse = deferred(); logoutStarted = deferred();
  const leaving = session.signOut();
  await logoutStarted.promise;

  assert.deepEqual(await session.signIn('next@example.test', 'test-password'), { ok: true });
  assertNextSession(session);
  const writesAfterLogin = written.slice();
  const deletesAfterLogin = deleted.slice();

  logoutResponse.resolve();
  await leaving;
  refreshResponse.resolve();
  assert.equal(await refreshing, null);

  assertNextSession(session);
  assert.deepEqual(written, writesAfterLogin);
  assert.deepEqual(deleted, deletesAfterLogin);
  assert.deepEqual([...liveTokens], ['next-refresh']);
});

test('un ancien refus définitif de refresh ne peut pas effacer une nouvelle connexion', async () => {
  const session = await boot();
  refreshResponse = deferred(); refreshStarted = deferred();
  const refreshing = session.refresh('jwt-1', null);
  await refreshStarted.promise;
  await session.signOut();
  assert.deepEqual(await session.signIn('next@example.test', 'test-password'), { ok: true });
  const deletesAfterLogin = deleted.slice();
  refreshStatus = 401;
  refreshResponse.resolve();
  assert.equal(await refreshing, null);
  assertNextSession(session);
  assert.deepEqual(deleted, deletesAfterLogin);
});

for (const key of ['grrind.refreshToken', 'grrind.session']) {
  test(`une écriture de ${key} commencée avant la sortie finit avant l’effacement et le nouveau login`, async () => {
    const session = await boot();
    const writing = pauseNative('write', key);
    const refreshing = session.refresh('jwt-1', null);
    await writing.started.promise;
    const leaving = session.signOut();
    const signingIn = session.signIn('next@example.test', 'test-password');
    writing.finished.resolve();
    await Promise.all([refreshing, leaving]);
    assert.deepEqual(await signingIn, { ok: true });
    assertNextSession(session);
    assert.deepEqual([...liveTokens], ['next-refresh']);
  });
}

test('un effacement Keychain déjà commencé ne peut pas effacer les jetons du nouveau login', async () => {
  const session = await boot();
  const deleting = pauseNative('delete', 'grrind.session');
  const leaving = session.signOut();
  await deleting.started.promise;
  const signingIn = session.signIn('next@example.test', 'test-password');
  deleting.finished.resolve();
  await leaving;
  assert.deepEqual(await signingIn, { ok: true });
  assertNextSession(session);
  assert.deepEqual([...liveTokens], ['next-refresh']);
});

test('une restauration déjà en lecture ne réadopte pas le JWT après sortie', async () => {
  const session = await boot();
  const reading = pauseNative('read', 'grrind.session');
  const restoring = session.restore();
  await reading.started.promise;
  const leaving = session.signOut();
  reading.finished.resolve();
  await Promise.all([restoring, leaving]);
  assert.equal(session.getState().status, 'signedOut');
  assert.equal(session.getAccessToken(), null);
  assert.equal(items.size, 0);
  assert.equal(rotations, 1);
});

test('un login commencé avant signOut ne réadopte pas sa réponse tardive', async () => {
  const session = await boot();
  loginResponse = deferred(); loginStarted = deferred();
  const signingIn = session.signIn('next@example.test', 'test-password');
  await loginStarted.promise;
  await session.signOut();
  loginResponse.resolve();
  assert.equal((await signingIn).ok, false);
  assert.equal(session.getState().status, 'signedOut');
  assert.equal(session.getAccessToken(), null);
  assert.equal(items.size, 0);
  assert.equal(liveTokens.size, 0);
});

test('les appels concurrents à la session réelle partagent une seule rotation', async () => {
  const session = await boot();
  refreshResponse = deferred(); refreshStarted = deferred();
  const first = session.refresh('jwt-1', null);
  const second = session.refresh('jwt-1', null);
  await refreshStarted.promise;
  refreshResponse.resolve();
  assert.deepEqual(await Promise.all([first, second]), ['jwt-2', 'jwt-2']);
  assert.equal(rotations, 2);
  assert.equal(items.get('grrind.refreshToken'), 'refresh-2');
  assert.equal(JSON.parse(items.get('grrind.session')!).accessToken, 'jwt-2');
});

test('une lecture de refresh suspendue ne démarre aucune rotation après la sortie', async () => {
  const session = await boot();
  const reading = pauseNative('read', 'grrind.refreshToken');
  const refreshing = session.refresh('jwt-1', null);
  await reading.started.promise;
  const leaving = session.signOut();
  reading.finished.resolve();
  assert.equal(await refreshing, null);
  await leaving;
  assert.equal(rotations, 1);
  assert.equal(session.getAccessToken(), null);
  assert.equal(items.size, 0);
  assert.equal(liveTokens.size, 0);
});

test('un ancien 401 irrécupérable ne déconnecte pas le nouveau propriétaire', async () => {
  const session = await boot();
  await session.signOut();
  await session.signIn('next@example.test', 'test-password');
  const deletesAfterLogin = deleted.slice();
  await session.refresh('jwt-1', {
    type: 'https://grrind.app/problems/access-token-invalid', detail: 'old JWT',
  });
  assertNextSession(session);
  assert.deepEqual(deleted, deletesAfterLogin);
  assert.equal(rotations, 1);
});

test('une inscription réussie reste adoptée quand l’ancien logout termine', async () => {
  const session = await boot();
  logoutResponse = deferred(); logoutStarted = deferred();
  const leaving = session.signOut();
  await logoutStarted.promise;
  assert.deepEqual(await session.register({
    email: 'next@example.test', password: 'test-password',
    displayName: 'Next', timezone: 'Europe/Paris',
  }), { ok: true });
  logoutResponse.resolve();
  await leaving;
  assertNextSession(session);
  assert.deepEqual([...liveTokens], ['next-refresh']);
});

test('une panne réseau pendant logout n’empêche pas l’oubli local', async () => {
  const session = await boot();
  serverStatus = 0;
  await session.signOut();
  assert.equal(session.getState().status, 'signedOut');
  assert.equal(session.getAccessToken(), null);
  assert.equal(items.size, 0);
});
