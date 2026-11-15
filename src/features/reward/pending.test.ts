import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { beforeEach, mock, test } from 'node:test';

import type { SyncSummary } from './timeline.ts';

const first = JSON.parse(readFileSync('fixtures/sync-summary/un-workout.json', 'utf8')) as SyncSummary;
const second = JSON.parse(readFileSync('fixtures/sync-summary/trois-workouts.json', 'utf8')) as SyncSummary;

// Session, file, sync and HTTP clients are real; only native storage/Health and fetch are fake.
const require = createRequire(import.meta.url);
const disk = new Map<string, string>();
const keychain = new Map<string, string>();
type Hold = { started: ReturnType<typeof Promise.withResolvers<void>>; finished: ReturnType<typeof Promise.withResolvers<void>> };
function hold(): Hold { return { started: Promise.withResolvers<void>(), finished: Promise.withResolvers<void>() }; }
let httpHold: { path: string; owner: string; pause: Hold } | null = null;
let healthHold: Hold | null = null;
let cleanupHold: Hold | null = null;
const requests: { path: string; owner: string | null }[] = [];
async function waitAt(pause: Hold | null) {
  pause?.started.resolve();
  await pause?.finished.promise;
}
// Node 24 tries to strip Expo's node_modules/*.ts before substituting its module mock.
registerHooks({ resolve(specifier, context, next) {
  const resolved = next(specifier, context);
  return specifier === 'expo-file-system' ? { ...resolved, format: 'module' } : resolved;
} });
mock.module('expo-file-system', { namedExports: {
  Paths: { document: 'documents' },
  File: class {
    path: string;
    constructor(...parts: string[]) { this.path = parts.join('/'); }
    get exists() { return disk.has(this.path); }
    create() { disk.set(this.path, ''); }
    write(text: string) { disk.set(this.path, text); }
    textSync() { return disk.get(this.path) ?? ''; }
    delete() { disk.delete(this.path); }
  },
} });
mock.module(require.resolve('expo-secure-store'), { namedExports: {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => keychain.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { keychain.set(key, value); },
  deleteItemAsync: async (key: string) => {
    if (key === 'grrind.sync.idempotency') await waitAt(cleanupHold);
    keychain.delete(key);
  },
} });
mock.module(require.resolve('expo-crypto'), { namedExports: { randomUUID } });
mock.module(new URL('../health/current.ts', import.meta.url), { namedExports: {
  healthProvider: {
    isAvailable: async () => true,
    workoutsSince: async () => {
      await waitAt(healthHold);
      return [{ source: 'APPLE_HEALTH', externalId: 'health-workout', activityType: 37,
        startedAt: '2026-11-15T08:00:00Z', endedAt: '2026-11-15T09:00:00Z' }];
    },
  },
} });
mock.module(new URL('../../api/config.ts', import.meta.url), { namedExports: {
  API_BASE_URL: 'https://qa.invalid',
} });
mock.method(globalThis, 'fetch', async (request: Request) => {
  const path = new URL(request.url).pathname;
  if (path === '/api/auth/logout') return new Response(null, { status: 204 });
  if (path.startsWith('/api/workouts/')) {
    const owner = request.headers.get('Authorization')?.replace('Bearer jwt-', '') ?? null;
    requests.push({ path, owner });
    if (httpHold?.path === path && httpHold.owner === owner) await waitAt(httpHold.pause);
    if (path === '/api/workouts/sync-state') return Response.json({ lastImportedAt: null, importWindowDays: 30 });
    assert.equal(path, '/api/workouts/import');
    return Response.json(owner?.startsWith('A-') ? first : second);
  }
  assert.equal(path, '/api/auth/login');
  const { email } = await request.json();
  return Response.json({ user: { id: email }, tokens: {
    accessToken: `jwt-${email}`, refreshToken: `refresh-${email}`, expiresIn: 900,
  } });
});

const session = await import('../auth/session.ts');
const pending = await import('./pending.ts');
const health = await import('../health/sync.ts');
const { api } = await import('../../api/client.ts');
let processNumber = 0;
let caseNumber = 0;
async function boot() {
  // Fresh reward singleton, same disk: the queue must survive process death.
  return await import(`./pending.ts?process=${++processNumber}`) as typeof import('./pending');
}
async function login(id: string) {
  assert.deepEqual(await session.signIn(`${id}-${caseNumber}`, 'test-password'), { ok: true });
  return session.getSessionOwner()!;
}

