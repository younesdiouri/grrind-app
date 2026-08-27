import type { components } from '@/api/schema';

/**
 * Ce qui explique la Vitality — **et pourquoi le nombre seul ne suffit pas** (#77).
 *
 * ————— Le problème que ces trois nombres résolvent ————————————————————————————————————
 *
 * Vitality a deux moitiés. La première — la variété des sports pratiqués — se calcule à partir
 * du ledger d'XP, donc elle ne bouge que quand une séance est créditée : le joueur voit la
 * cause. La seconde est la **santé de fond**, l'énergie active dépensée sur une fenêtre
 * glissante, et elle bouge toute seule — sans séance, sans notification, sans rien.
 *
 * Une valeur qui monte sans cause visible ne récompense rien. Pire, elle rend le chiffre
 * suspect : quelqu'un qui voit sa Vitality changer entre deux ouvertures sans avoir rien fait
 * ne conclut pas « j'ai bougé cette semaine », il conclut que l'app compte mal.
 *
 * D'où la règle du ticket, écrite en toutes lettres : **ne pas afficher le nombre seul**. Le
 * serveur envoie `vitalityBreakdown` exactement pour ça, et ce module en fait des phrases.
 *
 * ————— Aucun calcul de jeu ————————————————————————————————————————————————————————————
 *
 * `bonusPermille` est **appliqué**, jamais à appliquer : la Vitality affichée le contient déjà.
 * Ce module ne fait que le rendre lisible — des millièmes en pourcentage — et il ne recalcule
 * rien à partir de la moyenne et de la cible. Le jour où l'équilibrage change (7 jours,
 * 500 kcal, +20 % plafonné sont en config côté serveur), rien ne bouge ici.
 */
export type VitalityBreakdown = components['schemas']['Progression']['vitalityBreakdown'];

/**
 * Le bonus en pourcentage, à la française.
 *
 * Des millièmes parce que le serveur travaille en entiers — 168‰ vaut +16,8 %. On garde une
 * décimale quand elle dit quelque chose et on la retire quand elle vaut zéro : « +20,0 % »
 * fait précis là où c'est rond.
 */
export function formatBonusPermille(permille: number): string {
  const percent = permille / 10;
  const rounded = Math.round(percent * 10) / 10;

  return `+${String(rounded).replace('.', ',')} %`;
}

/**
 * La phrase qui accompagne le chiffre. `null` quand il n'y a rien à expliquer.
 *
 * Deux états, et ils ne se disent pas pareil :
 *
 * - **un bonus acquis** — on dit combien, et sur quoi il est assis. La moyenne est la mesure,
 *   la cible est le repère : sans elle, « 420 kcal » ne se compare à rien.
 * - **pas encore de bonus** — on ne fait pas semblant d'en annoncer un, et surtout on ne
 *   reproche rien. On dit où en est la moyenne et ce qu'il faut atteindre, ce qui est une
 *   information utile plutôt qu'un constat d'échec.
 *
 * `null` seulement quand la fenêtre est **vide de tout** : une app installée le jour même n'a
 * ni moyenne ni bonus, et lui parler d'une cible qu'elle n'a pas eu le temps de viser serait
 * lui reprocher d'être neuve.
 */
export function explainVitality(
  breakdown: VitalityBreakdown,
): { bonus: string | null; detail: string } | null {
  if (breakdown.windowAverageActiveKcal <= 0 && breakdown.bonusPermille <= 0) {
    return null;
  }

  const average = `${breakdown.windowAverageActiveKcal} kcal actives par jour en moyenne`;
  const target = `cible ${breakdown.targetActiveKcal}`;

  if (breakdown.bonusPermille <= 0) {
    return {
      bonus: null,
      detail: `${average} — ${target}. Bouge un peu plus au quotidien et ta Vitalité montera.`,
    };
  }

  return {
    bonus: formatBonusPermille(breakdown.bonusPermille),
    detail: `${average} — ${target}.`,
  };
}
