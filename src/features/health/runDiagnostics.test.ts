import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SyncJournal } from './journal.ts';
import { formatRunDuration, hasOrphanedRun, runDurationSeconds } from './runDiagnostics.ts';

/**
 * Le banc du sort de la dernière course (#140).
 *
 * `journal.ts` importe `expo-file-system` en valeur et ne se charge donc pas sous
 * `node --test` — voir le docblock en tête de `runDiagnostics.ts`. Ce fichier ne construit
 * ses journaux qu'à la main, à partir du type, jamais en passant par `getJournal()`.
 */

const EMPTY: SyncJournal = {
  runStartedAt: null,
  settledAt: null,
  outcome: null,
  imported: null,
  failure: null,
  wokeAt: null,
  registration: null,
};

describe('une course sans verdict', () => {
  it("n'est pas orpheline si aucune course n'a jamais commencé", () => {
    assert.equal(hasOrphanedRun(EMPTY), false);
  });

  it("n'est pas orpheline si aucune course n'a jamais commencé, même avec un vieux verdict", () => {
    assert.equal(
      hasOrphanedRun({ ...EMPTY, settledAt: '2026-08-01T10:00:00.000Z' }),
      false,
    );
  });

  it('est orpheline quand une course est entrée sans qu’aucun verdict ne soit jamais tombé', () => {
    assert.equal(
      hasOrphanedRun({ ...EMPTY, runStartedAt: '2026-08-31T18:04:00.000Z' }),
      true,
    );
  });

  it('est orpheline quand la course est entrée après le dernier verdict connu — le chien de garde natif a coupé avant que ce verdict-ci ne tombe', () => {
    assert.equal(
      hasOrphanedRun({
        ...EMPTY,
        runStartedAt: '2026-08-31T18:04:00.000Z',
        settledAt: '2026-08-31T15:35:00.000Z',
      }),
      true,
    );
  });

  it("n'est pas orpheline quand le dernier verdict est postérieur à l'entrée — la course a fini par répondre, y compris par notre propre abandon (`budgetExceeded`)", () => {
    assert.equal(
      hasOrphanedRun({
        ...EMPTY,
        runStartedAt: '2026-08-31T18:04:00.000Z',
        settledAt: '2026-08-31T18:04:12.000Z',
        outcome: 'budgetExceeded',
      }),
      false,
    );
  });
});

describe('la durée de la dernière course', () => {
  it("n'a pas de réponse quand aucune course n'a jamais commencé", () => {
    assert.equal(runDurationSeconds(EMPTY), null);
  });

  it("n'a pas de réponse quand la course est orpheline — on ne sait pas combien de temps elle a tenu, seulement qu'elle a dépassé le couperet natif", () => {
    assert.equal(
      runDurationSeconds({ ...EMPTY, runStartedAt: '2026-08-31T18:04:00.000Z' }),
      null,
    );
    assert.equal(
      runDurationSeconds({
        ...EMPTY,
        runStartedAt: '2026-08-31T18:04:00.000Z',
        settledAt: '2026-08-31T15:35:00.000Z',
      }),
      null,
    );
  });

  it("mesure exactement l'écart entre l'entrée et la sortie quand la course a fini par répondre", () => {
    assert.equal(
      runDurationSeconds({
        ...EMPTY,
        runStartedAt: '2026-08-31T18:04:00.000Z',
        settledAt: '2026-08-31T18:04:01.300Z',
      }),
      1.3,
    );
  });

  it("mesure notre propre abandon comme n'importe quelle autre course réglée — c'est exactement ce qui manquait pour juger le budget de douze secondes", () => {
    assert.equal(
      runDurationSeconds({
        ...EMPTY,
        runStartedAt: '2026-08-31T18:04:00.000Z',
        settledAt: '2026-08-31T18:04:12.000Z',
        outcome: 'budgetExceeded',
      }),
      12,
    );
  });
});

describe('la durée en mots', () => {
  it('garde une décimale sous dix secondes, où l’écart se lit', () => {
    assert.equal(formatRunDuration(1.3), '1,3 s');
    assert.equal(formatRunDuration(0.2), '0,2 s');
  });

  it('arrondit à la seconde au-delà — le budget lui-même est un compte rond', () => {
    assert.equal(formatRunDuration(12), '12 s');
    assert.equal(formatRunDuration(11.6), '12 s');
  });
});
