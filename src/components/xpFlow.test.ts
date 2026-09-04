import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { motion } from '@/design/tokens';
import { sheenBands, stripeOffsets } from './xpFlow.ts';

describe('les répétitions d’une couche de flow', () => {
  it('couvre toute la largeur, et un pas avant le bord gauche', () => {
    const offsets = stripeOffsets(20, 7);

    assert.equal(offsets[0], -7);
    assert.ok(offsets[offsets.length - 1] >= 20);
    // Le pas d'avance existe pour ça : la couche se translate d'un pas entier par cycle, et
    // sans lui le bord gauche du remplissage serait nu une fois par cycle.
    assert.ok(offsets.every((offset, index) => index === 0 || offset - offsets[index - 1] === 7));
  });

  it('ne dessine rien sur une barre qui n’a pas encore été mesurée', () => {
    assert.deepEqual(stripeOffsets(0, motion.flow.hatch), []);
  });

  it('fait aller le reflet dix fois plus vite que la hachure', () => {
    // La parallaxe est ce rapport, et rien d'autre : les deux couches parcourent leur propre
    // pas dans le même cycle.
    assert.equal(motion.flow.sheen / motion.flow.hatch, 10);
  });
});

describe('le reflet', () => {
  const bands = sheenBands(motion.flow.sheen, motion.flow.sheenSteps, motion.flow.sheenOpacity);

  it('reste confiné aux quatre dixièmes centraux du motif', () => {
    const first = bands[0];
    const last = bands[bands.length - 1];

    assert.ok(Math.abs(first.left - motion.flow.sheen * 0.3) < 1e-12);
    assert.ok(Math.abs(last.left + last.width - motion.flow.sheen * 0.7) < 1e-12);
  });

  it('monte puis redescend, symétrique autour du sommet', () => {
    const opacities = bands.map((band) => band.opacity);

    assert.deepEqual(opacities, [...opacities].reverse());
    assert.ok(opacities[1] > opacities[0]);
    assert.ok(Math.max(...opacities) <= motion.flow.sheenOpacity);
  });

  it('ne dessine rien quand personne ne lui donne de largeur', () => {
    assert.deepEqual(sheenBands(0, 4, 0.5), []);
    assert.deepEqual(sheenBands(70, 0, 0.5), []);
  });
});
