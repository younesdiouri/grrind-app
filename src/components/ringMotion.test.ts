import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { motion, ring } from '@/design/tokens';
import { orbitRadius, orbitSpread, sweepGeometry } from './ringMotion.ts';

describe('le débord de la couronne', () => {
  it('réserve exactement de quoi contenir son trait, pas un point de plus', () => {
    const strokeWidth = ring.strokeWidth.hero;
    const spread = orbitSpread(strokeWidth, motion.orbit.inset);
    const diameter = ring.radius.hero * 2 + strokeWidth + spread;

    // Le bord extérieur de la couronne doit tomber pile sur le bord du viewport : sinon elle
    // est rognée, ou l'anneau flotte au milieu d'un vide qu'il n'a pas demandé.
    const outerEdge = orbitRadius(ring.radius.hero, motion.orbit.inset) + motion.orbit.width / 2;
    assert.equal(diameter / 2, outerEdge);
  });

  it('ne réserve rien quand personne ne demande de couronne', () => {
    assert.equal(orbitSpread(ring.strokeWidth.hero, 0), 0);
    // Une couronne posée sous le trait net ne rétrécit pas le viewport.
    assert.equal(orbitSpread(ring.strokeWidth.hero, 1), 0);
  });
});

describe('le secteur de balayage', () => {
  const geometry = sweepGeometry(
    motion.sweep.diameter,
    motion.sweep.wedge,
    motion.sweep.steps,
    motion.sweep.opacity,
  );

  it('couvre le disque du centre au bord avec un seul trait', () => {
    assert.equal(geometry.radius * 2 + geometry.strokeWidth, motion.sweep.diameter);
    assert.equal(geometry.radius - geometry.strokeWidth / 2, 0);
  });

  it('découpe l’angle voulu, ni plus ni moins', () => {
    const covered = geometry.steps.reduce((sum, step) => sum + step.length, 0);
    assert.ok(Math.abs(covered / geometry.circumference - motion.sweep.wedge / 360) < 1e-12);
    assert.equal(geometry.steps.length, motion.sweep.steps);
  });

  it('met l’opacité pleine sur la tranche qui mène, et l’efface vers la traîne', () => {
    const leading = geometry.steps[geometry.steps.length - 1];
    const trailing = geometry.steps[0];

    assert.ok(Math.abs(leading.opacity - motion.sweep.opacity) < 1e-12);
    assert.ok(trailing.opacity < leading.opacity);
    assert.equal(trailing.offset, 0);
    assert.ok(leading.offset < 0);
  });
});
