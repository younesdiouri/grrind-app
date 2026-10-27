import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Href } from 'expo-router';
import { openHudDestination } from './hudNavigation.ts';

function recorder() {
  const actions: { method: string; href: Href }[] = [];
  return { actions, navigate: (href: Href) => { actions.push({ method: 'navigate', href }); },
    dismissTo: (href: Href) => { actions.push({ method: 'dismissTo', href }); } };
}

test('le sac ferme l’atelier ou la boutique et revient sur le contenu du sac', () => {
  const nav = recorder();
  openHudDestination('bag', true, nav);
  assert.deepEqual(nav.actions, [{ method: 'dismissTo', href: { pathname: '/inventaire', params: { section: 'bag' } } }]);
});

test('les raccourcis de menu ne laissent pas une pile de boutiques et ateliers derrière eux', () => {
  const nav = recorder();
  openHudDestination('workshop', true, nav);
  openHudDestination('shop', true, nav);
  assert.deepEqual(nav.actions, [{ method: 'dismissTo', href: '/atelier' }, { method: 'dismissTo', href: '/boutique' }]);
});

test('ouvrir depuis l’accueil ou ouvrir l’apparence conserve un retour vers l’origine', () => {
  const nav = recorder();
  openHudDestination('shop', false, nav);
  openHudDestination('appearance', true, nav);
  assert.deepEqual(nav.actions, [{ method: 'navigate', href: '/boutique' }, { method: 'navigate', href: '/apparence' }]);
});
