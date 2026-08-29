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

/**
 * « 16 tours », « 1 tour ».
 *
 * Le nombre de tours est le seul indicateur de l'allure d'un combat que la liste porte : un
 * combat de trois tours et un de trente-trois ne se sont pas joués de la même façon, et c'est
 * ce qui donne envie d'en rouvrir un plutôt qu'un autre.
 */
export function formatTurns(turns: number): string {
  return turns > 1 ? `${turns} tours` : `${turns} tour`;
}
