import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Children, createElement, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuildEmblem } from '@/components/GuildEmblem';
import { GuildEmblemPicker } from '@/components/GuildEmblemPicker';
import { DEFAULT_GUILD_EMBLEM, emblemColors, emblemWithColor, type Emblem, type EmblemColor } from '@/features/community/guildEmblem';

test('changer puis inverser le fond conserve une composition contrastée et le symbole choisi', () => {
  const original = { ...DEFAULT_GUILD_EMBLEM, symbol: 'YOGA' as const };
  const light = emblemWithColor(original, 'backgroundColor', 'BLOSSOM');
  assert.deepEqual(light, { symbol: 'YOGA', backgroundColor: 'BLOSSOM', symbolColor: 'NIGHT' });
  assert.deepEqual(emblemWithColor(light, 'backgroundColor', 'NIGHT'), { symbol: 'YOGA', backgroundColor: 'NIGHT', symbolColor: 'BLOSSOM' });
  for (const value of Object.keys(emblemColors) as EmblemColor[]) {
    for (const previous of [original, light]) {
      for (const field of ['backgroundColor', 'symbolColor'] as const) {
        const result = emblemWithColor(previous, field, value);
        assert.equal(result[field], value);
        assert.equal(result.symbol, 'YOGA');
        assert.notEqual(result.backgroundColor === 'NIGHT', result.symbolColor === 'NIGHT');
      }
    }
  }
});

test('une ancienne guilde sans emblème reçoit le défaut accessible', () => {
  const html = renderToStaticMarkup(createElement(GuildEmblem, { emblem: null }));
  assert.match(html, /aria-label="Emblème · Musculation · Cyan sur Nuit"/);
});

test('les noms restent accessibles sans texte sous les symboles et toutes les couleurs restent actives', () => {
  const html = renderToStaticMarkup(createElement(GuildEmblemPicker, {
    emblem: { symbol: 'HEART', backgroundColor: 'COPPER', symbolColor: 'NIGHT' },
    name: 'Les Increvables', memberCount: 12, onChange() {},
  }));
  const choice = (label: string) => html.match(new RegExp(`<[^>]+aria-label="${label}"[^>]*>`))?.[0] ?? '';
  assert.match(choice('Cardio'), /aria-checked="true"/);
  assert.match(choice('Couleur du symbole · Nuit'), /aria-checked="true"/);
  for (const { label } of Object.values(emblemColors)) {
    for (const field of ['Fond', 'Couleur du symbole']) {
      const control = choice(`${field} · ${label}`);
      assert.notEqual(control, '');
      assert.doesNotMatch(control, /aria-disabled="true"/);
    }
  }
  assert.doesNotMatch(html, />Musculation<|>Cardio<|>Yoga<|>Explosivité</);
  assert.match(html, /Emblème · Cardio · Nuit sur Cuivre/);
});

test('les vrais contrôles de couleur inversent la composition puis rendent immédiatement le nouveau choix', () => {
  let value: Emblem = { symbol: 'HEART', backgroundColor: 'MINT', symbolColor: 'NIGHT' };
  const select = (label: string, choice: string) => {
    const editor = GuildEmblemPicker({ emblem: value, name: 'Test', memberCount: 4, onChange: next => { value = next; } });
    const section = Children.toArray(editor.props.children).find(child =>
      isValidElement<{ label?: string }>(child) && child.props.label === label) as ReactElement;
    const rendered = (section.type as (props: unknown) => ReactElement<{ children: ReactElement[] }>)(section.props);
    const group = Children.toArray(rendered.props.children).find(child =>
      isValidElement<{ accessibilityRole?: string }>(child) && child.props.accessibilityRole === 'radiogroup') as ReactElement<{ children: ReactElement[] }>;
    const button = Children.toArray(group.props.children).find(child =>
      isValidElement<{ accessibilityLabel?: string }>(child) && child.props.accessibilityLabel === `${label} · ${choice}`) as ReactElement<{ disabled: boolean; onPress(): void }>;
    assert.equal(button.props.disabled, false);
    button.props.onPress();
  };
  select('Couleur du symbole', 'Rose');
  assert.deepEqual(value, { symbol: 'HEART', backgroundColor: 'NIGHT', symbolColor: 'BLOSSOM' });
  select('Couleur du symbole', 'Nuit');
  assert.deepEqual(value, { symbol: 'HEART', backgroundColor: 'BLOSSOM', symbolColor: 'NIGHT' });
  select('Fond', 'Nuit');
  assert.deepEqual(value, { symbol: 'HEART', backgroundColor: 'NIGHT', symbolColor: 'BLOSSOM' });
  const html = renderToStaticMarkup(createElement(GuildEmblemPicker, { emblem: value, name: 'Test', memberCount: 4, onChange() {} }));
  assert.match(html, /Emblème · Cardio · Rose sur Nuit/);
});
