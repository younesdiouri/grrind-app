import quinzeWorkouts from '@/../fixtures/sync-summary/quinze-workouts.json';
import toutEcarte from '@/../fixtures/sync-summary/tout-ecarte.json';
import troisWorkouts from '@/../fixtures/sync-summary/trois-workouts.json';
import unWorkout from '@/../fixtures/sync-summary/un-workout.json';

import type { SyncSummary } from './timeline';

/**
 * Les fixtures — des **réponses réelles** du back, capturées par `scripts/capture-fixtures.sh`
 * sous l'équilibrage `config/game/v1/`.
 *
 * Rien n'est inventé ici. Une fixture écrite à la main prouverait que l'animation marche sur
 * des chiffres choisis pour qu'elle marche ; celles-ci portent ce que le jeu produit vraiment,
 * y compris ce qui dérange :
 *
 * - `unWorkout` — une seule séance, mais complète : socle, rabot des rendements décroissants,
 *   distance, un niveau franchi, `first_steps` qui tombe. 186 XP.
 * - `troisWorkouts` — trois jours distincts, **deux niveaux franchis** (2 puis 3). C'est le
 *   cas qui prouve la continuité : la barre part du palier de départ de chaque workout, et
 *   l'enchaînement se fait sans un seul recalcul côté client.
 * - `quinzeWorkouts` — le retour de vacances, 1797 XP. C'est la fixture qui décide de la mise
 *   en scène : trois séances en détail, les douze autres condensées.
 * - `toutEcarte` — **0 XP, `totals` à `null`**, cinq séances nommées et quatre raisons de
 *   refus distinctes. C'est le cas qu'on oublie et celui qui se voit.
 *
 * Le `as unknown as` est là parce que TypeScript élargit les littéraux d'un import JSON en
 * `string`, quand le schéma généré attend les unions fermées (`"RUNNING"`, `"BASE"`…). Le
 * fichier vient du serveur qui produit ce schéma : la forme est garantie à la source.
 */
export const FIXTURES = {
  unWorkout: unWorkout as unknown as SyncSummary,
  troisWorkouts: troisWorkouts as unknown as SyncSummary,
  quinzeWorkouts: quinzeWorkouts as unknown as SyncSummary,
  toutEcarte: toutEcarte as unknown as SyncSummary,
} as const;

export type FixtureName = keyof typeof FIXTURES;
