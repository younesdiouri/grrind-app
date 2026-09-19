import assert from 'node:assert/strict';
import { it } from 'node:test';
import { craftingWasRefused } from './refusal.ts';
import { messageFor, type Failure } from '../auth/problems.ts';

it('libère uniquement un refus métier certain, jamais une panne après débit possible', () => {
  const insufficient: Failure = { kind: 'problem', problem: { type: 'https://grrind.app/problems/insufficient-crafting-resources', title: 'Insufficient', status: 422, detail: 'No resources' } };
  assert.equal(craftingWasRefused(insufficient), true);
  assert.match(messageFor(insufficient), /ressources/);
  assert.equal(craftingWasRefused({ kind: 'offline' }), false);
  assert.equal(craftingWasRefused({ kind: 'problem', problem: { type: 'https://grrind.app/problems/internal-error', title: 'Error', status: 500, detail: 'Unknown' } }), false);
});
