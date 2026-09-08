import type { components } from '@/api/schema';
import { formatWhen } from '@/features/progression/format';

/**
 * La mise en phrase de l'historique des combats.
 *
 * **La date passe par `formatWhen`, elle n'est pas réécrite ici.** « Quand ce combat a-t-il
 * eu lieu » est exactement la question que se pose l'historique des séances, et elle appelle
 * la même réponse — aujourd'hui et hier avec l'heure, la date seule au-delà. En recopier une
 * variante donnerait deux listes qui datent leurs lignes différemment dans la même app, et la
 * divergence ne se verrait qu'en les ouvrant côte à côte.
 *
 * `formatCalendarDate` de `community/format.ts` ne convient pas : il est délibérément **sans
 * heure**, parce qu'une fondation de guilde ne se compare à rien. Deux combats livrés le même
 * après-midi, si.
 */
export function formatFoughtAt(foughtAt: string, now: Date): string {
  return formatWhen(foughtAt, now);
}

export function formatBattleCounts(battle: Pick<components['schemas']['BattleSummary'], 'attackCount' | 'actionCount' | 'endReason'>): string {
  return `${battle.actionCount} action${battle.actionCount > 1 ? 's' : ''} · ${battle.attackCount} tentative${battle.attackCount > 1 ? 's' : ''} · ${battle.endReason === 'KO' ? 'KO' : 'Limite atteinte'}`;
}
