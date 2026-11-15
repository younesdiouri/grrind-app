import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuildEmblem } from '@/components/GuildEmblem';
import { GuildEmblemPicker } from '@/components/GuildEmblemPicker';
import { DEFAULT_GUILD_EMBLEM, emblemColors, emblemWithBackground, type EmblemColor } from '@/features/community/guildEmblem';

test('changer puis inverser le fond conserve une composition contrastée et le symbole choisi', () => {
  const original = { ...DEFAULT_GUILD_EMBLEM, symbol: 'YOGA' as const };
  const light = emblemWithBackground(original, 'BLOSSOM');
  assert.deepEqual(light, { symbol: 'YOGA', backgroundColor: 'BLOSSOM', symbolColor: 'NIGHT' });
  assert.deepEqual(emblemWithBackground(light, 'NIGHT'), { symbol: 'YOGA', backgroundColor: 'NIGHT', symbolColor: 'BLOSSOM' });
  for (const background of Object.keys(emblemColors) as EmblemColor[]) {
    for (const previous of [original, light]) {
      const result = emblemWithBackground(previous, background);
      assert.notEqual(result.backgroundColor === 'NIGHT', result.symbolColor === 'NIGHT');
    }
  }
});

test('une ancienne guilde sans emblème reçoit le défaut accessible', () => {
  const html = renderToStaticMarkup(createElement(GuildEmblem, { emblem: null }));
  assert.match(html, /aria-label="Emblème · Musculation · Cyan sur Nuit"/);
});

test('le sélecteur annonce les choix et rend les couleurs sans contraste indisponibles', () => {
  const html = renderToStaticMarkup(createElement(GuildEmblemPicker, {
    emblem: { symbol: 'HEART', backgroundColor: 'COPPER', symbolColor: 'NIGHT' },
    name: 'Les Increvables', memberCount: 12, onChange() {},
  }));
  const choice = (label: string) => html.match(new RegExp(`<[^>]+aria-label="${label}"[^>]*>`))?.[0] ?? '';
  assert.match(choice('Cardio'), /aria-checked="true"/);
  assert.match(choice('Couleur du symbole · Nuit'), /aria-checked="true"/);
  assert.match(choice('Couleur du symbole · Cyan'), /aria-disabled="true"/);
  assert.match(html, /Emblème · Cardio · Nuit sur Cuivre/);
});
