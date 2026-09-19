import type { components } from '@/api/schema';
import { alamMotion } from '@/design/tokens';
import type { BattleBeat } from '@/features/combat/timeline';

/** Adaptateur de poses uniquement : les champs de dégâts du renderer solo restent inutilisés. */
export function raidBeats(events: components['schemas']['AlamEvent'][]): BattleBeat[] {
  return events.flatMap((event, index): BattleBeat[] => {
    if (event.action !== 'EFFORT' && event.action !== 'DEFEAT') return [];
    return [{ kind: 'attack', at: event.offsetMs, until: event.offsetMs + alamMotion.impulseDuration,
      index, attacker: event.action === 'EFFORT' ? 'PLAYER' : 'ENEMY', damage: 0, mitigated: 0 }];
  });
}
