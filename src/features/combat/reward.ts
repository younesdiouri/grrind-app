import type { Battle } from './timeline.ts';

export type BattleReward = Battle['rewards'];

/**
 * Un combat a-t-il rapporté quelque chose — du loot, des pièces, ou les deux (#227).
 *
 * Pas une décision de jeu : le serveur envoie déjà `loot: []` et un gain nul pour une défaite,
 * ou pour une victoire tranchée par `max_turns` sans KO — voir le docblock de `BattleReward`
 * dans le contrat. Cette fonction ne fait que le lire, pour que le bilan (`BattleView`) et la
 * ligne d'historique (`BattleRow`, via `combat.tsx`) posent la même question de la même façon
 * au lieu de comparer chacun `loot.length` et `coins.gained` à leur façon.
 *
 * **Une défaite n'affiche rien** : le back a refusé de donner une consolation dessinée, pour
 * que le combat perdu ne devienne pas la stratégie rapide. `hasBattleReward` est la porte par
 * laquelle cette règle passe des deux côtés de l'app.
 */
export function hasBattleReward(reward: BattleReward): boolean {
  return reward.loot.length > 0 || reward.coins.gained > 0;
}
