import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendPrivateEvidence } from './privateEvidence.ts';

test('la preuve reprend le même lot après le refresh partagé sans toucher à la clé santé', async () => {
  const tokens: string[] = [];
  let sends = 0;
  let refreshes = 0;
  let currentToken = 'old';
  await sendPrivateEvidence({ current: () => true, token: () => currentToken,
    refresh: async (stale, problem) => { assert.equal(stale, 'old'); assert.deepEqual(problem, { type: 'expired', detail: '' }); refreshes += 1; currentToken = 'new'; return currentToken; },
    send: async (token) => { tokens.push(token); sends += 1;
      return sends === 1 ? { status: 401, batchId: 'stable', problemType: 'expired' }
        : sends === 2 ? { status: 200, batchId: 'stable' } : { status: 204, batchId: null }; } });
  assert.equal(refreshes, 1);
  assert.deepEqual(tokens, ['old', 'new', 'new']);
});

test('une panne ou un refus ne boucle pas et un changement de compte interdit le refresh', async () => {
  let active = true;
  let refreshes = 0;
  await sendPrivateEvidence({ current: () => active, token: () => 'token', refresh: async () => { refreshes += 1; return 'new'; },
    send: async () => { active = false; return { status: 401, batchId: 'stable' }; } });
  assert.equal(refreshes, 0);
  let sends = 0;
  await assert.rejects(sendPrivateEvidence({ current: () => true, token: () => 'token', refresh: async () => 'new',
    send: async () => { sends += 1; return { status: 409, batchId: 'stable' }; } }));
  assert.equal(sends, 1);
});
