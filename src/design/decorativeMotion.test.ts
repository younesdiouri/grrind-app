import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { motion } from './tokens.ts';
import { decorativeMotion, type DecorativeMotion, type MotionName } from './decorativeMotion.ts';

/** Le compilateur est le seul endroit où les couples impossibles se prouvent. */
function assertMotionTypes() {
  const seam = decorativeMotion('seam', false);
  const exactSeam: DecorativeMotion<'seam'> = seam;
  const anyName: DecorativeMotion = seam;

  void exactSeam;
  void anyName;

  // @ts-expect-error La couronne ne peut pas se faire passer pour la respiration des segments.
  const incoherent: DecorativeMotion = { name: 'seam', effect: motion.orbit };
  // @ts-expect-error Un appelant ne peut pas changer le nom après sa résolution.
  seam.name = 'tick';
  // @ts-expect-error Un appelant ne peut pas rallumer un effet après Réduire les animations.
  decorativeMotion('seam', true).effect = motion.seam;

  void incoherent;
}

void assertMotionTypes;

const NAMES = Object.keys(motion) as MotionName[];

describe('le mouvement décoratif', () => {
  it('rend chacun des six mouvements tel que le token le décrit', () => {
    for (const name of NAMES) {
      assert.deepEqual(decorativeMotion(name, false), { name, effect: motion[name] });
    }
  });

  it('disparaît avec la préférence système sans perdre son nom', () => {
    // Le nom survit : c'est lui qui réserve le viewport du cercle de vie, et un viewport qui
    // rétrécirait sous « Réduire les animations » déplacerait tout le contenu de la carte.
    for (const name of NAMES) {
      assert.deepEqual(decorativeMotion(name, true), { name, effect: undefined });
    }
  });

  it('reste coupé tant que la préférence système est inconnue ou inaccessible', () => {
    assert.deepEqual(decorativeMotion('orbit', null), { name: 'orbit', effect: undefined });
  });
});
