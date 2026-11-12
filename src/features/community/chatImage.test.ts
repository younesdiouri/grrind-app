import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import createClient from 'openapi-fetch';

import { createAuthMiddleware } from '@/api/authMiddleware';
import type { paths } from '@/api/schema';

const pixels = new Uint8Array([82, 73, 70, 70]);
const requests: Request[] = [];
let mode: 'image' | 'denied' | 'offline' = 'image';
const api = createClient<paths>({ baseUrl: 'https://api.test', fetch: async input => {
  requests.push(input as Request);
  if (mode === 'offline') throw new TypeError('offline');
  if (mode === 'denied') return Response.json({
    type: 'https://grrind.app/problems/guild-not-found', title: 'Not found', detail: 'Guild not found', status: 404,
  }, { status: 404 });
  return new Response(pixels, { headers: { 'Content-Type': 'image/webp' } });
} });
api.use(createAuthMiddleware({ getAccessToken: () => 'photo-token', refresh: async () => null }));
mock.module(new URL('../../api/client.ts', import.meta.url), { namedExports: { api } });
const { readChatImage } = await import('./chatImage.ts');

beforeEach(() => { mode = 'image'; requests.length = 0; });

test('charge les pixels privés avec authentification et sans cache HTTP, sans exposer une URL réseau au rendu', async () => {
  const result = await readChatImage('guild', 'photo', new AbortController().signal);
  assert.deepEqual(result, { ok: true, data: `data:image/webp;base64,${Buffer.from(pixels).toString('base64')}` });
  const request = requests[0];
  assert.equal(request.url, 'https://api.test/api/guilds/guild/chat/messages/photo/image');
  assert.equal(request.headers.get('Authorization'), 'Bearer photo-token');
  assert.equal(request.headers.get('Cache-Control'), 'no-store');
});

test('un refus de guilde reste une erreur exploitable pour fermer le périmètre privé', async () => {
  mode = 'denied';
  const result = await readChatImage('guild', 'photo', new AbortController().signal);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('Aucun pixel attendu');
  assert.equal(result.error.failure.kind, 'problem');
  if (result.error.failure.kind === 'problem') assert.equal(result.error.failure.problem.type, 'https://grrind.app/problems/guild-not-found');
});

test('une coupure réseau peut être réessayée avec le même chargement authentifié', async () => {
  mode = 'offline';
  assert.deepEqual(await readChatImage('guild', 'photo', new AbortController().signal), {
    ok: false, error: { failure: { kind: 'offline' }, retryAt: 0 },
  });
  mode = 'image';
  assert.equal((await readChatImage('guild', 'photo', new AbortController().signal)).ok, true);
});
