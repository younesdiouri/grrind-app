import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leaguePollDelay, leagueProjection, leagueRank } from './league.ts';
import { LEAGUE_FIXTURE } from './leagueFixtures.ts';

test('une première semaine reste non classée, sans promesse de promotion', () => {
  const fresh = { ...LEAGUE_FIXTURE, isParticipating: false, score: 0, rank: null, participantCount: 0 };
  assert.equal(leagueRank(fresh), 'Non classé · 0 participants');
  assert.match(leagueProjection(fresh), /première semaine/);
});

test('le rang de compétition et le mouvement viennent du serveur, même à égalité ou en Diamant', () => {
  assert.equal(leagueRank({ rank: 1, participantCount: 7 }), '1er / 7 participants');
  assert.equal(leagueRank({ rank: 3, participantCount: 7 }), '3e / 7 participants');
  assert.equal(leagueProjection({ ...LEAGUE_FIXTURE, rank: 1, projectedMovement: 'RELEGATED' }), 'Relégation provisoire');
  assert.equal(leagueProjection({ ...LEAGUE_FIXTURE, projectedMovement: 'PROMOTED' }), 'Promotion provisoire');
  assert.equal(leagueProjection({ ...LEAGUE_FIXTURE, league: { tier: 'DIAMOND', tierOrder: 4, lootLuckPercent: 20 },
    projectedMovement: 'MAINTAINED' }), 'Maintien provisoire');
});

test('l’échéance Paris déclenche un rafraîchissement, jamais une clôture calculée localement', () => {
  const end = Date.parse(LEAGUE_FIXTURE.weekEndsAt);
  assert.equal(leaguePollDelay(LEAGUE_FIXTURE, end - 120_000), 60_000);
  assert.equal(leaguePollDelay(LEAGUE_FIXTURE, end - 2000), 2000);
  assert.equal(leaguePollDelay(LEAGUE_FIXTURE, end), 5000);
  assert.equal(leaguePollDelay(undefined, end), false);
});
