import assert from 'node:assert/strict';
import { it } from 'node:test';
import createClient from 'openapi-fetch';
import type { components, paths } from '@/api/schema';
import { createActionKeys } from '../shop/actionKeys.ts';
import { createAlamPreferences, preferenceMessage } from './preferences.ts';

function harness() {
  let disk: Record<string, string> = {};
  let minted = 0;
  const observed: { path: string; method: string; key: string | null; body: unknown }[] = [];
  let status = 200;
  let problem: components['schemas']['ProblemDetails']['type'] = 'https://grrind.app/problems/alam-difficulty-closed';
  const response = { registered: true, canChooseDifficulty: false, current: { difficulty: 'HARD' } };
  const storage = { read: async () => disk, write: async (value: Record<string, string>) => { disk = value; }, mint: () => `key-${++minted}` };
  const client = createClient<paths>({ baseUrl: 'https://example.test', fetch: async (request) => {
    observed.push({ path: new URL(request.url).pathname, method: request.method,
      key: request.headers.get('Idempotency-Key'), body: await request.json() });
    if (status === 0) throw new Error('response lost');
    return new Response(JSON.stringify(status === 200 ? response : { type: problem, title: 'Refus', status, detail: 'Refus' }),
      { status, headers: { 'Content-Type': status === 200 ? 'application/json' : 'application/problem+json' } });
  } });
  return { observed, response, boot: () => createAlamPreferences(createActionKeys(storage), client),
    refuse: (code: number, type?: typeof problem) => { status = code; if (type) problem = type; } };
}
const scope = { playerId: 'one', guildId: 'guild', membershipJoinedAt: '2026-10-25T20:00:00+01:00' };

it('envoie les PUT exacts, garde la clé après fermeture et distingue les intentions', async () => {
  const h = harness();
  h.refuse(0);
  const first = h.boot();
  await Promise.all([first.register({ ...scope, registered: true }), first.register({ ...scope, registered: true })]);
  assert.equal(h.observed.length, 1);
  const restored = h.boot();
  h.refuse(200);
  const result = await restored.register({ ...scope, registered: true });
  assert.deepEqual(result, { kind: 'done', data: h.response });
  assert.deepEqual(h.observed[0], { path: '/api/guild/alam/registration', method: 'PUT', key: 'key-1', body: { registered: true } });
  assert.equal(h.observed[1].key, 'key-1');
  await restored.register({ ...scope, registered: false });
  await restored.register({ ...scope, registered: true });
  await restored.choose({ ...scope, runId: 'week', difficulty: 'HARD' });
  assert.deepEqual(h.observed.at(-1), { path: '/api/guild/alam/difficulty', method: 'PUT', key: 'key-4', body: { difficulty: 'HARD' } });
  assert.deepEqual(h.observed.map(entry => entry.key), ['key-1', 'key-1', 'key-2', 'key-3', 'key-4']);
});

it('isole compte, guilde, réadhésion, édition et difficulté après une réponse perdue', async () => {
  const h = harness(); h.refuse(0);
  const input = { ...scope, runId: 'week', difficulty: 'HARD' as const };
  await h.boot().choose(input);
  const restored = h.boot();
  await restored.choose(input);
  await restored.choose({ ...input, playerId: 'two' });
  await restored.choose({ ...input, guildId: 'other' });
  await restored.choose({ ...input, runId: 'next-week' });
  await restored.choose({ ...input, difficulty: 'EASY' });
  await restored.choose({ ...input, membershipJoinedAt: '2026-11-01T10:00:00+01:00' });
  assert.deepEqual(h.observed.map(entry => entry.key), ['key-1', 'key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6']);
});

it('libère les refus définitifs 403/409/404/422 et conserve une opération en cours', async () => {
  for (const [status, type] of [
    [403, 'alam-difficulty-forbidden'], [409, 'alam-difficulty-closed'],
    [404, 'guild-not-found'], [422, 'validation-failed'], [409, 'idempotency-key-reused'],
    [409, 'idempotency-key-in-flight'],
  ] as const) {
    const h = harness(); h.refuse(status, `https://grrind.app/problems/${type}`);
    const input = { ...scope, runId: 'week', difficulty: 'HARD' as const };
    const result = await h.boot().choose(input);
    assert.equal(result.kind, 'refused');
    if (result.kind === 'refused') assert.doesNotMatch(preferenceMessage(result.failure), /Erreur inattendue/);
    h.refuse(200);
    await h.boot().choose(input);
    assert.equal(h.observed[1].key, type === 'idempotency-key-in-flight' ? 'key-1' : 'key-2');
  }
});
