import assert from 'node:assert/strict';
import { it } from 'node:test';
import { raidMembers } from './presentation.ts';

it('ordonne les membres par contribution sans modifier le snapshot serveur', () => {
  const members = Array.from({ length: 7 }, (_, index) => ({ playerId: String(index), displayName: `Membre ${index}`, contribution: index }));
  const original = structuredClone(members);
  const result = raidMembers(members);
  assert.deepEqual(result.map((member) => member.id), ['6', '5', '4', '3', '2', '1', '0']);
  assert.equal(result[0].name, 'Membre 6');
  assert.deepEqual(members, original);
});
