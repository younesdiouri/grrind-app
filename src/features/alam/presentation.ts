import type { components } from '@/api/schema';
import { alamMotion } from '@/design/tokens';
import { IMPACT, type Impact } from '@/features/combat/camera';
import { contactAt } from '@/features/combat/fighterMotion';
import type { BattleBeat } from '@/features/combat/timeline';

type AlamEvent = components['schemas']['AlamEvent'];
type AlamParticipant = components['schemas']['AlamParticipant'];

const span = (event: AlamEvent) => ({ at: event.offsetMs, until: event.offsetMs + alamMotion.impulseDuration });

/**
 * Adaptateur de poses uniquement : les champs de dégâts du renderer solo restent inutilisés.
 *
 * Avec `actorId`, seuls **ses** efforts deviennent des attaques : chaque membre du premier rang
 * a sa propre liste, et ne s'élance que sur ce qu'il a lui-même livré. Les défaites frappent
 * tout le monde.
 */
export function raidBeats(events: AlamEvent[], actorId?: string): BattleBeat[] {
  return events.flatMap((event, index): BattleBeat[] => {
    if (event.action !== 'EFFORT' && event.action !== 'DEFEAT') return [];
    if (event.action === 'EFFORT' && actorId !== undefined && event.actorId !== actorId) return [];
    return [{ kind: 'attack', ...span(event), index,
      attacker: event.action === 'EFFORT' ? 'PLAYER' : 'ENEMY', damage: 0, mitigated: 0 }];
  });
}

/**
 * Les impacts du raid, pour la caméra et les étincelles : un effort touche le boss, une défaite
 * frappe la guilde, une victoire est le coup final. Triés par instant — le contact d'un effort
 * tombe après son départ, une victoire à son instant même.
 */
export function raidImpacts(events: AlamEvent[]): Impact[] {
  return events.flatMap((event): Impact[] => {
    if (event.action === 'EFFORT') return [{ at: contactAt(span(event)), strength: IMPACT.blow, target: 'ENEMY' }];
    if (event.action === 'DEFEAT') return [{ at: contactAt(span(event)), strength: IMPACT.critical, target: 'PLAYER' }];
    if (event.action === 'VICTORY') return [{ at: event.offsetMs, strength: IMPACT.final, target: 'ENEMY' }];
    return [];
  }).sort((left, right) => left.at - right.at);
}

/** Le premier rang : les plus gros contributeurs, en grand ; les autres restent en pastille derrière. */
export function frontRow<T extends Pick<AlamParticipant, 'playerId' | 'contribution'>>(participants: T[]) {
  const ranked = [...participants].sort((left, right) => right.contribution - left.contribution);
  return { front: ranked.slice(0, alamMotion.frontRow), back: ranked.slice(alamMotion.frontRow) };
}
