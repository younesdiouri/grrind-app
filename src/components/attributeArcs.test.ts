import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { glow } from '@/design/tokens';
import { decorativeGlow } from '@/design/decorativeGlow';

import { arcPresentation, arcStroke, arcsOf, ringGeometry, ringViewport } from './attributeArcs.ts';

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

describe('la géométrie d’un cercle de vie', () => {
  it('calcule le diamètre et le trou intérieur à partir de la taille — pas à l’appelant de le refaire', () => {
    assert.deepEqual(ringGeometry('hero'), {
      radius: 64,
      strokeWidth: 14,
      diameter: 142,
      origin: 71,
      innerDiameter: 100,
    });

    assert.deepEqual(ringGeometry('inline'), {
      radius: 26,
      strokeWidth: 8,
      diameter: 60,
      origin: 30,
      innerDiameter: 36,
    });
  });

  it('élargit le viewport inline et hero pour contenir le halo sans épaissir le tracé net', () => {
    for (const size of ['inline', 'hero'] as const) {
      const geometry = ringGeometry(size, glow.lit.spread);
      const outerEdge = geometry.radius + (geometry.strokeWidth + glow.lit.spread) / 2;

      assert.equal(geometry.origin, outerEdge);
      assert.equal(geometry.diameter, outerEdge * 2);
      assert.equal(geometry.innerDiameter, geometry.radius * 2 - geometry.strokeWidth * 2);
    }
  });

  it('garde le viewport d’un écran opt-in fixe quand le halo devient visible, inconnu ou réduit', () => {
    const visible = decorativeGlow('lit', false);
    const unknown = decorativeGlow('lit', null);
    const reduced = decorativeGlow('lit', true);
    const viewportFor = (_halo: ReturnType<typeof decorativeGlow>) => ringViewport('hero', 'lit');
    const optInViewport = viewportFor(visible);

    assert.ok(visible !== undefined);
    assert.equal(unknown, undefined);
    assert.equal(reduced, undefined);
    assert.deepEqual(viewportFor(unknown), optInViewport);
    assert.deepEqual(viewportFor(reduced), optInViewport);
    assert.notDeepEqual(ringViewport('hero'), optInViewport);
  });
});

describe('le trait d’un arc', () => {
  const radius = 64;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  it('soustrait l’écart et l’épaisseur du trait à la longueur voulue, bouts ronds compensés', () => {
    const stroke = arcStroke(0, 0.25, radius, strokeWidth);

    assert.equal(stroke.circumference, circumference);
    assert.equal(stroke.length, 0.25 * circumference - 4 - 14);
    assert.equal(stroke.offset, -(4 / 2 + 14 / 2));
  });

  it('décale l’arc de son point de départ, quel qu’il soit', () => {
    const stroke = arcStroke(0.5, 0.75, radius, strokeWidth);

    assert.equal(stroke.offset, -(0.5 * circumference + 4 / 2 + 14 / 2));
  });

  it('ne dessine rien quand la part est trop fine pour survivre à la compensation', () => {
    assert.equal(arcStroke(0, 0.001, radius, strokeWidth).length, 0);
  });

  // C'est la propriété que l'anneau animé (#70) fait tourner : `from` reste fixe pendant
  // qu'une valeur partagée fait avancer `to` de `from` jusqu'à sa part réelle — l'arc grandit
  // depuis rien, il ne clignote pas à sa place.
  it('grandit avec `to`, à `from` et à `offset` fixes', () => {
    const partial = arcStroke(0, 0.1, radius, strokeWidth);
    const full = arcStroke(0, 0.25, radius, strokeWidth);

    assert.ok(partial.length < full.length);
    assert.equal(partial.offset, full.offset);
  });

  it('ne donne aucun cap rond à une longueur nulle, même pour un arc absent', () => {
    const absent = arcPresentation(0, 0, radius, strokeWidth);
    const tooThin = arcPresentation(0, 0.001, radius, strokeWidth);

    assert.equal(absent.strokeLinecap, 'butt');
    assert.equal(tooThin.strokeLinecap, 'butt');
    assert.equal(absent.strokeDasharray, `${0} ${circumference}`);
  });

  it('garde des bouts ronds pour un arc visible', () => {
    assert.equal(arcPresentation(0, 0.25, radius, strokeWidth).strokeLinecap, 'round');
  });
});
