import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SportsGuideView } from './SportsGuideView.tsx';
import { SPORTS_CATALOG } from './sportsFixtures.ts';

const render = (props: Partial<Parameters<typeof SportsGuideView>[0]> = {}) => renderToStaticMarkup(createElement(SportsGuideView, {
  catalog: SPORTS_CATALOG, search: '', onSearch: () => {}, onRetry: () => {}, loading: false, ...props,
}));

it('affiche les gains fournis, la durée de référence et le plafond sans recalcul ni identifiant fournisseur', () => {
  const html = render({ search: 'tennis', catalog: {
    ...SPORTS_CATALOG, reference: { durationSeconds: 2700, unit: 'XP' }, disciplines: [{
      ...SPORTS_CATALOG.disciplines[0], name: 'Raquettes du serveur', baseXp: 79,
      baseAttributeGains: { strength: 11, endurance: 13, mobility: 17, dexterity: 38 }, dailyCapXp: 321,
    }],
  } });
  for (const value of ['Raquettes du serveur', '45 min', '79 XP', 'Force +11', 'Endurance +13', 'Mobilité +17', 'Dextérité +38', '321 XP / jour', 'points de caractéristiques']) {
    assert.ok(html.includes(value), value);
  }
  for (const hidden of ['EXERCISE_TYPE_TENNIS', 'APPLE_HEALTH', 'RACKET_SPORTS', '55 %', 'Musculation']) assert.ok(!html.includes(hidden), hidden);
  assert.ok(html.includes('aria-label="Rechercher un sport"'));
});

it('explique un sport reconnu sans XP sans promettre de conversion en pas ou en Vitalité', () => {
  const html = render({ search: 'walking' });
  assert.ok(html.includes('Marche'));
  assert.ok(html.includes('Sans XP'));
  assert.ok(html.includes('Reconnu, sans gain d’XP ni de points de caractéristiques.'));
  assert.ok(!html.includes('Plafond :'));
  assert.ok(!html.includes('Force +0'));
});

it('distingue chargement, erreur avec retry, catalogue vide et recherche sans résultat', () => {
  const loading = render({ catalog: undefined, loading: true });
  assert.ok(loading.includes('Chargement des sports…'));
  assert.ok(!loading.includes('Aucun sport'));
  const failed = render({ catalog: undefined, failure: { kind: 'offline' } });
  assert.ok(failed.includes('Impossible de joindre GRRIND'));
  assert.ok(failed.includes('Réessayer'));
  assert.ok(!failed.includes('Aucun sport'));
  assert.ok(render({ catalog: { ...SPORTS_CATALOG, disciplines: [] } }).includes('Le guide ne contient encore aucun sport.'));
  assert.ok(render({ search: 'boxe' }).includes('Aucun sport trouvé. Essaie un autre nom.'));
  assert.ok(render({ failure: { kind: 'offline' } }).includes('Le dernier catalogue chargé reste affiché.'));
});
