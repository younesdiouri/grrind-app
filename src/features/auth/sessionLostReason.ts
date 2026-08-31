import type { ProblemType } from '@/features/auth/problems';

/**
 * Pourquoi une session a été jetée, et par lequel des quatre points de `session.ts` qui
 * appellent `forget()`. C'est la seule information qui manquait pour faire avancer le `#142` :
 * le back ne révoque aucune famille de refresh tokens, donc c'est forcément l'un de ces quatre
 * points qui a tiré, et rien ne disait lequel. `SessionLostEntry` (`diagnostics/journal.ts`)
 * persiste ce que ce module construit ; il ne persiste rien lui-même.
 *
 * Quatre points, trois `kind` : deux d'entre eux — le refus de `/api/auth/refresh` et le refus
 * d'une route authentifiée quelconque (`meansSessionOver`, `problems.ts`) — partagent
 * `serverRefusal`, parce que les deux disent « le serveur a refusé le jeton », mais se
 * distinguent par `origin`. Voir le commentaire de `serverRefusal` plus bas : les fondre sans
 * cette distinction aurait reproduit, un cran plus bas, exactement l'indiscernabilité que ce
 * ticket existe pour supprimer.
 *
 * Séparé de `session.ts` pour la même raison que `refreshCoordinator.ts` en est séparé : la
 * distinction la plus délicate du `#143` se prouve sous `node --test`, pas sur un appareil où
 * les quatre points produisent le même écran. `session.ts` dépend d'`expo-secure-store` et
 * d'`openapi-fetch`, aucun des deux ne se charge sous `node --test` — ce module-ci n'a lui
 * aucune dépendance d'exécution, et porte donc la seule part testable de la décision.
 *
 * **Jamais le jeton, sous aucune forme.** Rien ici ne prend un refresh token ni un jeton
 * d'accès en paramètre — ni entier, ni tronqué, ni haché, ni sa longueur. C'est la session
 * elle-même ; la porter la transformerait en ce qu'il fallait protéger.
 */
export type SessionLostReason =
  | { kind: 'missingToken' }
  | {
      kind: 'serverRefusal';
      /**
       * D'où vient le refus — et ce n'est pas un détail, c'est toute la valeur de la
       * distinction : les deux origines n'accusent pas la même chose.
       *
       * `refreshEndpoint` : `401`/`422` sur `/api/auth/refresh` lui-même. Le **refresh token**
       * a été refusé — ça accuse la rotation, le trousseau, la famille.
       *
       * `authenticatedRoute` : `access-token-invalid`/`access-token-missing` sur n'importe
       * quelle autre route (`meansSessionOver`, `problems.ts`). Le **JWT** a été jugé
       * irrécupérable — ça accuse la signature, l'horloge, ou une clé qui a tourné côté back.
       *
       * Le `type` problem+json sépare les deux la plupart du temps, mais il peut être `null`
       * (corps illisible, proxy qui répond du HTML) — et c'est alors précisément le moment où
       * `origin` reste la seule information qui distingue les deux enquêtes.
       */
      origin: 'refreshEndpoint' | 'authenticatedRoute';
      /**
       * `401` ou `422` pour `refreshEndpoint` ; toujours `401` pour `authenticatedRoute`, le
       * middleware n'appelant `refresh()` que sur ce statut-là (`authMiddleware.ts`). Un `422`
       * supposerait un jeton malformé côté client, ce qui n'est pas la même enquête qu'un `401`.
       */
      status: number;
      type: ProblemType | null;
    }
  | { kind: 'signedOut' };

/**
 * `performRefresh()` a trouvé le trousseau vide.
 *
 * **Le piège du ticket.** `restore()` appelle ce chemin à chaque démarrage, y compris quand
 * personne ne s'est jamais connecté sur cet appareil : un trousseau vide y est le déroulement
 * **normal** d'un premier lancement, pas un abandon. On ne trace donc que si une session était
 * déjà là.
 *
 * `hadSession` ne peut **pas** venir de `state.status === 'signedIn'` : au tout premier appel
 * de `restore()`, `state` vaut encore `{ status: 'restoring' }`, y compris pour un utilisateur
 * connecté hier dont le jeton a disparu du trousseau entre deux ouvertures — exactement le
 * symptôme que le `#142` doit expliquer. L'appelant doit donc lire `hadSession` depuis un
 * marqueur **persisté** qui survit à la fermeture de l'app (`sessionActive`, dans le journal),
 * pas depuis l'état en mémoire du seul process courant. Sans cette garde, le journal se
 * remplirait d'un faux positif à chaque ouverture déconnectée et noierait l'événement rare
 * qu'on cherche.
 */
export function missingTokenReason(hadSession: boolean): SessionLostReason | null {
  return hadSession ? { kind: 'missingToken' } : null;
}

/** Le serveur a refusé le jeton — voir le commentaire de la branche `serverRefusal` ci-dessus. */
export function serverRefusalReason(
  origin: 'refreshEndpoint' | 'authenticatedRoute',
  status: number,
  type: ProblemType | null,
): SessionLostReason {
  return { kind: 'serverRefusal', origin, status, type };
}

/** L'utilisateur a demandé `signOut()`. Toujours tracée : c'est le seul départ voulu. */
export function signedOutReason(): SessionLostReason {
  return { kind: 'signedOut' };
}
