/**
 * Le sérialiseur de synchronisation.
 *
 * **Même piège que le rafraîchissement, et la même solution.** Deux synchronisations
 * concurrentes enverraient les mêmes workouts deux fois. Le serveur les dédoublonnerait —
 * l'unicité `(source, externalId)` tient — mais le second appel rendrait un `SyncSummary`
 * **vide**, et l'utilisateur perdrait son animation. L'XP serait juste, le produit serait cassé.
 *
 * La fenêtre n'a rien de théorique : l'app s'ouvre, l'authentification s'établit et déclenche
 * une synchronisation ; l'utilisateur tire pour rafraîchir avant qu'elle revienne. Deux
 * déclencheurs, un seul lot à envoyer.
 *
 * D'où la règle unique de ce module : **une promesse partagée**. Les appels concurrents
 * attendent la même et reçoivent le même résultat — celui qui a déclenché la synchronisation
 * comme celui qui est arrivé pendant.
 *
 * ————— Le seuil, qui est un autre problème ——————————————————————————————————————————————
 *
 * La sérialisation ne couvre pas le cas où la précédente est **terminée** : basculer vers ses
 * messages et revenir dix secondes plus tard relancerait une synchronisation complète, avec
 * son aller-retour et son écran. Le seuil s'en charge, et il est distinct — l'un empêche deux
 * synchronisations *simultanées*, l'autre empêche deux synchronisations *rapprochées*.
 *
 * Un déclencheur explicite — le geste de rafraîchissement — **ignore le seuil**. C'est le filet
 * quand tout le reste a raté ; lui opposer « tu as déjà synchronisé il y a vingt secondes »
 * serait exactement le moment où l'app a l'air cassée.
 *
 * Aucune dépendance d'exécution : ni horloge réelle, ni réseau. Les deux règles se prouvent
 * sous `node --test` plutôt que se constater sur un appareil qui a perdu une animation.
 */

/**
 * Pourquoi une synchronisation part. Seul `manual` passe outre le seuil.
 *
 * `background` — le réveil HealthKit (#55) — est un déclencheur automatique comme
 * `foreground` et `launch` : il subit le seuil de trente secondes comme eux. Ce qui le
 * distingue ne vit pas ici mais dans la politique de rejeu (`retryPolicy.ts`) et dans ce que
 * fait l'appelant du résumé : personne ne regarde l'écran pendant un réveil, donc rien ne se
 * joue, voir `sync.ts`.
 */
export type SyncTrigger = 'launch' | 'foreground' | 'manual' | 'background';

/** Ce qu'une demande de synchronisation rend. */
export type SyncOutcome<T> =
  | { status: 'done'; result: T }
  /** Rejointe en cours de route : le résultat est celui de la synchronisation déjà partie. */
  | { status: 'joined'; result: T }
  /** Trop tôt après la précédente. Rien n'est parti, et ce n'est pas une erreur. */
  | { status: 'throttled' };

export type SyncCoordinatorDeps<T> = {
  /**
   * La synchronisation réelle. Reçoit le déclencheur : `perform` en a besoin pour choisir sa
   * politique de rejeu (`retryPolicy.ts`), ce module n'en a pas besoin pour autre chose que le
   * lui transmettre.
   */
  perform: (trigger: SyncTrigger) => Promise<T>;
  /** L'horloge, injectée : un test ne doit pas attendre trente secondes pour prouver un seuil. */
  now: () => number;
  /**
   * Le temps minimum entre deux synchronisations automatiques, en millisecondes.
   *
   * Trente secondes : assez pour absorber un aller-retour vers l'app Messages, assez peu pour
   * qu'un utilisateur qui vient vraiment de finir sa course n'attende pas.
   */
  minimumIntervalMs: number;
};

export type SyncCoordinator<T> = {
  sync: (trigger: SyncTrigger) => Promise<SyncOutcome<T>>;
};

export function createSyncCoordinator<T>(deps: SyncCoordinatorDeps<T>): SyncCoordinator<T> {
  let inFlight: Promise<T> | null = null;
  let lastStartedAt: number | null = null;

  return {
    sync(trigger) {
      // Rejoindre une synchronisation en cours n'est jamais refusé, même sous le seuil : le
      // résultat existe déjà, il suffit de l'attendre. Aucun `await` entre ce test et
      // l'affectation plus bas — JavaScript est mono-thread, donc tant que rien ne rend la
      // main ici, deux appelants ne peuvent pas tous les deux trouver `inFlight` à `null`.
      if (inFlight !== null) {
        return inFlight.then((result) => ({ status: 'joined', result }) as const);
      }

      const at = deps.now();
      if (
        trigger !== 'manual' &&
        lastStartedAt !== null &&
        at - lastStartedAt < deps.minimumIntervalMs
      ) {
        return Promise.resolve({ status: 'throttled' } as const);
      }

      lastStartedAt = at;

      const run = deps.perform(trigger).then(
        (result) => {
          inFlight = null;
          return result;
        },
        (error: unknown) => {
          inFlight = null;
          throw error;
        },
      );

      inFlight = run;
      return run.then((result) => ({ status: 'done', result }) as const);
    },
  };
}
