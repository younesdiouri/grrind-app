/**
 * Le sérialiseur de rafraîchissement.
 *
 * **C'est le piège le plus coûteux du contrat.** Le refresh token est à usage unique, rotatif
 * et groupé par famille — une famille est un appareil. Le back révoque **toute la famille**
 * quand un jeton déjà consommé est rejoué : il ne peut pas distinguer le voleur du vrai client
 * qui a été doublé, donc il coupe.
 *
 * Conséquence directe, et elle n'a rien de théorique : deux requêtes qui expirent en même
 * temps et déclenchent chacune un rafraîchissement **déconnectent l'appareil**. La première
 * consomme le jeton, la seconde le rejoue, le back révoque la famille, l'utilisateur retombe
 * sur l'écran de connexion sans rien avoir fait.
 *
 * Ce module tient donc deux règles, et elles sont toutes les deux nécessaires :
 *
 * 1. **Une promesse unique et partagée.** Les appels concurrents attendent la même, puis
 *    rejouent avec la paire neuve.
 * 2. **Le jeton refusé se compare au jeton courant.** Une requête partie *avant* un
 *    rafraîchissement et revenue *après* porte un 401 qui ne prouve rien : la session est
 *    vivante, c'est juste son jeton à elle qui était périmé. Elle rejoue avec le jeton
 *    courant sans en brûler un de plus.
 *
 * Il n'a aucune dépendance d'exécution, pour que ces deux règles se prouvent sous
 * `node --test` plutôt que se constater sur un appareil déconnecté.
 */

export type RefreshCoordinator = {
  /**
   * Rend un jeton d'accès utilisable, ou `null` si la session est morte.
   *
   * `staleToken` est le jeton avec lequel la requête refusée était partie — `null` quand elle
   * est partie sans jeton du tout.
   */
  refresh: (staleToken: string | null) => Promise<string | null>;
};

export type RefreshCoordinatorDeps = {
  /** Le jeton d'accès en mémoire, au moment de l'appel. */
  currentAccessToken: () => string | null;
  /**
   * Le rafraîchissement réel : consomme le refresh token, persiste la paire neuve, rend le
   * nouveau jeton d'accès — ou `null` si la session est morte.
   */
  performRefresh: () => Promise<string | null>;
};

export function createRefreshCoordinator(deps: RefreshCoordinatorDeps): RefreshCoordinator {
  let inFlight: Promise<string | null> | null = null;

  return {
    refresh(staleToken) {
      const current = deps.currentAccessToken();

      // Règle 2. Quelqu'un a déjà renouvelé pendant que cette requête était en vol.
      if (staleToken !== null && current !== null && current !== staleToken) {
        return Promise.resolve(current);
      }

      // Règle 1. Aucun `await` entre ce test et l'affectation plus bas : c'est ce qui rend
      // la sérialisation étanche. JavaScript est mono-thread, donc tant que rien ne rend la
      // main ici, deux appelants ne peuvent pas tous les deux trouver `inFlight` à `null`.
      if (inFlight !== null) {
        return inFlight;
      }

      const run = deps.performRefresh().then(
        (token) => {
          inFlight = null;
          return token;
        },
        (error: unknown) => {
          inFlight = null;
          throw error;
        },
      );

      inFlight = run;
      return run;
    },
  };
}
