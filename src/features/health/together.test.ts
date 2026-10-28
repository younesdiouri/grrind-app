import assert from 'node:assert/strict';
import { test } from 'node:test';
import { togetherGroups, togetherLabel, type TogetherStatus } from './together.ts';

test('le bilan sépare les multiplicateurs et additionne uniquement les valeurs serveur', () => {
  const two: TogetherStatus = { status: 'VERIFIED', playerCount: 2, multiplier: 2, soloXp: 100, bonusXp: 17, totalXp: 117, rulesetVersion: 'pilot' };
  const four: TogetherStatus = { ...two, playerCount: 4, multiplier: 4, bonusXp: 999, totalXp: 1099 };
  const groups = togetherGroups([two, four, two, undefined]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].together.bonusXp, 34);
  assert.equal(groups[0].count, 2);
  assert.match(togetherLabel(groups[1].together), /×4 · 4\+ joueurs · \+999 XP/);
  assert.equal(two.bonusXp, 17);
  for (const status of ['PENDING', 'INSUFFICIENT_EVIDENCE', 'UNAVAILABLE'] as const) {
    assert.doesNotMatch(togetherLabel({ ...two, status }), /solo|×2/);
  }
});
