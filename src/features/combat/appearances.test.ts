import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { components } from '@/api/schema';
import { appearanceArtwork } from './appearances.ts';

const poses = (view: string) => ({ idle: `https://art.test/${view}/idle.png`, attack: `https://art.test/${view}/attack.png`, hit: `https://art.test/${view}/hit.png` });
const model: components['schemas']['AppearanceModel'] = {
  key: 'MURID', imageUrls: { front: poses('front'), back: poses('back') },
  thumbnailUrls: { front: poses('thumb/front'), back: poses('thumb/back') },
};

it('choisit la vue du héros figé dans le combat, et les miniatures pour la guilde', () => {
  assert.deepEqual(appearanceArtwork([model], 'MURID', 'back', 'Toi')?.poses.idle, { uri: model.imageUrls.back.idle });
  assert.deepEqual(appearanceArtwork([model], 'MURID', 'front', 'Duel')?.poses.attack, { uri: model.imageUrls.front.attack });
  assert.deepEqual(appearanceArtwork([model], 'MURID', 'front', 'Guilde', true)?.poses.hit, { uri: model.thumbnailUrls.front.hit });
  assert.equal(appearanceArtwork([], 'MURID', 'back', 'Toi'), undefined);
  assert.equal(appearanceArtwork([model], null, 'front', 'Mob'), undefined);
  assert.equal(appearanceArtwork([{ ...model, imageUrls: { ...model.imageUrls, front: { ...model.imageUrls.front, hit: '' } } }], 'MURID', 'front', 'Duel'), undefined);
});
