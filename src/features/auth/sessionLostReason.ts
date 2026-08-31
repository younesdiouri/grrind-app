import type { ProblemType } from '@/features/auth/problems';

/**
 * Pourquoi une session a été jetée, et par laquelle des trois branches de `session.ts` qui
 * appellent `forget()`. C'est la seule information qui manquait pour faire avancer le `#142` :
 * le back ne révoque aucune famille de refresh tokens, donc c'est forcément l'une de ces trois
 * branches qui a tiré, et rien ne disait laquelle. `SessionLostEntry`
 * (`diagnostics/journal.ts`) persiste ce que ce module construit ; il ne persiste rien
 * lui-même.
 *
 * Séparé de `session.ts` pour la même raison que `refreshCoordinator.ts` en est séparé : la
 * distinction la plus délicate du `#143` se prouve sous `node --test`, pas sur un appareil où
 * les trois branches produisent le même écran. `session.ts` dépend d'`expo-secure-store` et
 * d'`openapi-fetch`, aucun des deux ne se charge sous `node --test` — ce module-ci n'a lui
 * aucune dépendance d'exécution, et porte donc la seule part testable de la décision.
 *
 * **Jamais le jeton, sous aucune forme.** Rien ici ne prend un refresh token ni un jeton
 * d'accès en paramètre — ni entier, ni tronqué, ni haché, ni sa longueur. C'est la session
 * elle-même ; la porter la transformerait en ce qu'il fallait protéger.
 */
export type SessionLostReason =
  | { kind: 'missingToken' }
  /**
   * Le serveur a refusé le jeton. Deux origines partagent cette même branche : `401`/`422` sur
   * `/api/auth/refresh` lui-même, et `access-token-invalid`/`access-token-missing` sur
   * n'importe quelle autre route (`meansSessionOver`, `problems.ts`) — les deux disent « le
   * serveur a refusé le jeton », seul l'endroit d'où vient le refus change. `status` distingue
   * les deux `401`/`422` de `/api/auth/refresh` ; un `422` supposerait un jeton malformé côté
   * client, ce qui n'est pas la même enquête qu'un `401`.
   */
  | { kind: 'serverRefusal'; status: number; type: ProblemType | null }
  | { kind: 'signedOut' };

/**
 * `performRefresh()` a trouvé le trousseau vide.
 *
 * **Le piège du ticket.** `restore()` appelle ce chemin à chaque démarrage, y compris quand
 * personne ne s'est jamais connecté sur cet appareil : un trousseau vide y est le déroulement
 * **normal** d'un premier lancement, pas un abandon. On ne trace donc que si une session était
 * déjà là — `hadSession` doit valoir `state.status === 'signedIn'`, lu par l'appelant **avant**
 * que `forget()` ne le remette à `signedOut`. Sans cette garde, le journal se remplirait d'un
 * faux positif à chaque ouverture déconnectée et noierait l'événement rare qu'on cherche.
 */
export function missingTokenReason(hadSession: boolean): SessionLostReason | null {
  return hadSession ? { kind: 'missingToken' } : null;
}

/** Le serveur a refusé le jeton — voir le commentaire de la branche `serverRefusal` ci-dessus. */
export function serverRefusalReason(status: number, type: ProblemType | null): SessionLostReason {
  return { kind: 'serverRefusal', status, type };
}

/** L'utilisateur a demandé `signOut()`. Toujours tracée : c'est le seul départ voulu. */
export function signedOutReason(): SessionLostReason {
  return { kind: 'signedOut' };
}