beforeEach(async () => {
  await session.signOut();
  disk.clear(); keychain.clear(); requests.length = 0;
  httpHold = null; healthHold = null; cleanupHold = null;
  caseNumber += 1;
});

test('redémarrage sous B : le bilan A reste réservé à A', async () => {
  const ownerA = await login('A');
  const firstProcess = await boot();
  firstProcess.enqueuePending(first, ownerA);
  assert.deepEqual(firstProcess.getPending(ownerA), first);

  await session.signOut();
  const ownerB = await login('B');
  const restarted = await boot();
  assert.equal(restarted.getPending(ownerB), null);
  restarted.enqueuePending(second, ownerB);
  assert.deepEqual(restarted.getPending(ownerB), second);

  await session.signOut();
  const returnedA = await login('A');
  const returned = await boot();
  assert.deepEqual(returned.getPending(returnedA), first);
});

for (const legacy of [first, [first, second]]) {
  test(`legacy ${Array.isArray(legacy) ? 'file' : 'résumé seul'} : conservé à l’identique, jamais attribué`, async () => {
    const raw = JSON.stringify(legacy, null, 2);
    const path = 'documents/pending-reward.json';
    disk.set(path, raw);
    for (const name of ['A', 'B', 'A']) {
      const owner = await login(name);
      const store = await boot();
      assert.equal(store.getPending(), null);
      store.enqueuePending(first, owner);
      assert.equal(store.markPlayed(store.getPending()!, owner), true);
      assert.equal(store.getPending(), null);
      assert.equal(disk.get(path), raw);
      await session.signOut();
    }
  });
}

for (const returnToA of [false, true]) {
  test(`ACK A tardif ignoré ${returnToA ? 'après reconnexion de A' : 'sous B'}, sans perdre la suite`, async () => {
    const ownerA = await login('A');
    const store = await boot();
    store.enqueuePending(first, ownerA, true);
    store.enqueuePending(second, ownerA);
    const shown = store.getPending(ownerA)!;
    assert.equal(store.wasSolicited(shown), true);
    await session.signOut();
    const ownerB = await login('B');
    store.enqueuePending(second, ownerB);
    assert.equal(store.markPlayed(shown, ownerA), false);
    assert.equal(store.getPending(ownerB), second);
    if (returnToA) {
      await session.signOut();
      const returned = await login('A');
      assert.equal(store.markPlayed(shown, ownerA), false);
      assert.equal(store.getPending(returned), first);
      assert.equal(store.wasSolicited(shown), false, 'un geste ne survit pas à sa session');
      assert.equal(store.markPlayed(shown, returned), true);
      assert.equal(store.markPlayed(shown, returned), false, 'un double ACK garde le bilan suivant');
      assert.equal(store.getPending(returned), second);
      assert.deepEqual((await boot()).getPending(returned), second);
    }
  });
}

test('les abonnés relisent le compte courant ; les callbacks périmés ne lisent ni n’écrivent', async () => {
  const ownerA = await login('A');
  const store = await boot();
  store.enqueuePending(first, ownerA);
  let snapshot = store.getPending();
  const stop = store.subscribeToPending(() => { snapshot = store.getPending(); });
  try {
    await session.signOut();
    assert.equal(snapshot, null);
    const ownerB = await login('B');
    assert.equal(snapshot, null);
    store.enqueuePending(second, ownerB);
    assert.equal(snapshot, second);
    assert.equal(store.getPending(ownerA), null);
    const before = new Map(disk);
    store.enqueuePending(first, ownerA, true);
    assert.deepEqual(disk, before);
    assert.equal(snapshot, second);
  } finally { stop(); }
});

