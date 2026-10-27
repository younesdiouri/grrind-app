import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CombatMenu } from '@/components/CombatMenu';
import { Button } from '@/components/Button';

const enemy = { key: 'SAND_JACKAL', name: 'Cailloux dans la Chaussure', minimumLevel: 1, hp: 90, damage: 8,
  mitigationPercent: 0, comboPercent: 0, dodgePercent: 0, maintenancePercent: 0, criticalChancePercent: 0,
  guardPercent: 0, criticalResistancePercent: 0, cooldownReductionPercent: 0, precisionPercent: 0 };
const actions = { onMode() {}, onFight() {}, onDemo() {}, onHistory() {} };

test('le PvE expose Cailloux et conserve le verrou serveur', () => {
  const markup = renderToStaticMarkup(createElement(CombatMenu, { ...actions, mode: 'pve', enemy: { ...enemy, minimumLevel: 12 }, locked: true }));
  assert.match(markup, /Cailloux dans la Chaussure/);
  assert.match(markup, /Disponible au niveau 12/);
  assert.match(markup, /aria-disabled="true"/);
  assert.doesNotMatch(markup, /Lancer un défi/);
});

test('le PvP annonce sa démonstration sans promettre de ligue ou de récompense', () => {
  const markup = renderToStaticMarkup(createElement(CombatMenu, { ...actions, mode: 'pvp', enemy }));
  assert.match(markup, /Rival d’entraînement/);
  assert.match(markup, /Démo/);
  assert.match(markup, /Sans classement ni récompense/);
  assert.doesNotMatch(markup, /Combattre — Cailloux/);
});

test('le bouton PvP appelle uniquement la démo, jamais le combat serveur', () => {
  let demo = 0;
  let fights = 0;
  const tree = CombatMenu({ ...actions, mode: 'pvp', onDemo: () => { demo += 1; }, onFight: () => { fights += 1; } });
  function pressDemo(node: ReactElement | ReactElement[] | null | undefined): void {
    if (Array.isArray(node)) { node.forEach(pressDemo); return; }
    if (!node || typeof node !== 'object') return;
    const element = node as ReactElement<{ label?: string; onPress?(): void; children?: ReactElement[] }>;
    if (element.type === Button && element.props.label?.includes('Démo')) element.props.onPress?.();
    else pressDemo(element.props.children);
  }
  pressDemo(tree);
  assert.equal(demo, 1);
  assert.equal(fights, 0);
});
