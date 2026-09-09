import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeMessages, retryAfterMs, type ChatMessage } from './chatState.ts';

const message = (cursor: string): ChatMessage => ({
  id: cursor, cursor, clientId: cursor, authorId: 'author', text: cursor,
  createdAt: '2026-09-09T12:00:00Z', imageUrl: null,
});

test('fusionne historique et rattrapage sans doublon, au-delà de la précision numérique', () => {
  const old = message('9007199254740992');
  const next = message('9007199254740993');
  assert.deepEqual(mergeMessages([next], [old, next]), [old, next]);
});

test('respecte Retry-After en secondes et en date, sans délai négatif', () => {
  assert.equal(retryAfterMs('60', 0), 60_000);
  assert.equal(retryAfterMs('Thu, 01 Jan 1970 00:01:00 GMT', 1000), 59_000);
  assert.equal(retryAfterMs('-1', 1000), 0);
  assert.equal(retryAfterMs(null, 1000), 0);
});
