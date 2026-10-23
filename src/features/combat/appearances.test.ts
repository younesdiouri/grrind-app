import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { components } from '@/api/schema';
import { appearanceArtwork } from './appearances.ts';

const poses = (view: string) => Object.fromEntries(['idle', 'attack', 'hit', 'critical', 'dodge', 'combo', 'replay'].map((pose) => [pose, `https://art.test/${view}/${pose}.png`])) as components['schemas']['AppearancePoses'];
const model: components['schemas']['AppearanceModel'] = {
  key: 'STRENGTH_V1', version: 'v1', name: 'Muscu', selectable: true, pixelArt: true, attachments: { back: {}, front: {} }, imageUrls: { front: poses('front'), back: poses('back') },
  foregroundUrls: { front: poses('hands/front'), back: poses('hands/back') },
  thumbnailUrls: { front: poses('thumb/front'), back: poses('thumb/back') },
};

it('choisit la vue du héros figé dans le combat, et les miniatures pour la guilde', () => {
  assert.deepEqual(appearanceArtwork([model], 'STRENGTH_V1', 'back', 'Toi')?.poses.idle, { uri: model.imageUrls.back.idle });
  assert.deepEqual(appearanceArtwork([model], 'STRENGTH_V1', 'front', 'Duel')?.poses.attack, { uri: model.imageUrls.front.attack });
  assert.deepEqual(appearanceArtwork([model], 'STRENGTH_V1', 'front', 'Guilde', true)?.poses.hit, { uri: model.thumbnailUrls.front.hit });
  assert.deepEqual(appearanceArtwork([model], 'STRENGTH_V1', 'back', 'Toi')?.poses.critical, { uri: model.imageUrls.back.critical });
  assert.equal(appearanceArtwork([], 'STRENGTH_V1', 'back', 'Toi'), undefined);
  assert.equal(appearanceArtwork([model], null, 'front', 'Mob'), undefined);
  assert.equal(appearanceArtwork([{ ...model, imageUrls: { ...model.imageUrls, front: { ...model.imageUrls.front, hit: '' } } }], 'STRENGTH_V1', 'front', 'Duel'), undefined);
});
