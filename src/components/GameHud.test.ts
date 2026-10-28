import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { GameHud, type HudDestination } from '@/components/GameHud';

test('le HUD expose les destinations sans titre de page et annonce le vrai solde', () => {
  const markup = renderToStaticMarkup(createElement(GameHud, { coins: 1240, onNavigate() {} }));
  for (const name of ['Boutique, 1240 pièces', 'Atelier', 'Sac', 'Inventaire']) {
    assert.ok(markup.includes(`aria-label="${name}"`));
  }
  assert.doesNotMatch(markup, />GRRIND<|>Inventaire<|>Boutique<|>Apparence</);
  assert.doesNotMatch(markup, /aria-label="Retour"/);
});

test('le solde inconnu garde la boutique accessible sans inventer de zéro', () => {
  const markup = renderToStaticMarkup(createElement(GameHud, { onNavigate() {} }));
  assert.match(markup, /Boutique, solde indisponible/);
  assert.doesNotMatch(markup, /0 pièces/);
});

test('les gros soldes restent lisibles et le lecteur d’écran garde la valeur exacte', () => {
  const markup = renderToStaticMarkup(createElement(GameHud, { coins: 1234567, onNavigate() {} }));
  assert.match(markup, /Boutique, 1234567 pièces/);
  assert.match(markup, /1,2.*M/);
});

test('chaque raccourci demande la bonne destination et le retour reste indépendant', () => {
  const targets: HudDestination[] = [];
  let backs = 0;
  const hud = GameHud({ coins: 0, onNavigate: (target) => targets.push(target), onBack: () => { backs += 1; } });
  const [back, shop, , shortcuts] = hud.props.children;
  back.props.onPress();
  shop.props.onPress();
  shortcuts.forEach((button: { props: { onPress(): void } }) => button.props.onPress());
  assert.equal(backs, 1);
  assert.deepEqual(targets, ['shop', 'workshop', 'bag', 'inventory']);
});

test('la localisation annonce la capture et ouvre son écran sans démarrer ni arrêter la collecte', () => {
  const targets: HudDestination[] = [];
  for (const active of [false, true]) {
    const props = { coins: 50, location: { active, failed: false }, onNavigate: (target: HudDestination) => targets.push(target) };
    const markup = renderToStaticMarkup(createElement(GameHud, props));
    assert.match(markup, active ? /Localisation active, ouvrir Sport ensemble/ : /Localisation inactive, ouvrir Sport ensemble/);
    const hud = GameHud(props);
    hud.props.children[2].props.onPress();
  }
  assert.deepEqual(targets, ['location', 'location']);
});

test('la localisation signale une panne de stockage et reste absente hors du pilote', () => {
  const failed = renderToStaticMarkup(createElement(GameHud, { location: { active: false, failed: true }, onNavigate() {} }));
  assert.match(failed, /Localisation, stockage indisponible, ouvrir Sport ensemble/);
  const normal = renderToStaticMarkup(createElement(GameHud, { onNavigate() {} }));
  assert.doesNotMatch(normal, /hud-location/);
});

test('la destination active est annoncée sans faux badge ou compteur de potion', () => {
  const markup = renderToStaticMarkup(createElement(GameHud, { coins: 17, active: 'workshop', onNavigate() {} }));
  assert.match(markup, /aria-label="Atelier"[^>]*aria-selected="true"/);
  assert.doesNotMatch(markup, /Nouveau|Gratuit|potions/);
});
