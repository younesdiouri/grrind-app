import type { components } from '@/api/schema';

type AlamParticipant = components['schemas']['AlamParticipant'];

/** Keep contribution ordering stable without modifying the server snapshot. */
export function raidMembers(participants: Pick<AlamParticipant, 'playerId' | 'displayName' | 'contribution'>[]) {
  return [...participants].sort((left, right) => right.contribution - left.contribution)
    .map((player) => ({ id: player.playerId, name: player.displayName }));
}
