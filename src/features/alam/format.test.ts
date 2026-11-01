import assert from 'node:assert/strict';
import { it } from 'node:test';
import { probabilityPercent } from './format.ts';

it('formate toute la précision serveur sans confondre seuil et probabilité', () => {
  assert.equal(probabilityPercent(0), '0 %');
  assert.equal(probabilityPercent(1), '0,0001 %');
  assert.equal(probabilityPercent(550123), '55,0123 %');
  assert.equal(probabilityPercent(1000000), '100 %');
});
