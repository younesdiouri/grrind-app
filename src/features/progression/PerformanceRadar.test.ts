import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PerformanceRadar } from './PerformanceRadar.tsx';
import type { WeekProgress } from './week.ts';

const empty = { xp: 0, sessions: 0, attributes: { strength: 0, endurance: 0, mobility: 0, dexterity: 0 } };
const week: WeekProgress = { startsAt: '', resetsAt: '', current: empty, previous: null,
  entries: [], trainingPlan: null, trainingPlans: [] };

test('le radar présente les gains serveur de la cible contre sa référence', () => {
  const markup = renderToStaticMarkup(createElement(PerformanceRadar, { showHeading: false, week: {
    ...week, current: { ...empty, attributes: { strength: 25, endurance: 75, mobility: 0, dexterity: 1 } },
    previous: { ...empty, attributes: { strength: 100, endurance: 50, mobility: 0, dexterity: 0 } },
  } }));
  assert.match(markup, /Force 25 %, Endurance 100 %, Mobilité —, Dextérité Nouveau/);
});

for (const previous of [null, empty]) {
  test(`le radar sans référence ${previous === null ? 'servie' : 'positive'} ne prétend pas montrer des pourcentages`, () => {
    const markup = renderToStaticMarkup(createElement(PerformanceRadar, { showHeading: false, week: { ...week, previous } }));
    assert.ok(markup.includes('Référence indisponible'), 'L’absence de référence doit être explicite');
    assert.doesNotMatch(markup, /100 pour cent correspond|Force 0 %/);
  });
}
