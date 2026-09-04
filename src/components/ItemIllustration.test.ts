import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ItemIllustration } from '@/components/ItemIllustration';

describe('ItemIllustration', () => {
  it('rend l’URL distante contenue derrière le pictogramme pendant le chargement', () => {
    const markup = renderToStaticMarkup(
      createElement(ItemIllustration, {
        item: {
          imageUrl: 'https://api.grrind.app/game-images/items/worn-running-shoes.png',
          kind: 'EQUIPMENT',
          name: 'Baskets usées',
          slot: 'FEET',
        },
        accessibilityLabel: 'Illustration de Baskets usées',
      }),
    );

    assert.match(markup, /worn-running-shoes\.png/);
    assert.match(markup, /object-fit:contain/);
    assert.match(markup, /<svg/);
  });
});
