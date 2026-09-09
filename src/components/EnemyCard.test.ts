import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EnemyCard } from '@/components/EnemyCard';

test('le catalogue montre le portrait et le niveau sans statistiques ennemies', () => {
  const markup = renderToStaticMarkup(createElement(EnemyCard, { enemy: {
    key: 'ENEMY', name: 'Adversaire du test', minimumLevel: 5,
    hp: 12345, damage: 6789, mitigationPercent: 12, comboPercent: 4, dodgePercent: 9,
    maintenancePercent: 0, criticalChancePercent: 0, guardPercent: 0,
    criticalResistancePercent: 0, cooldownReductionPercent: 0, precisionPercent: 0,
    imageUrls: { idle: 'https://example.test/enemy.png', attack: 'https://example.test/attack.png', hit: 'https://example.test/hit.png' },
  }, locked: true }));
  assert.match(markup, /Adversaire du test/);
  assert.match(markup, /Disponible au niveau/);
  assert.match(markup, /enemy\.png/);
  assert.match(markup, /<svg/);
  assert.doesNotMatch(markup, /12345|6789|ARMURE|ESQUIVE|DÉGÂTS/);
});
