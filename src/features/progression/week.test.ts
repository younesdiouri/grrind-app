import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCountdown, gaugeOf } from './week.ts';

describe('gaugeOf', () => {
  it('ne fixe aucune cible sans semaine précédente', () => {
    assert.deepEqual(gaugeOf(120, null), { fill: 0, beaten: false, remaining: null });
  });

  it('se remplit vers la semaine dernière et dit ce qui reste', () => {
    assert.deepEqual(gaugeOf(30, 120), { fill: 0.25, beaten: false, remaining: 90 });
  });

  it('plafonne le remplissage mais dit le débordement', () => {
    assert.deepEqual(gaugeOf(150, 120), { fill: 1, beaten: true, remaining: 0 });
  });

  it('une carac à zéro la semaine dernière est battue au premier point', () => {
    assert.deepEqual(gaugeOf(5, 0), { fill: 1, beaten: true, remaining: 0 });
    assert.deepEqual(gaugeOf(0, 0), { fill: 0, beaten: false, remaining: 0 });
  });
});

describe('formatCountdown', () => {
  const now = new Date('2026-11-08T10:00:00Z');
  it('compte en jours, heures puis minutes', () => {
    assert.equal(formatCountdown('2026-11-10T15:30:00Z', now), '2 j 5 h');
    assert.equal(formatCountdown('2026-11-08T13:05:00Z', now), '3 h 05');
    assert.equal(formatCountdown('2026-11-08T10:12:00Z', now), '12 min');
  });
  it('ne descend pas sous zéro', () => {
    assert.equal(formatCountdown('2026-11-08T09:00:00Z', now), '0 min');
  });
});