for (const trigger of ['manual', 'background'] as const) {
  test(`producteur santé ${trigger} : bilan durable réservé au compte de l’import`, async () => {
    const owner = await login('A');
    const outcome = await health.sync(trigger);
    assert.equal(outcome.status, 'done');
    assert.deepEqual(pending.getPending(owner), first);
    assert.equal(pending.wasSolicited(pending.getPending(owner)!), trigger === 'manual');
    assert.deepEqual((await boot()).getPending(owner), first);
    assert.equal(requests.filter(({ path }) => path === '/api/workouts/import').length, 1);
    await session.signOut();
    await login('B');
    assert.equal(pending.getPending(), null);
    assert.deepEqual(health.getSyncStatus(), { phase: 'idle' });
  });
}

for (const boundary of ['cursor', 'health', 'import', 'cleanup'] as const) {
  test(`réponse A tardive (${boundary}) : aucun bilan ni résultat publié sous B`, async () => {
    const ownerA = await login('A');
    pending.enqueuePending(first, ownerA);
    const pause = hold();
    if (boundary === 'health') healthHold = pause;
    else if (boundary === 'cleanup') cleanupHold = pause;
    else httpHold = { path: boundary === 'cursor' ? '/api/workouts/sync-state' : '/api/workouts/import', owner: ownerA.id, pause };
    const running = health.sync('manual');
    await pause.started.promise;
    await session.signOut();
    const ownerB = await login('B');
    assert.equal(pending.getPending(), null);
    assert.deepEqual(health.getSyncStatus(), { phase: 'idle' });
    pause.finished.resolve();
    assert.deepEqual(await running, { status: 'superseded' });
    assert.equal(pending.getPending(ownerB), null);
    assert.deepEqual(health.getSyncStatus(), { phase: 'idle' });
    if (boundary === 'cursor' || boundary === 'health') {
      assert.equal(requests.filter(({ path }) => path === '/api/workouts/import').length, 0);
    }
    await session.signOut();
    const returned = await login('A');
    const restarted = await boot();
    assert.deepEqual(restarted.getPending(returned), first);
    assert.equal(restarted.markPlayed(restarted.getPending(returned)!, returned), true);
    assert.equal(restarted.getPending(), null, 'le résultat tardif n’a pas ajouté un second bilan');
  });
}

test('B lance son import pendant que la réponse A attend, sans rejoindre sa promesse', async () => {
  const ownerA = await login('A');
  const pause = hold();
  httpHold = { path: '/api/workouts/import', owner: ownerA.id, pause };
  const runningA = health.sync('manual');
  await pause.started.promise;
  await session.signOut();
  const ownerB = await login('B');
  const outcomeB = await health.sync('launch');
  assert.equal(outcomeB.status, 'done');
  assert.deepEqual(pending.getPending(ownerB), second);
  const statusB = health.getSyncStatus();
  const revisionB = health.getSettledRevision();
  pause.finished.resolve();
  assert.deepEqual(await runningA, { status: 'superseded' });
  assert.equal(health.getSyncStatus(), statusB);
  assert.equal(health.getSettledRevision(), revisionB);
  assert.deepEqual((await boot()).getPending(ownerB), second);
});

for (const path of ['/api/workouts/sync-state', '/api/workouts/import']) {
  test(`bascule pendant les middlewares HTTP : aucun envoi du lot A sous B (${path})`, async () => {
    await login('A');
    const pause = hold();
    const middleware = { onRequest: async ({ schemaPath }: { schemaPath: string }) => {
      if (schemaPath === path) await waitAt(pause);
    } };
    api.use(middleware);
    try {
      const running = health.sync('background');
      await pause.started.promise;
      await session.signOut();
      await login('B');
      pause.finished.resolve();
      assert.deepEqual(await running, { status: 'superseded' });
      assert.equal(requests.filter((request) => request.path === path).length, 0);
      assert.equal(pending.getPending(), null);
    } finally { pause.finished.resolve(); api.eject(middleware); }
  });
}

test('une réponse A après reconnexion du même compte est ignorée par génération', async () => {
  const owner = await login('A');
  const pause = hold();
  httpHold = { path: '/api/workouts/import', owner: owner.id, pause };
  const running = health.sync('manual');
  await pause.started.promise;
  await session.signOut();
  const returned = await login('A');
  assert.notEqual(returned.generation, owner.generation);
  pause.finished.resolve();
  assert.deepEqual(await running, { status: 'superseded' });
  assert.equal(pending.getPending(returned), null);
  assert.deepEqual(health.getSyncStatus(), { phase: 'idle' });
});
