import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import { createAuthMiddleware } from '@/api/authMiddleware.ts';
import { ACCEPT_LANGUAGE, createLanguageMiddleware } from '@/api/languageMiddleware.ts';
import type { paths } from '@/api/schema';
import { SPORTS_CATALOG } from './sportsFixtures.ts';

let response: unknown = SPORTS_CATALOG;
let status = 200;
let offline = false;
const requests: Request[] = [];
const api = createClient<paths>({ baseUrl: 'https://api.test', fetch: async input => {
  requests.push(input as Request);
  if (offline) throw new TypeError('offline');
  return Response.json(response, { status });
} });
api.use(createLanguageMiddleware());
api.use(createAuthMiddleware({ getAccessToken: () => 'sports-token', refresh: async () => null }));
mock.module(new URL('../../api/client.ts', import.meta.url), { namedExports: { api } });
mock.module('expo-router', { namedExports: { useIsFocused: () => true } });
mock.module(new URL('../auth/useAuth.ts', import.meta.url), { namedExports: { useAuth: () => ({ status: 'signedOut' }) } });
const { sportsCatalogOptions } = await import('./useSportsCatalog.ts');
const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
beforeEach(() => { response = SPORTS_CATALOG; status = 200; offline = false; requests.length = 0; });

it('lit le catalogue authentifié dans la langue de l’app et conserve toutes les valeurs serveur', async () => {
  const client = makeClient();
  try {
    response = { ...SPORTS_CATALOG, revision: 9, disciplines: [{ ...SPORTS_CATALOG.disciplines[0], baseXp: 79 }] };
    assert.deepEqual(await client.fetchQuery(sportsCatalogOptions('player')), response);
    assert.equal(requests[0].url, 'https://api.test/api/sports');
    assert.equal(requests[0].method, 'GET');
    assert.equal(requests[0].headers.get('Authorization'), 'Bearer sports-token');
    assert.equal(requests[0].headers.get('Accept-Language'), ACCEPT_LANGUAGE);
    assert.equal(requests[0].cache, 'no-cache');
  } finally { client.clear(); }
});

it('revalide à chaque ouverture, même si seul un nom traduit a changé', async () => {
  const client = makeClient();
  const options = sportsCatalogOptions('player');
  const observer = new QueryObserver(client, options);
  const stop = observer.subscribe(() => {});
  try {
    await observer.refetch();
    observer.setOptions({ ...options, enabled: false });
    response = { ...SPORTS_CATALOG, disciplines: [{ ...SPORTS_CATALOG.disciplines[0], name: 'Nouveau libellé' }] };
    observer.setOptions(options);
    await client.fetchQuery(options);
    assert.equal(requests.length, 2);
    assert.equal(observer.getCurrentResult().data?.disciplines[0].name, 'Nouveau libellé');
    assert.notDeepEqual(options.queryKey, sportsCatalogOptions('another-player').queryKey);
  } finally { stop(); client.clear(); }
});

it('distingue attente de session, chargement, catalogue vide, panne et retry', async () => {
  const client = makeClient();
  const observer = new QueryObserver(client, sportsCatalogOptions(null));
  const stop = observer.subscribe(() => {});
  try {
    assert.equal(requests.length, 0);
    assert.equal(observer.getCurrentResult().data, undefined);
    response = { ...SPORTS_CATALOG, disciplines: [] };
    observer.setOptions(sportsCatalogOptions('player'));
    assert.equal(observer.getCurrentResult().isPending, true);
    await observer.refetch();
    assert.deepEqual(observer.getCurrentResult().data?.disciplines, []);
    offline = true;
    await observer.refetch();
    assert.deepEqual(observer.getCurrentResult().error, { kind: 'offline' });
    offline = false; response = SPORTS_CATALOG;
    await observer.refetch();
    assert.equal(observer.getCurrentResult().isSuccess, true);
    assert.deepEqual(observer.getCurrentResult().data, SPORTS_CATALOG);
    status = 401;
    response = { type: 'https://grrind.app/problems/access-token-missing', status, title: 'Unauthorized', detail: 'Authentication required' };
    await observer.refetch();
    assert.equal(observer.getCurrentResult().error?.kind, 'problem');
  } finally { stop(); client.clear(); }
});
