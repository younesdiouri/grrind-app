import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPreviewCache, PREVIEW_CACHE_BYTES, PREVIEW_CACHE_ENTRIES } from './previewCache.ts';

test('sérialise Unity et partage une capture entre les demandes de la même configuration', async () => {
  let running = 0;
  const calls: string[] = [];
  const cache = createPreviewCache(async key => {
    assert.equal(running++, 0);
    calls.push(key);
    await new Promise(resolve => setTimeout(resolve, 1));
    running--;
    return `image:${key}`;
  });
  assert.deepEqual(await Promise.all(['a', 'a', 'b'].map(key => cache.request(key, () => true))), ['image:a', 'image:a', 'image:b']);
  assert.deepEqual(calls, ['a', 'b']);
  assert.equal(await cache.request('a', () => true), 'image:a');
  assert.deepEqual(calls, ['a', 'b']);
});

test('annule les demandes en attente et ignore une réponse obsolète tout en gardant la capture réutilisable', async () => {
  let active = true;
  let finish!: (value: string) => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const calls: string[] = [];
  const cache = createPreviewCache(key => {
    calls.push(key); started();
    return new Promise(resolve => { finish = resolve; });
  });
  const first = cache.request('old', () => active);
  const cancelled = cache.request('offscreen', () => active);
  await began;
  active = false;
  finish('old-image');
  assert.equal(await first, undefined);
  assert.equal(await cancelled, undefined);
  assert.equal(await cache.request('old', () => true), 'old-image');
  assert.deepEqual(calls, ['old']);
});

test('conserve une guilde complète, évince la moins récemment utilisée et borne les octets base64', async () => {
  const calls: string[] = [];
  const cache = createPreviewCache(async key => { calls.push(key); return key; });
  for (let i = 0; i < PREVIEW_CACHE_ENTRIES; i++) await cache.request(String(i), () => true);
  await cache.request('0', () => true);
  await cache.request('next', () => true);
  assert.equal(cache.get('0'), '0');
  assert.equal(cache.get('1'), undefined);
  assert.equal(calls.length, PREVIEW_CACHE_ENTRIES + 1);
  const large = createPreviewCache(async key => key + 'x'.repeat(PREVIEW_CACHE_BYTES / 2 - 1));
  await large.request('a', () => true);
  await large.request('b', () => true);
  assert.equal(large.get('a'), undefined);
  assert.ok(large.get('b'));
});

test('un échec ne bloque pas la file et une image invalide peut être régénérée', async () => {
  let failed = false;
  const cache = createPreviewCache(async key => {
    if (!failed) { failed = true; throw new Error('Unavailable'); }
    return key;
  });
  await assert.rejects(cache.request('a', () => true), /Unavailable/);
  assert.equal(await cache.request('a', () => true), 'a');
  cache.delete('a');
  assert.equal(cache.get('a'), undefined);
  assert.equal(await cache.request('a', () => true), 'a');
});
