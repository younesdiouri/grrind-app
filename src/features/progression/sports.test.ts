import assert from 'node:assert/strict';
import { it } from 'node:test';
import { filterSports } from './sports.ts';
import { SPORTS_CATALOG } from './sportsFixtures.ts';

it('cherche par nom et alias serveur, sans casse ni accents et sans dupliquer la discipline', () => {
  const entries = SPORTS_CATALOG.disciplines;
  assert.deepEqual(filterSports(entries, '  TÉNNIS  '), [entries[0]]);
  assert.deepEqual(filterSports(entries, 'raquétté'), [entries[0]]);
  assert.deepEqual(filterSports(entries, 'EXERCISE_TYPE_TENNIS'), [entries[0]]);
  assert.deepEqual(filterSports(entries, 'muscu'), [entries[1]]);
  assert.deepEqual(filterSports(entries, '  '), entries);
});

it('ne propose que les entrées publiées, y compris reconnues sans XP', () => {
  assert.deepEqual(filterSports(SPORTS_CATALOG.disciplines, 'walking'), [SPORTS_CATALOG.disciplines[2]]);
  assert.deepEqual(filterSports(SPORTS_CATALOG.disciplines, 'boxe'), []);
  assert.deepEqual(filterSports([], 'tennis'), []);
});
