import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { components } from '@/api/schema';
import { equippedArtwork } from './equippedArtwork.ts';

const goggles: components['schemas']['EquipmentArtworkModel'] = {
  key: 'PURSUIT_GOGGLES', version: 'v1', name: 'Lunettes', selectable: false,
  slot: 'HEAD', iconUrl: 'https://art.test/icon.png', compatibleAppearances: ['RUNNER_V1'],
  layers: [{ attachment: 'eyes', plane: 'front', aspectRatio: 2, scale: 1.2, pivot: { x: .3, y: .5 },
    sourceUrls: { back: 'https://art.test/right.png', front: 'https://art.test/left.png' } }],
};

it('rend la version snapshotée, même désactivée, et reflète son pivot dans la vue opposée', () => {
  const fighter = { appearance: 'RUNNER_V1', equipment: { HEAD: { key: goggles.key, artworkVersion: 'v1' } } };
  const catalog = [{ ...goggles, version: 'v2', selectable: true }, goggles];
  const [right] = equippedArtwork(catalog, fighter, 'back');
  const [left] = equippedArtwork(catalog, fighter, 'front');
  assert.deepEqual(right.source, { uri: goggles.layers[0].sourceUrls.back });
  assert.deepEqual(left.source, { uri: goggles.layers[0].sourceUrls.front });
  assert.equal(right.pivot.x, .3);
  assert.equal(left.pivot.x, .7);
});

it('omet un objet inconnu, un mauvais emplacement ou une base incompatible', () => {
  assert.deepEqual(equippedArtwork([goggles], { appearance: 'SWIMMER_V1', equipment: { HEAD: { key: goggles.key, artworkVersion: 'v1' } } }, 'back'), []);
  assert.deepEqual(equippedArtwork([goggles], { appearance: 'RUNNER_V1', equipment: { FEET: { key: goggles.key, artworkVersion: 'v1' } } }, 'back'), []);
  assert.deepEqual(equippedArtwork([goggles], { appearance: 'RUNNER_V1', equipment: { HEAD: { key: goggles.key, artworkVersion: 'v9' } } }, 'back'), []);
});

it('compose plusieurs calques du même objet sans inclure les objets non portés', () => {
  const fins = { ...goggles, key: 'ACADEMIC_FLIPPERS', slot: 'FEET', layers: [
    { ...goggles.layers[0], attachment: 'footRear' }, { ...goggles.layers[0], attachment: 'footFront' },
  ] };
  const layers = equippedArtwork([goggles, fins], { appearance: 'RUNNER_V1', equipment: {
    FEET: { key: fins.key, artworkVersion: fins.version },
  } }, 'back');
  assert.deepEqual(layers.map((layer) => layer.attachment), ['footRear', 'footFront']);
  assert.equal(new Set(layers.map((layer) => layer.key)).size, 2);
});
