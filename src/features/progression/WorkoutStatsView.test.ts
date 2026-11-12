import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkoutStatsView } from './WorkoutStatsView.tsx';
import { EMPTY_STATS, MONTH_STATS, WEEK_STATS, YEAR_STATS } from './workoutStatsFixtures.ts';

it('affiche les totaux, moyenne, note, évolution et parts serveur sans les déduire des séries', () => {
  const html = renderToStaticMarkup(createElement(WorkoutStatsView, { stats: {
    ...WEEK_STATS,
    current: { seconds: 9999, sessions: 42, activeDays: 7, averageSeconds: 2222 },
    grade: 'D', change: 77,
    disciplines: [{ discipline: 'STRENGTH', seconds: 1200, sessions: 3, share: .1 }],
  } }));
  for (const value of ['>42<', '>7<', '>37 min<', '>2 h 47<', 'Rythme allégé', '+77 % de temps d’entraînement', '10 %']) {
    assert.ok(html.includes(value), value);
  }
  const balance = html.slice(html.indexOf('TON ÉQUILIBRE'));
  assert.ok(!balance.includes('2 h 47'));
});

it('garde le calendrier observé, les douze mois serveur et les cibles explorables sur les séances', () => {
  const month = renderToStaticMarkup(createElement(WorkoutStatsView, { stats: MONTH_STATS }));
  assert.ok(month.includes('RÉGULARITÉ'));
  assert.ok(month.includes('11 nov.'));
  assert.ok(month.includes('9 nov., 40 min'));
  assert.ok(!month.includes('10 nov., 0 min'));
  const year = renderToStaticMarkup(createElement(WorkoutStatsView, { stats: YEAR_STATS }));
  assert.ok(year.includes('janv'));
  assert.ok(year.includes('déc'));
  assert.ok(year.includes('TEMPS D’ENTRAÎNEMENT'));
});

it('affiche la réponse vide avec une référence et une moyenne absentes', () => {
  const html = renderToStaticMarkup(createElement(WorkoutStatsView, { stats: EMPTY_STATS }));
  assert.ok(html.includes('Ta référence se construit'));
  assert.ok(html.includes('>—<'));
  assert.ok(html.includes('>0 min<'));
  assert.ok(!html.includes('TEMPS D’ENTRAÎNEMENT'));
});
