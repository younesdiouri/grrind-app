import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { itemIllustrationPresentation } from './itemIllustrationState.ts';

describe('itemIllustrationPresentation', () => {
  const imageUrl = 'https://api.grrind.app/game-images/items/worn-running-shoes.png';

  it('charge l’URL distante derrière le placeholder', () => {
    assert.deepEqual(
      itemIllustrationPresentation({ imageUrl, loadedImageUrl: null, failedImageUrl: null }),
      { source: imageUrl, imageVisible: false, placeholderVisible: true },
    );
  });

  it('révèle l’image seulement après son chargement', () => {
    assert.deepEqual(
      itemIllustrationPresentation({
        imageUrl,
        loadedImageUrl: imageUrl,
        failedImageUrl: null,
      }),
      { source: imageUrl, imageVisible: true, placeholderVisible: false },
    );
  });

  it('conserve le placeholder après l’échec de la ressource courante', () => {
    assert.deepEqual(
      itemIllustrationPresentation({
        imageUrl,
        loadedImageUrl: null,
        failedImageUrl: imageUrl,
      }),
      { source: null, imageVisible: false, placeholderVisible: true },
    );
  });

  it('conserve le placeholder quand l’URL est absente', () => {
    assert.deepEqual(
      itemIllustrationPresentation({ imageUrl: '', loadedImageUrl: null, failedImageUrl: null }),
      { source: null, imageVisible: false, placeholderVisible: true },
    );
  });
});
