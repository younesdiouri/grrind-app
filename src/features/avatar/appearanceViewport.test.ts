import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appearanceViewport } from './appearanceViewport.ts';

test('l’apparence intégrée utilise tout l’espace au-dessus des contrôles, sans réserver une seconde fois le HUD', () => {
  assert.deepEqual(appearanceViewport({ height: 600, controlsHeight: 240 }), { x: 0, y: 0.4, width: 1, height: 0.6 });
});

test('l’inspection publique plein écran réserve son retour et les safe areas', () => {
  const viewport = appearanceViewport({ height: 844, controlsHeight: 260, headerHeight: 52, safeTop: 62, safeBottom: 34 });
  assert.deepEqual(viewport, { x: 0, y: 294 / 844, width: 1, height: 436 / 844 });
});

test('une surface non mesurée ou entièrement occupée ne produit pas un cadrage hors écran', () => {
  assert.equal(appearanceViewport({ height: 0, controlsHeight: 240 }), null);
  assert.equal(appearanceViewport({ height: 200, controlsHeight: 240 }), null);
});
