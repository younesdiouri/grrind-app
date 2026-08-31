import combatLong from '@/../fixtures/battle/combat-long.json';
import defaiteBoss from '@/../fixtures/battle/defaite-boss.json';
import victoire from '@/../fixtures/battle/victoire.json';
import victoireAvecLoot from '@/../fixtures/battle/victoire-avec-loot.json';

import type { Battle } from './timeline.ts';

/**
 * Les fixtures de combat — des **réponses réelles** du back, capturées par
 * `scripts/capture-battles.sh` sous l'équilibrage `config/game/v1/`.
 *
 * Rien n'est inventé ici, même règle que `reward/fixtures.ts`.
 *
 * - `victoire` — compte neuf, `SAND_JACKAL` choisi par le serveur. 15 tours, 17 événements,
 *   aucune mitigation des deux côtés : des attaques nues. C'est le socle, et il prouve que
 *   l'animation tient avant toute forme rare. Une victoire qui rapporte déjà quelques pièces,
 *   sans loot — voir `victoireAvecLoot` pour l'objet.
 * - `victoireAvecLoot` — le même compte, capturé après un tirage (#227) : `SAND_JACKAL` fait
 *   tomber des Baskets usées et 4 pièces. C'est la fixture qui prouve qu'un butin ne déplace
 *   pas un seul battement de `buildBattleTimeline` — le bilan le lit, la timeline l'ignore.
 * - `defaiteBoss` — un compte monté au niveau 19 contre `DUNE_SOVEREIGN`. 19 tours,
 *   24 événements, et **les cinq formes d'un coup** : une esquive, trois tours
 *   supplémentaires, et le joueur qui tombe. C'est la fixture qui porte tout le vocabulaire.
 *   `rewards` y est vide : une défaite ne rapporte rien.
 * - `combatLong` — le même compte contre `IRON_JACKAL`. 33 tours, 36 événements : le plus
 *   long que l'équilibrage actuel produise, et une autre défaite sans rapport.
 *
 * ————— Ce que ces fixtures ne prouvent pas, et qu'il ne faut pas maquiller ——————————————
 *
 * **Aucune n'approche `max_turns`.** Le plafond est à 200 tours, soit près de 400 événements ;
 * le plus long capturable en fait 36. Ce n'est pas un manque de patience du script — c'est
 * l'équilibrage : un joueur meurt ou tue bien avant.
 *
 * Le tempo au plancher se prouve donc par un **test sur une liste d'événements fabriquée**,
 * dans `timeline.test.ts`. `buildBattleTimeline` est pure et son entrée est un tableau : lui
 * en passer deux cents ne prétend pas que c'est une réponse du serveur. Écrire ici une
 * quatrième fixture « longue » à la main, en revanche, mettrait une réponse inventée dans un
 * dossier qui promet le contraire — et le mensonge survivrait au commentaire qui l'excuse.
 *
 * Le `as unknown as` est là pour la même raison que dans `reward/fixtures.ts` : TypeScript
 * élargit les littéraux d'un import JSON en `string`, quand le schéma généré attend les unions
 * fermées (`"VICTORY"`, `"ATTACK"`, `"PLAYER"`…). Le fichier vient du serveur qui produit ce
 * schéma : la forme est garantie à la source.
 */
export const BATTLE_FIXTURES = {
  victoire: victoire as unknown as Battle,
  victoireAvecLoot: victoireAvecLoot as unknown as Battle,
  defaiteBoss: defaiteBoss as unknown as Battle,
  combatLong: combatLong as unknown as Battle,
} as const;

export type BattleFixtureName = keyof typeof BATTLE_FIXTURES;
