import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import createClient from 'openapi-fetch';
import type { paths } from '@/api/schema';
import { LEAGUE_FIXTURE } from './leagueFixtures.ts';

let request: Request;
let offline = false;
let denied = false;
const api = createClient<paths>({ baseUrl: 'https://api.test', fetch: async input => {
  request = input as Request;
  if (offline) throw new TypeError('offline');
  return denied ? Response.json({ type: 'https://grrind.app/problems/access-token-missing', title: 'Unauthorized', detail: 'Authentication required', status: 401 }, { status: 401 })
    : Response.json(LEAGUE_FIXTURE);
} });
mock.module(new URL('../../api/client.ts', import.meta.url), { namedExports: { api } });
const { fetchLeague } = await import('./api.ts');

test('GET league est personnel, sans id ni calcul des valeurs du serveur', async () => {
  assert.deepEqual(await fetchLeague(), LEAGUE_FIXTURE);
  assert.equal(request.method, 'GET');
  assert.equal(request.url, 'https://api.test/api/league');
  denied = true;
  await assert.rejects(fetchLeague, error => (error as { kind: string }).kind === 'problem');
  denied = false;
  offline = true;
  await assert.rejects(fetchLeague, error => (error as { kind: string }).kind === 'offline');
});
