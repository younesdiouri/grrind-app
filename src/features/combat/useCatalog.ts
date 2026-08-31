import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, type Failure } from '@/features/auth/problems';
import {
  getEquipmentRevision,
  subscribeToEquipment,
} from '@/features/inventory/equipmentRevision';
import { catalogFor, type CatalogEntry } from './catalog.ts';

/**
 * Le catalogue des adversaires, et le niveau qui décide de ce qui est accessible.
 *
 * ————— Pourquoi les deux ensemble ————————————————————————————————————————————————————
 *
 * `GET /api/enemies` rend le catalogue entier, `minimumLevel` compris, et depuis #227 le
 * combattant de l'appelant — mais pas son **niveau**, qui vient de `GET /api/progression` et
 * décide seul de ce qui est verrouillé. Séparés, les deux arriveraient l'un après l'autre et
 * le catalogue s'afficherait **d'abord tout déverrouillé**, puis se refermerait sous les
 * doigts une fois le niveau connu — le pire des deux ordres, puisqu'il propose avant de
 * refuser.
 *
 * Ils partent donc en parallèle et se posent d'un bloc, comme `usePlayerHome` le fait pour la
 * progression et l'historique, et pour la même raison : deux routes parce que le serveur les
 * sert séparément, pas parce que l'écran les vit séparément.
 *
 * L'échec suit la même règle : sans le niveau, il n'y a rien de cohérent à montrer — un
 * catalogue dont on ne sait pas ce qui est jouable n'est pas un catalogue.
 */
export type Catalog =
  | { step: 'loading' }
  | {
      step: 'ready';
      entries: CatalogEntry[];
      playerLevel: number;
      /**
       * Le combattant de l'appelant, modificateurs équipés compris (#227). Requis au contrat
       * sur `EnemyCatalog` : il arrive avec le catalogue ou l'écran n'est pas prêt — pas de
       * repli, pas d'état « en attente ».
       */
      player: components['schemas']['BattleFighter'];
    }
  | { step: 'failed'; failure: Failure };

export function useCatalog(): { catalog: Catalog; reload: () => void } {
  const [catalog, setCatalog] = useState<Catalog>({ step: 'loading' });

  const load = useCallback(async (): Promise<Catalog> => {
    const [enemies, progression] = await Promise.all([
      api.GET('/api/enemies'),
      api.GET('/api/progression'),
    ]);

    if (enemies.data === undefined) {
      return { step: 'failed', failure: failureFrom(enemies.error) };
    }

    if (progression.data === undefined) {
      return { step: 'failed', failure: failureFrom(progression.error) };
    }

    return {
      step: 'ready',
      entries: catalogFor(enemies.data.enemies, progression.data.level),
      playerLevel: progression.data.level,
      player: enemies.data.player,
    };
  }, []);

  const reload = useCallback(() => {
    setCatalog({ step: 'loading' });
    void load().then(setCatalog);
  }, [load]);

  /**
   * Combien de fois l'équipement a changé dans cette session (#30).
   *
   * `player` porte les modificateurs équipés : il vieillit donc dès qu'on porte ou retire un
   * objet dans le sac. Et cet onglet ne se démonte pas — c'est tout l'intérêt d'une barre
   * d'onglets — donc rien ne le relirait au retour. On se rebranche sur le compteur, comme
   * `useBattleHistory` se rebranche sur les combats livrés, et pour la même raison : l'écran
   * qu'on retrouve doit être celui d'après le geste, pas celui d'avant.
   *
   * Le catalogue lui-même n'a pas bougé, mais il arrive dans la même réponse : il n'y a rien
   * à relire plus finement, et une route de moins vaut mieux qu'une lecture partielle.
   */
  const equipped = useSyncExternalStore(subscribeToEquipment, getEquipmentRevision);

  useEffect(() => {
    let alive = true;

    void load().then((next) => {
      if (alive) {
        setCatalog(next);
      }
    });

    return () => {
      alive = false;
    };
  }, [load, equipped]);

  return { catalog, reload };
}
