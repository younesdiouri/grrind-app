import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { arcsOf } from './attributeArcs.ts';

describe('la répartition d’un cercle de vie', () => {
  it('donne quatre arcs égaux quand les quatre parts le sont', () => {
    const arcs = arcsOf({ strength: 25, endurance: 25, mobility: 25, dexterity: 25 });

    assert.deepEqual(arcs, [
      { attribute: 'strength', from: 0, to: 0.25 },
      { attribute: 'endurance', from: 0.25, to: 0.5 },
      { attribute: 'mobility', from: 0.5, to: 0.75 },
      { attribute: 'dexterity', from: 0.75, to: 1 },
    ]);
  });

  it('rend un seul arc, plein, quand une seule caractéristique porte le total', () => {
    const arcs = arcsOf({ strength: 0, endurance: 40, mobility: 0, dexterity: 0 });

    assert.deepEqual(arcs, [{ attribute: 'endurance', from: 0, to: 1 }]);
  });

  it('ne rend aucun arc quand le total est nul — un compte neuf', () => {
    assert.deepEqual(arcsOf({ strength: 0, endurance: 0, mobility: 0, dexterity: 0 }), []);
  });

  it('saute une part nulle sans laisser d’écart entre ses deux voisines', () => {
    const arcs = arcsOf({ strength: 10, endurance: 0, mobility: 10, dexterity: 0 });

    assert.deepEqual(arcs, [
      { attribute: 'strength', from: 0, to: 0.5 },
      { attribute: 'mobility', from: 0.5, to: 1 },
    ]);
  });

  // Trois septièmes, un quatre-septièmes : aucune de ces fractions ne tombe rond en binaire.
  // C'est justement le cas qui laisserait un cheveu de piste si on additionnait des fractions
  // déjà arrondies au lieu de diviser une somme cumulée.
  it('finit exactement à 1 sur un arrondi adverse', () => {
    const arcs = arcsOf({ strength: 1, endurance: 1, mobility: 1, dexterity: 4 });

    assert.equal(arcs.length, 4);
    assert.equal(arcs[arcs.length - 1]?.to, 1);
    assert.equal(arcs[0]?.from, 0);
  });
});
