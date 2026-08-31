import type { ProblemType } from '@/features/auth/problems';

/**
 * Pourquoi une session a été jetée — ou, depuis le `#142`, pourquoi elle a simplement vacillé
 * sans être jetée. `SessionLostEntry` (`diagnostics/journal.ts`) persiste ce que ce module
 * construit ; il ne persiste rien lui-même.
 *
 * Quatre `kind`. Deux d'entre eux — le refus de `/api/auth/refresh` et le refus d'une route
 * authentifiée quelconque (`meansSessionOver`, `problems.ts`) — partagent `serverRefusal`,
 * parce que les deux disent « le serveur a refusé le jeton », mais se distinguent par `origin`.
 * Voir le commentaire de `serverRefusal` plus bas : les fondre sans cette distinction aurait
 * reproduit, un cran plus bas, exactement l'indiscernabilité que ce module existe pour
 * supprimer. `keychainUnavailable` fait le même choix, pour la même raison, entre `read` et
 * `write` — voir son commentaire.
 *
 * **Ce module ne dit plus seulement « `forget()` a été appelé »** (`#142`). `keychainUnavailable`
 * couvre aussi le cas où `session.ts` a tracé sans jeter : un trousseau illisible ne vide pas la
 * session, et un trousseau inscriptible en échec ne l'interrompt pas non plus. Voir le
 * commentaire de `keychainUnavailable` ci-dessous, et celui de `noteSessionLost`
 * (`diagnostics/journal.ts`).
 *
 * Séparé de `session.ts` pour la même raison que `refreshCoordinator.ts` en est séparé : la
 * distinction la plus délicate du `#143`, et celle du `#142`, se prouvent sous `node --test`,
 * pas sur un appareil où plusieurs de ces cas produisent le même écran — mais pas tous : voir
 * `keychainUnavailable`. `session.ts` dépend d'`expo-secure-store` et
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
  | {
      kind: 'keychainUnavailable';
      /**
       * `expo-secure-store` a jeté au lieu de rendre une valeur (`#142`) — trousseau verrouillé,
       * item présent mais inaccessible (`errSecInteractionNotAllowed` et consorts). Ce n'est ni
       * un jeton absent (`missingToken`) ni un refus du serveur : personne n'a tranché, le
       * trousseau n'a simplement pas répondu.
       *
       * `read` : `performRefresh()` n'a pas pu **lire** le trousseau. Le refresh token est peut-
       * être toujours là — on ne le sait pas, et c'est justement le point : ni `forget()`
       * n'est appelé, ni le disque n'est touché. `state` retombe quand même sur `signedOut`
       * (`restore()` doit relâcher l'écran de démarrage), donc vu du joueur c'est indiscernable
       * d'un vrai départ ; d'où la trace, pour que ce ne soit plus indiscernable d'ici.
       *
       * `write` : `adopt()` n'a pas pu **écrire** la paire neuve. Moins visible que `read` : la
       * session reste `signedIn` en mémoire jusqu'à la fermeture de l'app, seul le disque est en
       * retard. Elle mérite quand même une trace, parce que le disque garde alors un refresh
       * token déjà consommé par le serveur — la vraie façon de perdre une session, à la
       * prochaine ouverture.
       */
      operation: 'read' | 'write';
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
 * connecté hier dont le jeton a disparu du trousseau entre deux ouvertures. L'appelant doit donc
 * lire `hadSession` depuis un marqueur **persisté** qui survit à la fermeture de l'app
 * (`sessionActive`, dans le journal),
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

/**
 * Le trousseau a jeté au lieu de rendre une valeur — voir le commentaire de la branche
 * `keychainUnavailable` ci-dessus pour ce que chaque `operation` veut dire.
 *
 * Ne prend jamais l'erreur elle-même en paramètre : `expo-secure-store` ne remonte qu'un statut
 * Keychain, jamais le secret qu'il protège, mais ce module n'a de toute façon rien à faire d'un
 * détail qui ne changerait pas la décision — voir le docblock en tête de fichier, « jamais le
 * jeton, sous aucune forme ».
 */
export function keychainUnavailableReason(operation: 'read' | 'write'): SessionLostReason {
  return { kind: 'keychainUnavailable', operation };
}

/** L'utilisateur a demandé `signOut()`. Toujours tracée : c'est le seul départ voulu. */
export function signedOutReason(): SessionLostReason {
  return { kind: 'signedOut' };
}
