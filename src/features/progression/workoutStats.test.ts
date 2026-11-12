import assert from 'node:assert/strict';
import { it } from 'node:test';
import { dateRange, shortDate, statsAxisLabel } from './workoutStats.ts';

it('formate les bornes et jours japonais dans le fuseau du profil, indépendamment du téléphone', () => {
  const from = '2026-11-09T00:00:00+09:00';
  assert.equal(shortDate(from, 'Asia/Tokyo'), '9 nov.');
  assert.equal(statsAxisLabel(from, 'week', 'Asia/Tokyo'), 'lun');
  assert.equal(dateRange(from, '2026-11-10T00:00:00+09:00', 'Asia/Tokyo'), '9 nov.');
  assert.equal(dateRange(from, '2026-11-12T00:00:00+09:00', 'Asia/Tokyo'), '9 nov. – 11 nov.');
});

it('formate une fin exclusive sans soustraire un jour de 24 h au changement DST', () => {
  assert.equal(dateRange('2026-10-25T00:00:00+02:00', '2026-10-26T00:00:00+01:00', 'Europe/Paris'), '25 oct.');
  assert.equal(dateRange('2026-03-29T00:00:00+01:00', '2026-03-30T00:00:00+02:00', 'Europe/Paris'), '29 mars');
  assert.equal(statsAxisLabel('2026-01-01T00:00:00+09:00', 'year', 'Asia/Tokyo'), 'janv');
});
