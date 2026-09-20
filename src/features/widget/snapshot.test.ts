import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SNAPSHOT_VERSION, snapshotFrom, type Progression } from './snapshot.ts';

/**
 * Ce banc garde ce qui ne se voit pas sur un appareil : un widget se relit sur l'écran
 * d'accueil de quelqu'un d'autre, parfois des heures après, et une barre fausse au niveau
 * maximum ne se reproduit pas à la demande.
 */

const NOW = new Date('2026-09-19T15:00:00.000Z');

function progression(overrides: Partial<Progression> = {}): Progression {
  return {
    level: 12,
    totalXp: 24_500,
    xpIntoLevel: 340,
    xpToNextLevel: 660,
    skillPoints: { earned: 12, available: 12 },
    attributes: { strength: 5108, endurance: 3200, mobility: 900, dexterity: 1500, vitality: 310 },
    vitalityBreakdown: { windowAverageActiveKcal: 420, targetActiveKcal: 500, bonusPermille: 168 },
    activeTitle: null,
    unlockedTitles: [],
    rulesetVersion: 'v1-3142b8933',
    lastProgressionAt: '2026-09-19T08:12:00+00:00',
    ...overrides,
  };
}

describe("l'instantané du widget", () => {
  it('remplit la barre à la fraction du palier en cours', () => {
    const snapshot = snapshotFrom(progression(), NOW);

    assert.equal(snapshot.version, SNAPSHOT_VERSION);
    assert.equal(snapshot.level, 12);
    assert.equal(snapshot.progress, 0.34);
    assert.equal(snapshot.xpToNextLevel, 660);
    assert.equal(snapshot.vitality, 310);
    assert.equal(snapshot.capturedAt, '2026-09-19T15:00:00.000Z');
  });

  /**
   * Le cas qui justifie le module. `xpToNextLevel` à `null` **est** le niveau maximum : la
   * barre est pleine et le reste. Une division la laisserait à zéro, donc vide, chez le seul
   * joueur qui a tout fait.
   */
  it('rend une barre pleine au niveau maximum, sans jamais diviser', () => {
    const snapshot = snapshotFrom(progression({ xpToNextLevel: null, xpIntoLevel: 0 }), NOW);

    assert.equal(snapshot.progress, 1);
    assert.equal(snapshot.xpToNextLevel, null);
  });

  /**
   * Un palier de largeur nulle ne vient pas du jeu mais d'un rééquilibrage : `NaN` traverserait
   * `JSON.stringify` en `null`, et le décodeur Swift jetterait tout l'instantané — le widget
   * resterait sur des chiffres périmés sans que rien ne le dise.
   */
  it('ne produit pas de NaN sur un palier de largeur nulle', () => {
    const snapshot = snapshotFrom(progression({ xpIntoLevel: 0, xpToNextLevel: 0 }), NOW);

    assert.equal(snapshot.progress, 1);
    assert.ok(Number.isFinite(snapshot.progress));
    assert.equal(JSON.parse(JSON.stringify(snapshot)).progress, 1);
  });

  it('borne la barre quand le serveur a déjà dépassé le palier', () => {
    const snapshot = snapshotFrom(progression({ xpIntoLevel: 1200, xpToNextLevel: -200 }), NOW);

    assert.equal(snapshot.progress, 1);
  });

  it("rend les quatre caractéristiques dans l'ordre du cercle de vie, Vitality exclue", () => {
    const snapshot = snapshotFrom(progression(), NOW);

    assert.deepEqual(
      snapshot.attributes.map((attribute) => attribute.key),
      ['strength', 'endurance', 'mobility', 'dexterity'],
    );
    assert.deepEqual(
      snapshot.attributes.map((attribute) => attribute.value),
      [5108, 3200, 900, 1500],
    );
    assert.equal(snapshot.attributes[0].label, 'Force');
  });

  it("porte le titre équipé, et `null` quand il n'y en a pas", () => {
    assert.equal(snapshotFrom(progression(), NOW).title, null);

    const titled = snapshotFrom(
      progression({
        activeTitle: {
          id: 'first_steps',
          name: "Premier pas",
          hint: '',
          unlocked: true,
          unlockedAt: '2026-09-01T10:00:00+00:00',
          progress: { current: 1, target: 1, unit: 'SESSIONS' },
        },
      }),
      NOW,
    );

    assert.equal(titled.title, 'Premier pas');
  });
});
