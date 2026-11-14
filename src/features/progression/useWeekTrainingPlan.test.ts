import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import type { paths } from '@/api/schema';
import { createAuthMiddleware } from '@/api/authMiddleware.ts';
import { TRAINING_WEEK } from './weekTrainingFixtures.ts';

let response: unknown = TRAINING_WEEK;
let offline = false;
const requests: Request[] = [];
const api = createClient<paths>({ baseUrl: 'https://api.test', fetch: async input => {
  requests.push(input as Request);
  if (offline) throw new TypeError('offline');
  return Response.json(response);
} });
api.use(createAuthMiddleware({ getAccessToken: () => 'training-token', refresh: async () => null }));
mock.module(new URL('../../api/client.ts', import.meta.url), { namedExports: { api } });
mock.module('expo-router', { namedExports: { useIsFocused: () => true } });
mock.module(new URL('../auth/useAuth.ts', import.meta.url), { namedExports: { useAuth: () => ({ status: 'signedOut' }) } });
mock.module(new URL('../health/sync.ts', import.meta.url), { namedExports: { getSettledRevision: () => 0, subscribeToSync: () => () => {} } });
const { weekTrainingPlanOptions, watchTrainingPlanExpiry } = await import('./useWeekTrainingPlan.ts');
const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
beforeEach(() => { response = TRAINING_WEEK; offline = false; requests.length = 0; });

it('lit tous les choix authentifiés sans recalcul ni fallback sur trainingPlan', async () => {
  const client = makeClient();
  try {
    assert.deepEqual(await client.fetchQuery(weekTrainingPlanOptions('player', 0, 0)), TRAINING_WEEK);
    assert.equal(requests[0].url, 'https://api.test/api/progression/week');
    assert.equal(requests[0].headers.get('Authorization'), 'Bearer training-token');
    response = { ...TRAINING_WEEK, trainingPlans: [] };
    assert.deepEqual((await client.fetchQuery(weekTrainingPlanOptions('player', 0, 0))).trainingPlans, []);
  } finally { client.clear(); }
});

it('revalide à l’ouverture, après synchro, retour premier plan et changement de compte', async () => {
  const client = makeClient();
  const options = weekTrainingPlanOptions('player', 0, 0);
  const observer = new QueryObserver(client, options);
  const stop = observer.subscribe(() => {});
  try {
    await observer.refetch();
    observer.setOptions({ ...options, enabled: false });
    response = { ...TRAINING_WEEK, trainingPlans: [] };
    observer.setOptions(options);
    await client.fetchQuery(options);
    assert.equal(requests.length, 2);
    assert.deepEqual(observer.getCurrentResult().data?.trainingPlans, []);
    await client.fetchQuery(weekTrainingPlanOptions('player', 1, 0));
    await client.fetchQuery(weekTrainingPlanOptions('player', 1, 1));
    await client.fetchQuery(weekTrainingPlanOptions('another-player', 1, 1));
    assert.equal(requests.length, 5);
  } finally { stop(); client.clear(); }
});

it('expose chargement, erreur et retry séparément d’une réponse sans suggestion', async () => {
  const client = makeClient();
  const observer = new QueryObserver(client, weekTrainingPlanOptions(null, 0, 0));
  const stop = observer.subscribe(() => {});
  try {
    assert.equal(requests.length, 0);
    observer.setOptions(weekTrainingPlanOptions('player', 0, 0));
    assert.equal(observer.getCurrentResult().isPending, true);
    await observer.refetch();
    offline = true;
    await observer.refetch();
    assert.deepEqual(observer.getCurrentResult().error, { kind: 'offline' });
    offline = false;
    response = { ...TRAINING_WEEK, trainingPlans: [] };
    await observer.refetch();
    assert.equal(observer.getCurrentResult().isSuccess, true);
    assert.deepEqual(observer.getCurrentResult().data?.trainingPlans, []);
  } finally { stop(); client.clear(); }
});

it('relit une fois à l’expiration serveur, annule en quittant l’écran et ne boucle pas sur un plan périmé', () => {
  const expiresAt = TRAINING_WEEK.trainingPlans[0].expiresAt;
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.parse(expiresAt) - 1000 });
  let reads = 0;
  try {
    const stop = watchTrainingPlanExpiry(expiresAt, () => { reads++; });
    mock.timers.tick(999);
    assert.equal(reads, 0);
    mock.timers.tick(1);
    assert.equal(reads, 1);
    stop?.();
    watchTrainingPlanExpiry(expiresAt, () => { reads++; });
    mock.timers.tick(5000);
    assert.equal(reads, 1);
    const cancel = watchTrainingPlanExpiry(new Date(Date.now() + 1000).toISOString(), () => { reads++; });
    cancel?.();
    mock.timers.tick(1000);
    assert.equal(reads, 1);
  } finally { mock.timers.reset(); }
});
