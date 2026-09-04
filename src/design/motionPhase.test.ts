import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ambient, motion } from './tokens.ts';
import { breathe, cyclePhase, loopsCleanly, staggerOffset } from './motionPhase.ts';

describe('la phase lue sur l’horloge partagée', () => {
  it('parcourt le sous-cycle une fois par tranche de sa durée', () => {
    // `seam` dure 3 000 ms : un quart d'horloge en contient exactement un tour.
    assert.equal(cyclePhase(0, 3_000), 0);
    assert.equal(cyclePhase(0.125, 3_000), 0.5);
    assert.equal(cyclePhase(0.25, 3_000), 0);
  });

  it('remet un décalage négatif dans [0, 1[ au lieu de partir à l’envers', () => {
    const phase = cyclePhase(0, 3_000, -800);
    assert.ok(phase >= 0 && phase < 1);
    assert.ok(Math.abs(phase - (1 - 800 / 3_000)) < 1e-12);
  });

  it('déphase les deux segments d’un cadre d’un demi-cycle', () => {
    const top = cyclePhase(0.05, motion.seam.cycle);
    const bottom = cyclePhase(0.05, motion.seam.cycle, motion.seam.opposite);
    assert.ok(Math.abs(((bottom - top + 1) % 1) - 0.5) < 1e-12);
  });

  it('fait suivre une cascade au lieu de la faire attendre', () => {
    assert.equal(staggerOffset(0, 250), 0);
    assert.equal(staggerOffset(2, 250), -500);
  });
});

describe('la respiration', () => {
  it('part du creux, passe par le sommet, et revient exactement au creux', () => {
    assert.ok(Math.abs(breathe(0, 0.45, 1) - 0.45) < 1e-12);
    assert.ok(Math.abs(breathe(0.5, 0.45, 1) - 1) < 1e-12);
    assert.ok(Math.abs(breathe(1, 0.45, 1) - 0.45) < 1e-12);
  });

  it('reste dans ses bornes, et symétrique autour du sommet', () => {
    for (let phase = 0; phase <= 1; phase += 0.05) {
      const value = breathe(phase, 0.45, 1);
      assert.ok(value >= 0.45 - 1e-12 && value <= 1 + 1e-12);
      assert.ok(Math.abs(value - breathe(1 - phase, 0.45, 1)) < 1e-12);
    }
  });
});

describe('les cycles continus', () => {
  it('divisent tous l’horloge partagée, sinon ils sautent une fois par tour', () => {
    // `scan` est absent volontairement : c'est un événement, pas une boucle — il n'a pas de
    // `cycle` du tout, et c'est le compilateur qui le dit ci-dessous.
    const cycles = [
      motion.seam.cycle,
      motion.tick.cycle,
      motion.orbit.cycle,
      motion.sweep.cycle,
      motion.flow.cycle,
      motion.flow.crestCycle,
      motion.convey.cycle,
      motion.caret.cycle,
      motion.beacon.cycle,
      motion.beacon.travel,
    ];

    for (const cycle of cycles) {
      assert.ok(loopsCleanly(cycle), `${cycle} ms ne divise pas ${ambient.cycle} ms`);
    }
  });

  it('refuse les cycles de la référence de design qui ne bouclent pas', () => {
    // Les valeurs choisies à l'œil sur un Mac, avant l'arrondi : chacune saute une fois par tour.
    for (const cycle of [3_200, 26_000, 5_400, 1_100, 1_800, 1_600, 1_400]) {
      assert.equal(loopsCleanly(cycle), false);
    }
  });

  it('n’a pas de cycle pour le balayage, qui est un événement', () => {
    // @ts-expect-error `scan` se déclenche, il ne boucle pas : il n'a que la durée de sa course.
    void motion.scan.cycle;
    assert.ok(motion.scan.active > 0);
  });
});
