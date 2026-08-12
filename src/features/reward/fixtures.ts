import levelUp from '@/../fixtures/reward-summary/level-up.json';
import nominal from '@/../fixtures/reward-summary/nominal.json';
import plat from '@/../fixtures/reward-summary/plat.json';

import type { RewardSummary } from './timeline';

/**
 * Les fixtures du spike — des **réponses réelles** du back, capturées par
 * `scripts/capture-fixtures.sh` sous l'équilibrage `config/game/v1/`.
 *
 * Rien n'est inventé ici. Une fixture écrite à la main prouverait que l'animation marche sur
 * des chiffres choisis pour qu'elle marche ; celles-ci portent ce que le jeu produit vraiment,
 * y compris ce qui dérange :
 *
 * - `nominal` — 90 XP, une seule ligne, aucun niveau franchi (le niveau 2 est à 100). Le
 *   premier jour d'un compte, avec le titre `first_steps` qui tombe.
 * - `levelUp` — 145 XP en deux lignes (`BASE 200`, `DIMINISHING −55`), niveau 1 → 2, un point
 *   de compétence. Le cas où tout s'allume.
 * - `plat` — **0 XP accordé** : `BASE 45` puis `DIMINISHING −45`. La barre grimpe, se fait
 *   reprendre, et finit exactement là où elle était. Aucun niveau, aucun titre. C'est le cas
 *   qui décide : une mise en scène qui ne tient que sur le cas joyeux ne tient pas.
 *
 * Le `as unknown as` est là parce que TypeScript élargit les littéraux d'un import JSON en
 * `string`, quand le schéma généré attend les unions fermées (`"RUNNING"`, `"BASE"`…). Le
 * fichier vient du serveur qui produit ce schéma : la forme est garantie à la source.
 */
export const FIXTURES = {
  nominal: nominal as unknown as RewardSummary,
  levelUp: levelUp as unknown as RewardSummary,
  plat: plat as unknown as RewardSummary,
} as const;

export type FixtureName = keyof typeof FIXTURES;
