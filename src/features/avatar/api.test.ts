import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import createClient from 'openapi-fetch';
import type { paths } from '@/api/schema';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar.ts';

let response: unknown;
let status = 200;
let offline = false;
let request: Request;
const api = createClient<paths>({ baseUrl: 'https://api.test', fetch: async input => {
  request = input as Request;
  if (offline) throw new TypeError('network unavailable');
  return Response.json(response, { status });
} });
mock.module(new URL('../../api/client.ts', import.meta.url), { namedExports: { api } });
const { fetchAvatarCatalog, saveAvatar } = await import('./api.ts');

beforeEach(() => { response = { id: 'qa', avatar: DEFAULT_AVATAR }; status = 200; offline = false; });

test('la sauvegarde envoie un avatar complet et exclut les objets ainsi que les autres champs du profil', async () => {
  const draft = { ...DEFAULT_AVATAR, eyeColor: 'green' as const, boxingGloves: true };
  const before = structuredClone(draft);
  response = { id: 'qa', avatar: { ...DEFAULT_AVATAR, eyeColor: 'green' } };
  const result = await saveAvatar(draft);
  assert.equal(result.ok, true);
  assert.equal(request.method, 'PATCH');
  assert.equal(new URL(request.url).pathname, '/api/me');
  assert.deepEqual(await request.json(), { displayName: null, timezone: null, locale: null, appearance: null,
    notificationPreferences: [], avatar: { ...DEFAULT_AVATAR, eyeColor: 'green' } });
  assert.deepEqual(draft, before);
});

test('un refus serveur conserve le brouillon et rend une erreur structurée', async () => {
  const draft = { ...DEFAULT_AVATAR, noseStyle: 'original' as const };
  const before = structuredClone(draft);
  status = 422;
  response = { type: 'https://grrind.app/problems/validation-failed', title: 'Invalid', status,
    detail: 'Invalid avatar', violations: [{ field: 'avatar.noseStyle', message: 'Choix incompatible.' }] };
  const result = await saveAvatar(draft);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'problem');
  assert.deepEqual(draft, before);
});

test('une erreur réseau garde le brouillon et permet de renvoyer les mêmes choix', async () => {
  const draft = { ...DEFAULT_AVATAR, hairStyle: 'buzzed' as const };
  offline = true;
  assert.deepEqual(await saveAvatar(draft), { ok: false, failure: { kind: 'offline' } });
  assert.equal(draft.hairStyle, 'buzzed');
  offline = false;
  response = { id: 'qa', avatar: draft };
  const result = await saveAvatar(draft);
  assert.equal(result.ok, true);
  assert.deepEqual((await request.json()).avatar, draft);
});

test('le catalogue se lit sur sa route dédiée et ses pannes sont structurées', async () => {
  response = { version: 1, default: DEFAULT_AVATAR, options: {}, headwear: { slot: 'HEAD', options: [] } };
  const result = await fetchAvatarCatalog();
  assert.equal(result.version, 1);
  assert.equal(request.method, 'GET');
  assert.equal(new URL(request.url).pathname, '/api/avatar-catalog');
  offline = true;
  await assert.rejects(fetchAvatarCatalog, error => (error as { kind: string }).kind === 'offline');
});
