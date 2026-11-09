import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCountdown, gaugeGlow, gaugeOf, priorityOf } from './week.ts';

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

describe('gaugeGlow', () => {
  it('reste éteint loin du but et chauffe de plus en plus vite', () => {
    assert.equal(gaugeGlow(0.2, false), 0);
    const mid = gaugeGlow(0.65, false);
    const near = gaugeGlow(0.95, false);
    assert.ok(mid > 0 && near > mid * 2);
  });
  it('brille à plein une fois chargée', () => {
    assert.equal(gaugeGlow(1, true), 1);
  });
});

describe('priorityOf', () => {
  it('désigne la jauge non chargée la plus proche du but', () => {
    assert.equal(
      priorityOf([gaugeOf(50, 37), gaugeOf(31, 46), gaugeOf(27, 55), gaugeOf(10, 46)]),
      1,
    );
  });
  it('ne désigne rien sans référence ni quand tout est chargé', () => {
    assert.equal(priorityOf([gaugeOf(5, null)]), null);
    assert.equal(priorityOf([gaugeOf(50, 37)]), null);
  });
});
