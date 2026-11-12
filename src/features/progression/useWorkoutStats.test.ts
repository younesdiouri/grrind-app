import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import type { paths } from '@/api/schema';
import { createAuthMiddleware } from '@/api/authMiddleware.ts';
import type { Failure } from '@/features/auth/problems';
import type { WorkoutStats } from './workoutStats';
import { EMPTY_STATS, WEEK_STATS } from './workoutStatsFixtures.ts';

let response: unknown = WEEK_STATS;
let status = 200;
let offline = false;
const requests: Request[] = [];
const api = createClient<paths>({ baseUrl: 'https://api.test', fetch: async input => {
  requests.push(input as Request);
  if (offline) throw new TypeError('network unavailable');
  return Response.json(response, { status });
} });
api.use(createAuthMiddleware({ getAccessToken: () => 'stats-token', refresh: async () => null }));
mock.module(new URL('../../api/client.ts', import.meta.url), { namedExports: { api } });
mock.module('expo-router', { namedExports: { useIsFocused: () => true } });
mock.module(new URL('../auth/useAuth.ts', import.meta.url), { namedExports: { useAuth: () => ({ status: 'signedOut' }) } });
mock.module(new URL('../health/sync.ts', import.meta.url), { namedExports: { getSettledRevision: () => 0, subscribeToSync: () => () => {} } });
const { workoutStatsOptions } = await import('./useWorkoutStats.ts');

const user = { id: 'player-one', timezone: 'Europe/Paris' };
const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
beforeEach(() => { response = WEEK_STATS; status = 200; offline = false; requests.length = 0; });

it('lit une seule réponse authentifiée par période, sans liste brute ni recalcul des valeurs', async () => {
  const client = makeClient();
  try {
    for (const period of ['week', 'month', 'year'] as const) {
      response = { ...WEEK_STATS, period, current: { seconds: 9999, sessions: 42, activeDays: 7, averageSeconds: 2222 }, grade: 'D', change: 77 };
      assert.deepEqual(await client.fetchQuery(workoutStatsOptions(user, period, 0)), response);
      const request = requests.at(-1)!;
      assert.equal(request.method, 'GET');
      assert.equal(request.url, `https://api.test/api/workouts/stats?period=${period}`);
      assert.equal(request.headers.get('Authorization'), 'Bearer stats-token');
    }
    assert.equal(requests.length, 3);
  } finally { client.clear(); }
});

it('réutilise le cache et relit après synchro, changement de période, de compte ou de fuseau', async () => {
  const client = makeClient();
  const read = (who = user, period: 'week' | 'month' = 'week', revision = 0) =>
    client.fetchQuery({ ...workoutStatsOptions(who, period, revision), staleTime: Infinity });
  try {
    await read(); await read();
    assert.equal(requests.length, 1);
    response = { ...WEEK_STATS, change: 81 };
    assert.equal((await read(user, 'week', 1)).change, 81);
    await read(user, 'month', 1);
    await read({ ...user, id: 'player-two' });
    await read({ ...user, timezone: 'Asia/Tokyo' });
    assert.equal(requests.length, 5);
  } finally { client.clear(); }
});

it('distingue chargement, réponse vide, erreur et retry sans remplacer une absence par des zéros', async () => {
  const client = makeClient();
  const observer = new QueryObserver(client, workoutStatsOptions(null, 'week', 0));
  const stop = observer.subscribe(() => {});
  try {
    assert.equal(requests.length, 0);
    assert.equal(observer.getCurrentResult().data, undefined);
    response = EMPTY_STATS;
    observer.setOptions(workoutStatsOptions(user, 'week', 0));
    assert.equal(observer.getCurrentResult().isPending, true);
    await observer.refetch();
    assert.deepEqual(observer.getCurrentResult().data, EMPTY_STATS);
    offline = true;
    observer.setOptions(workoutStatsOptions(user, 'month', 0));
    assert.equal(observer.getCurrentResult().data, undefined);
    await observer.refetch();
    assert.equal(observer.getCurrentResult().isError, true);
    assert.deepEqual(observer.getCurrentResult().error, { kind: 'offline' });
    assert.equal(observer.getCurrentResult().data, undefined);
    offline = false; response = { ...WEEK_STATS, period: 'month' };
    await observer.refetch();
    assert.equal(observer.getCurrentResult().isSuccess, true);
    assert.deepEqual(observer.getCurrentResult().data, response);
  } finally { stop(); client.clear(); }
});

it('remonte un refus serveur structuré et permet sa relecture', async () => {
  const client = makeClient();
  try {
    status = 503;
    response = { type: 'https://grrind.app/problems/service-unavailable', status, title: 'Unavailable', detail: 'Retry' };
    await assert.rejects(client.fetchQuery(workoutStatsOptions(user, 'week', 0)), error => (error as { kind: string }).kind === 'problem');
    status = 200; response = WEEK_STATS;
    assert.deepEqual(await client.fetchQuery(workoutStatsOptions(user, 'week', 0)), WEEK_STATS);
  } finally { client.clear(); }
});

it('relit au retour sur écran même lorsque les clés de période sont identiques', async () => {
  const client = makeClient();
  const options = workoutStatsOptions(user, 'week', 0);
  const observer = new QueryObserver(client, options);
  const stop = observer.subscribe(() => {});
  try {
    await observer.refetch();
    observer.setOptions({ ...options, enabled: false });
    response = { ...WEEK_STATS, change: 90 };
    observer.setOptions(options);
    await client.fetchQuery(options);
    assert.equal(requests.length, 2);
    assert.equal(observer.getCurrentResult().data?.change, 90);
  } finally { stop(); client.clear(); }
});

it('programme la relecture sur observedEnd serveur, y compris minuit japonais et DST', () => {
  const client = makeClient();
  const options = workoutStatsOptions(user, 'week', 0);
  const now = mock.method(Date, 'now', () => Date.parse('2026-11-11T14:59:00Z'));
  try {
    client.setQueryData(options.queryKey, { ...WEEK_STATS, timezone: 'Asia/Tokyo', observedEnd: '2026-11-12T00:00:00+09:00' });
    const query = client.getQueryCache().find<WorkoutStats, Failure>({ queryKey: options.queryKey })!;
    assert.equal(typeof options.refetchInterval, 'function');
    if (typeof options.refetchInterval !== 'function') return;
    assert.equal(options.refetchInterval(query), 60_000);
    now.mock.mockImplementation(() => Date.parse('2026-10-24T22:00:00Z'));
    client.setQueryData(options.queryKey, { ...WEEK_STATS, observedEnd: '2026-10-26T00:00:00+01:00' });
    assert.equal(options.refetchInterval(query), 25 * 3600_000);
  } finally { now.mock.restore(); client.clear(); }
});
