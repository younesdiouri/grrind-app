import type { components } from '@/api/schema';
import { leagueArt } from '@/design/tokens';

export type LeagueState = components['schemas']['LeagueState'];
export type LeagueTier = components['schemas']['LeagueIdentity']['tier'];
export const leagueLabel: Record<LeagueTier, string> = {
  BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', PLATINUM: 'Platine', DIAMOND: 'Diamant',
};
export const movementLabel: Record<LeagueState['projectedMovement'], string> = {
  PROMOTED: 'Promotion', MAINTAINED: 'Maintien', RELEGATED: 'Relégation',
};
export function leagueRank(state: Pick<LeagueState, 'rank' | 'participantCount'>) {
  const rank = state.rank === null ? 'Non classé ·' : `${state.rank}${state.rank === 1 ? 'er' : 'e'} /`;
  return `${rank} ${state.participantCount} participant${state.participantCount === 1 ? '' : 's'}`;
}
export function leagueProjection(state: LeagueState) {
  return state.isParticipating ? `${movementLabel[state.projectedMovement]} provisoire`
    : 'Ta première semaine commence avec de l’XP sportive.';
}
export function leaguePollDelay(state: LeagueState | undefined, now: number): number | false {
  if (!state) return false;
  const remaining = Date.parse(state.weekEndsAt) - now;
  return remaining <= 0 ? leagueArt.settlementPollMs : Math.max(1000, Math.min(leagueArt.pollMs, remaining));
}
export function leagueDeadline(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris',
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}
