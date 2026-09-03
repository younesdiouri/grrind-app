/**
 * Deux cartes au plus dans le bilan final.
 *
 * L'anneau, les totaux et l'affordance de sortie partagent la même zone centrale : les titres
 * et le butin doivent donc se partager ce budget plutôt que de disposer chacun du leur. Les
 * titres passent d'abord, car un déblocage est l'événement le plus rare ; chaque autre élément
 * reste explicitement compté par le bilan.
 */
const RECAP_CARDS = 2;

export function recapCards<Title, Loot>(titles: readonly Title[], loot: readonly Loot[]) {
  const shownTitles = titles.slice(0, RECAP_CARDS);
  const shownLoot = loot.slice(0, RECAP_CARDS - shownTitles.length);

  return {
    titles: shownTitles,
    loot: shownLoot,
    remainingTitles: titles.length - shownTitles.length,
    remainingLoot: loot.length - shownLoot.length,
  };
}
