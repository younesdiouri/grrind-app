import type { LeagueState } from './league';

/** Presentation specimen only; live identities always come from the API. */
export const LEAGUE_FIXTURE: LeagueState = {
  league: { tier: 'GOLD', tierOrder: 2, lootLuckPercent: 10 },
  weekStartsAt: '2026-10-26T00:00:00+01:00', weekEndsAt: '2026-11-02T00:00:00+01:00', timezone: 'Europe/Paris',
  isParticipating: true, score: 2480, rank: 3, participantCount: 18, projectedMovement: 'PROMOTED',
  movementPercent: 20, minimumPlayersForRelegation: 5,
  lastResult: { weekStartsAt: '2026-10-19T00:00:00+02:00', weekEndsAt: '2026-10-26T00:00:00+01:00',
    settledAt: '2026-10-26T00:00:15+01:00', tier: 'SILVER', nextTier: 'GOLD', movement: 'PROMOTED',
    score: 3100, rank: 1, participantCount: 12, rulesetVersion: 'v1' },
};
