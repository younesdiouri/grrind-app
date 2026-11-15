import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { beforeEach, mock, test } from 'node:test';

import type { SyncSummary } from './timeline.ts';
import type { WorkoutData } from '../health/provider.ts';

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
let loseReply = false;
let refuseReceipt = false;
let refuseCleanup = false;
let refuseIntent = false;
let interruptReplacement = false;
let available = true;
let responseForA = first;
let found = workouts();
function workouts(): WorkoutData[] {
  return [{ source: 'APPLE_HEALTH', externalId: 'health-workout', activityType: 'running',
    startedAt: '2026-11-15T08:00:00+01:00', endedAt: '2026-11-15T09:00:00+01:00' }];
}
const imports: { owner: string | null; key: string | null; body: string }[] = [];
const committed = new Map<string, { body: string; summary: SyncSummary }>();
const requests: { path: string; owner: string | null }[] = [];
async function waitAt(pause: Hold | null) {
  pause?.started.resolve();
  await pause?.finished.promise;
}
// Node 24 tries to strip Expo's node_modules/*.ts before substituting its module mock.
registerHooks({ resolve(specifier, context, next) {
  const resolved = next(specifier, context);
  const process = new URL(context.parentURL ?? 'file:///').searchParams.get('process');
  if (process && resolved.url.endsWith('/reward/pending.ts')) {
    return { ...resolved, url: `${resolved.url}?process=${process}` };
  }
  return specifier === 'expo-file-system' ? { ...resolved, format: 'module' } : resolved;
} });
mock.module('expo-file-system', { namedExports: {
  Paths: { document: 'documents' },
  File: class {
    path: string;
    constructor(...parts: string[]) { this.path = parts.join('/'); }
    get uri() { return this.path; }
    get exists() { return disk.has(this.path); }
    create() { disk.set(this.path, ''); }
    write(text: string) {
      if (refuseReceipt && this.path.includes('pending-reward-')) throw new Error('disque refusé');
      if (refuseIntent && this.path.includes('pending-import-')) throw new Error('intention refusée');
      disk.set(this.path, text);
    }
    textSync() { return disk.get(this.path) ?? ''; }
    delete() {
      if (refuseCleanup && this.path.includes('pending-import-')) throw new Error('nettoyage refusé');
      disk.delete(this.path);
    }
    move(destination: { path: string }) {
      if (interruptReplacement && this.path.includes('pending-reward-') && this.path.endsWith('.next')) {
        throw new Error('arrêt pendant le remplacement');
      }
      disk.set(destination.path, disk.get(this.path)!);
      disk.delete(this.path);
      this.path = destination.path;
    }
  },
} });
mock.module(require.resolve('expo-secure-store'), { namedExports: {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => keychain.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { keychain.set(key, value); },
  deleteItemAsync: async (key: string) => {
    if (refuseCleanup && key === 'grrind.sync.idempotency') throw new Error('nettoyage refusé');
    keychain.delete(key);
  },
} });
mock.module(require.resolve('expo-crypto'), { namedExports: { randomUUID } });
mock.module(new URL('../health/current.ts', import.meta.url), { namedExports: {
  healthProvider: {
    isAvailable: async () => available,
    workoutsSince: async () => {
      await waitAt(healthHold);
      return found;
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
    const key = request.headers.get('Idempotency-Key');
    const body = await request.text();
    const intent = JSON.parse(disk.get(`documents/pending-import-${encodeURIComponent(owner!)}.json`)!);
    assert.equal(intent.key, key, 'la clé doit être durable avant le transport');
    assert.equal(JSON.stringify(intent.body), body, 'le corps exact doit être durable avant le transport');
    imports.push({ owner, key, body });
    const held = committed.get(`${owner}/${key}`);
    if (held) assert.equal(body, held.body, 'la même clé exige le corps exact');
    const summary = held?.summary ?? (owner?.startsWith('A-') ? responseForA : second);
    committed.set(`${owner}/${key}`, { body, summary });
    if (loseReply) throw new Error('réponse perdue après COMMIT');
    return Response.json(summary, { headers: { 'Idempotent-Replay': held ? 'true' : 'false' } });
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
async function bootSync() {
  const process = ++processNumber;
  return {
    health: await import(`../health/sync.ts?process=${process}`) as typeof health,
    pending: await import(`./pending.ts?process=${process}`) as typeof pending,
  };
}
async function login(id: string) {
  assert.deepEqual(await session.signIn(`${id}-${caseNumber}`, 'test-password'), { ok: true });
  return session.getSessionOwner()!;
}

beforeEach(async () => {
  await session.signOut();
  disk.clear(); keychain.clear(); requests.length = 0;
  httpHold = null; healthHold = null;
  loseReply = false; refuseReceipt = false; refuseCleanup = false; available = true;
  refuseIntent = false; interruptReplacement = false; responseForA = first;
  found = workouts(); imports.length = 0; committed.clear();
  caseNumber += 1;
});

for (const healthAvailable of [true, false]) {
  test(`COMMIT sans réponse puis nouvelle séance et redémarrage (Health ${healthAvailable}) : corps exact avant le curseur`, async () => {
    const owner = await login('A');
    const initial = await bootSync();
    loseReply = true;
    const lost = await initial.health.sync('background');
    assert.equal(lost.status === 'done' && lost.result.kind, 'failed');
    assert.equal(initial.pending.getPending(owner), null);
    const original = imports[0];
    found = [...workouts(), { ...workouts()[0], externalId: 'nouvelle-séance', activityType: 'provider-unknown-type' }];
    loseReply = false;
    available = healthAvailable;
    const restarted = await bootSync();
    const before = requests.length;
    const recovered = await restarted.health.sync('launch');
    assert.equal(recovered.status === 'done' && recovered.result.kind, 'summary');
    assert.deepEqual(imports[1], original);
    assert.deepEqual(requests.slice(before).map(({ path }) => path), ['/api/workouts/import']);
    assert.deepEqual(restarted.pending.getPending(owner), first);
    assert.deepEqual((await boot()).getPending(owner), first);
  });
}

test('arrêt avant enqueue : l’intention garde le reçu récupérable après refus du disque', async () => {
  const owner = await login('A');
  refuseReceipt = true;
  const initial = await bootSync();
  const stopped = await initial.health.sync('background');
  assert.equal(stopped.status === 'done' && stopped.result.kind, 'failed');
  assert.equal(initial.pending.getPending(owner), null, 'aucune publication avant persistance');
  refuseReceipt = false;
  const restarted = await bootSync();
  await restarted.health.sync('launch');
  assert.deepEqual(imports[1], imports[0]);
  assert.deepEqual((await boot()).getPending(owner), first);
});

test('nettoyage refusé : reçu durable, un seul bilan même après ACK et redémarrage', async () => {
  const owner = await login('A');
  refuseCleanup = true;
  const initial = await bootSync();
  await initial.health.sync('background');
  const restarted = await bootSync();
  assert.deepEqual(restarted.pending.getPending(owner), first);
  await restarted.health.sync('launch');
  const shown = restarted.pending.getPending(owner)!;
  assert.equal(restarted.pending.markPlayed(shown, owner), true);
  assert.equal(restarted.pending.getPending(owner), null, 'un seul reçu après deux réponses identiques');
  const afterAck = await bootSync();
  await afterAck.health.sync('launch');
  assert.equal(afterAck.pending.getPending(owner), null, 'le reçu joué reste dédoublonné');
  refuseCleanup = false;
  await afterAck.health.sync('manual');
  assert.equal(afterAck.pending.getPending(owner), null);
  assert.ok(imports.length >= 3);
  for (const replay of imports) assert.deepEqual(replay, imports[0]);
});

test('intention A incertaine, import B puis retour A : aucun corps ni reçu ne change de propriétaire', async () => {
  const ownerA = await login('A');
  const initial = await bootSync();
  loseReply = true;
  await initial.health.sync('background');
  const original = imports[0];
  await session.signOut();
  const ownerB = await login('B');
  loseReply = false;
  found = [{ ...workouts()[0], externalId: 'séance-B' }];
  const underB = await bootSync();
  await underB.health.sync('launch');
  assert.deepEqual(underB.pending.getPending(ownerB), second);
  assert.notEqual(imports[1].key, original.key);
  assert.notEqual(imports[1].body, original.body);
  assert.equal(initial.pending.getPending(ownerA), null);
  await session.signOut();
  const returnedA = await login('A');
  available = false;
  const returned = await bootSync();
  await returned.health.sync('launch');
  assert.deepEqual(imports[2], original);
  assert.deepEqual(returned.pending.getPending(returnedA), first);
  assert.equal(returned.pending.getPending(ownerB), null);
});

test('clé legacy sans propriétaire : conservée sans être reprise pour un nouveau compte', async () => {
  await login('A');
  const legacy = JSON.stringify({ key: 'ancienne-clé', fingerprint: '1:abcd' });
  keychain.set('grrind.sync.idempotency', legacy);
  await (await bootSync()).health.sync('background');
  assert.notEqual(imports[0].key, 'ancienne-clé');
  assert.equal(keychain.get('grrind.sync.idempotency'), legacy);
});

test('persistance de l’intention refusée : aucun envoi, puis reprise avec un corps durable', async () => {
  await login('A');
  refuseIntent = true;
  const stopped = await (await bootSync()).health.sync('background');
  assert.equal(stopped.status === 'done' && stopped.result.kind, 'failed');
  assert.equal(imports.length, 0);
  refuseIntent = false;
  await (await bootSync()).health.sync('launch');
  assert.equal(imports.length, 1);
});

test('intention illisible : aucun curseur ni nouveau corps et conservation du fichier', async () => {
  const owner = await login('A');
  const path = `documents/pending-import-${encodeURIComponent(owner.id)}.json`;
  disk.set(path, '{corrompu');
  const stopped = await (await bootSync()).health.sync('background');
  assert.equal(stopped.status === 'done' && stopped.result.kind, 'failed');
  assert.equal(requests.length, 0);
  assert.equal(disk.get(path), '{corrompu');
});

test('remplacement du reçu interrompu : ancien bilan conservé et nouveau reçu récupéré sans fusion', async () => {
  const owner = await login('A');
  const initial = await bootSync();
  initial.pending.enqueuePending(first, owner);
  responseForA = second;
  interruptReplacement = true;
  const stopped = await initial.health.sync('background');
  assert.equal(stopped.status === 'done' && stopped.result.kind, 'failed');
  const restarted = await bootSync();
  assert.deepEqual(restarted.pending.getPending(owner), first);
  interruptReplacement = false;
  await restarted.health.sync('launch');
  assert.deepEqual(imports[1], imports[0]);
  assert.equal(restarted.pending.markPlayed(restarted.pending.getPending(owner)!, owner), true);
  assert.deepEqual(restarted.pending.getPending(owner), second);
  assert.equal(restarted.pending.markPlayed(restarted.pending.getPending(owner)!, owner), true);
  assert.equal((await boot()).getPending(owner), null);
});

test('ACK refusé sur le disque : le bilan reste disponible et l’ACK peut être repris', async () => {
  const owner = await login('A');
  const initial = await bootSync();
  await initial.health.sync('background');
  const shown = initial.pending.getPending(owner)!;
  refuseReceipt = true;
  assert.equal(initial.pending.markPlayed(shown, owner), false);
  assert.equal(initial.pending.getPending(owner), shown);
  assert.deepEqual((await boot()).getPending(owner), first);
  refuseReceipt = false;
  assert.equal(initial.pending.markPlayed(shown, owner), true);
  assert.equal((await boot()).getPending(owner), null);
});

test('rejeu manuel du reçu durable : sollicite le bilan déjà en file sans le dupliquer', async () => {
  const owner = await login('A');
  refuseCleanup = true;
  const initial = await bootSync();
  await initial.health.sync('background');
  const shown = initial.pending.getPending(owner)!;
  assert.equal(initial.pending.wasSolicited(shown), false);
  await initial.health.sync('manual');
  assert.equal(initial.pending.getPending(owner), shown);
  assert.equal(initial.pending.wasSolicited(shown), true);
  assert.equal(initial.pending.markPlayed(shown, owner), true);
  assert.equal(initial.pending.getPending(owner), null);
});

test('reçu illisible : conserve l’intention et le fichier sans publier un bilan volatil', async () => {
  const owner = await login('A');
  const path = `documents/pending-reward-${encodeURIComponent(owner.id)}.json`;
  disk.set(path, '{reçu illisible');
  const initial = await bootSync();
  const stopped = await initial.health.sync('background');
  assert.equal(stopped.status === 'done' && stopped.result.kind, 'failed');
  assert.equal(initial.pending.getPending(owner), null);
  assert.equal(disk.get(path), '{reçu illisible');
  assert.ok(disk.has(`documents/pending-import-${encodeURIComponent(owner.id)}.json`));
});

test('réponse vide : aucun écran inventé, reçu identifié et intention libérée', async () => {
  const owner = await login('A');
  responseForA = { ...first, imported: [], skipped: [], totals: null };
  const initial = await bootSync();
  const outcome = await initial.health.sync('background');
  assert.equal(outcome.status === 'done' && outcome.result.kind, 'summary');
  assert.equal(initial.pending.getPending(owner), null);
  assert.equal(disk.has(`documents/pending-import-${encodeURIComponent(owner.id)}.json`), false);
  const stored = JSON.parse(disk.get(`documents/pending-reward-${encodeURIComponent(owner.id)}.json`)!);
  assert.equal(stored.importKey, imports[0].key);
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

for (const boundary of ['cursor', 'health', 'import'] as const) {
  test(`réponse A tardive (${boundary}) : aucun bilan ni résultat publié sous B`, async () => {
    const ownerA = await login('A');
    pending.enqueuePending(first, ownerA);
    const pause = hold();
    if (boundary === 'health') healthHold = pause;
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
