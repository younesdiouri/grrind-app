import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capturePreview } from './capturePreview.ts';

test('attend que la transition libère Unity puis rend la configuration enregistrée', async () => {
  let transitioning = true;
  const image = await capturePreview('saved-avatar', async configuration => {
    if (transitioning) {
      transitioning = false;
      throw new Error('AVATAR_PREVIEW: Unity is busy (at ExpoModulesCore/Promise.swift:65)');
    }
    return `image:${configuration}`;
  }, () => true);
  assert.equal(image, 'image:saved-avatar');
});

test('ne relance pas une capture devenue obsolète pendant la transition', async () => {
  let active = true;
  const image = await capturePreview('old-avatar', async () => {
    active = false;
    throw new Error('Unity is busy');
  }, () => active);
  assert.equal(image, undefined);
});

test('remonte une vraie erreur de rendu sans la rejouer', async () => {
  const failure = new Error('Avatar preview timed out');
  await assert.rejects(capturePreview('saved-avatar', async () => { throw failure; }, () => true), failure);
});
