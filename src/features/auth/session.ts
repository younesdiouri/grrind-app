import { publicApi } from '@/api/publicClient';
import type { components } from '@/api/schema';
import {
  asProblem,
  failureFrom,
  meansSessionOver,
  OFFLINE,
  type Failure,
} from '@/features/auth/problems';
import {
  createRefreshCoordinator,
  type RefreshCoordinator,
} from '@/features/auth/refreshCoordinator';
import {
  keychainUnavailableReason,
  missingTokenReason,
  serverRefusalReason,
  signedOutReason,
} from '@/features/auth/sessionLostReason';
import {
  clearRefreshToken,
  getAccessToken,
  readRefreshToken,
  setAccessToken,
  writeRefreshToken,
} from '@/features/auth/tokenStore';
import {
  getJournal,
  noteSessionAdopted,
  noteSessionForgotten,
  noteSessionLost,
} from '@/features/diagnostics/journal';

/**
 * La session, en un seul exemplaire.
 *
 * C'est un singleton de module et pas un état React, parce que le middleware HTTP en a besoin
 * lui aussi — et lui ne vit pas dans l'arbre. React s'y abonne par `useSyncExternalStore`
 * (voir `AuthProvider.tsx`) ; l'inverse — faire descendre le jeton par un contexte jusqu'au
 * client — obligerait à recréer le client à chaque changement de jeton, ce qui perdrait les
 * requêtes en vol au pire moment : celui du rafraîchissement.
 */

type AuthSession = components['schemas']['AuthSession'];
export type UserProfile = components['schemas']['UserProfile'];

export type AuthState =
  /** Au démarrage : on ne sait pas encore si le trousseau porte une session. */
  | { status: 'restoring' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: UserProfile };

export type AuthOutcome = { ok: true } | { ok: false; failure: Failure };

let state: AuthState = { status: 'restoring' };
const listeners = new Set<() => void>();

function publish(next: AuthState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Référence stable tant que rien ne change — `useSyncExternalStore` en dépend. */
export function getState(): AuthState {
  return state;
}

export { getAccessToken };

/**
 * Adopte une paire neuve.
 *
 * **Le trousseau s'écrit en premier.** Le back a déjà consommé l'ancien refresh token au
 * moment où cette réponse arrive : si l'app meurt entre les deux, la prochaine ouverture
 * présenterait un jeton consommé, ce que le back lit comme un rejeu — et il révoque la
 * famille. Persister d'abord réduit cette fenêtre à ce qu'on ne peut pas supprimer.
 *
 * **Et si l'écriture jette (#142) ?** Le trousseau peut refuser d'écrire pour la même raison
 * qu'il peut refuser de lire — verrouillé, item inaccessible. Le client se retrouve alors avec
 * un jeton en mémoire et rien sur le disque, alors que le serveur a déjà consommé l'ancien :
 * c'est la vraie façon de perdre une session, à la prochaine ouverture. On ne l'aggrave pas en
 * jetant *cette* session-ci : elle continue en mémoire jusqu'à la fermeture de l'app, ce qui
 * vaut mieux qu'une déconnexion immédiate et certaine. On trace, pour que ce risque ne soit
 * plus invisible.
 */
async function adopt(session: AuthSession): Promise<void> {
  try {
    await writeRefreshToken(session.tokens.refreshToken);
  } catch {
    noteSessionLost(keychainUnavailableReason('write'));
  }
  setAccessToken(session.tokens.accessToken);
  // Persisté, pas seulement en mémoire : `missingTokenReason` en a besoin dès le tout premier
  // `performRefresh()` d'un futur process, avant que `state` ci-dessous n'ait pu valoir
  // `'signedIn'` de nouveau. Voir le docblock de `journal.ts`.
  noteSessionAdopted();
  publish({ status: 'signedIn', user: session.user });
}

/** Oublie tout, localement. Le serveur a déjà tranché ou n'a plus rien à révoquer. */
async function forget(): Promise<void> {
  setAccessToken(null);
  try {
    await clearRefreshToken();
  } catch {
    // Le trousseau peut refuser d'effacer pour la même raison qu'il peut refuser de lire ou
    // d'écrire (#142). Le jeton laissé sur le disque est de toute façon déjà mort à cet instant
    // — inconnu, expiré, consommé, ou jamais écrit : les quatre appelants de `forget()` ont
    // chacun leur propre raison de conclure que la session est finie. Pas de nouvelle trace ici
    // : elle écraserait celle, plus utile, que l'appelant vient de poser juste avant — voir
    // `noteSessionLost` (`diagnostics/journal.ts`). `forget()` doit surtout ne pas rejeter : un
    // `catch` muet vaut mieux qu'un `restore()` qui ne termine jamais.
  }
  // Inconditionnel, que cet appel ait été précédé d'un `noteSessionLost()` ou non : sans ce
  // reset, la prochaine ouverture retracerait un abandon fantôme sur un trousseau vide qui est
  // pourtant le résultat attendu de ce `forget()`-ci. Voir le docblock de `journal.ts`.
  noteSessionForgotten();
  publish({ status: 'signedOut' });
}

/**
 * Le rafraîchissement réel — **jamais appelé directement**, toujours au travers du
 * coordinateur, qui garantit qu'il n'en part qu'un à la fois.
 *
 * Il ne rejette jamais : un échec est une valeur (`null`), parce que l'appelant est un
 * middleware qui doit décider s'il rejoue ou s'il laisse remonter le 401 d'origine. Jusqu'au
 * `#142`, cette promesse était fausse : `readRefreshToken()` peut jeter — trousseau verrouillé,
 * item présent mais inaccessible — et rien ne l'attrapait. Un rejet ici traverse le
 * coordinateur (qui relance), puis `restore()` (qui n'a pas de `catch`), et l'écran de
 * démarrage ne se relâche jamais. Voir `keychainUnavailableReason` (`sessionLostReason.ts`).
 */
async function performRefresh(): Promise<string | null> {
  let refreshToken: string | null;
  try {
    refreshToken = await readRefreshToken();
  } catch {
    // Un trousseau illisible n'est pas un trousseau vide : c'est la même incertitude que la
    // panne réseau juste en dessous, et elle doit rendre la même valeur — « on ne sait pas »,
    // jamais « il n'y a pas de session ». Surtout ne pas appeler `forget()` : effacer le
    // refresh token ici transformerait une panne peut-être temporaire en déconnexion certaine,
    // alors que le jeton est peut-être encore intact sur le disque.
    noteSessionLost(keychainUnavailableReason('read'));
    return null;
  }

  if (refreshToken === null) {
    // Le piège du #143 : `restore()` passe ici à **chaque** démarrage, y compris quand
    // personne ne s'est jamais connecté sur cet appareil — un trousseau vide est alors le
    // déroulement normal d'un premier lancement, pas un abandon. `state.status` ne peut pas
    // trancher : au tout premier appel de `restore()` il vaut encore `'restoring'`, y compris
    // pour l'utilisateur connecté hier dont le jeton a disparu entre deux ouvertures.
    // `sessionActive` (le journal, persisté) répond à sa place : voir le docblock de
    // `journal.ts` et celui de `missingTokenReason`.
    const reason = missingTokenReason(getJournal().sessionActive);
    if (reason !== null) {
      noteSessionLost(reason);
    }
    await forget();
    return null;
  }

  try {
    const { data, error, response } = await publicApi.POST('/api/auth/refresh', {
      body: { refreshToken },
    });

    if (data !== undefined) {
      await adopt(data);
      return data.tokens.accessToken;
    }

    if (response.status === 401 || response.status === 422) {
      // Jeton inconnu, expiré, ou déjà consommé. Dans le dernier cas la famille vient d'être
      // révoquée : il n'y a plus de session à sauver, et s'accrocher au jeton ne ferait que
      // rejouer la révocation à la prochaine ouverture. `refreshEndpoint` : c'est le refresh
      // token lui-même qui est refusé, pas le JWT — voir `SessionLostReason`.
      noteSessionLost(
        serverRefusalReason('refreshEndpoint', response.status, asProblem(error)?.type ?? null),
      );
      await forget();
      return null;
    }

    // 5xx. Le serveur est en panne, pas la session : on garde le refresh token, la prochaine
    // requête retentera.
    return null;
  } catch {
    // Réseau. Même raisonnement : ne pas déconnecter pour une coupure de tunnel.
    return null;
  }
}

const coordinator: RefreshCoordinator = createRefreshCoordinator({
  currentAccessToken: getAccessToken,
  performRefresh,
});

/**
 * Ce que le middleware appelle quand une requête revient en 401.
 *
 * **Les trois refus du jeton d'accès n'appellent pas la même réaction**, et c'est le contrat
 * qui le dit : `access-token-expired` veut dire « rafraîchis et rejoue » ; `invalid` et
 * `missing` veulent dire « renvoie le joueur sur l'écran de connexion ». Rafraîchir sur ces
 * deux-là brûlerait un refresh token pour rien — et sur un jeton révoqué, ce serait même le
 * rejeu qui coupe la famille.
 *
 * C'est ici que ça se décide et pas dans le middleware : celui-ci transporte, il ne lit pas
 * le contrat.
 */
export async function refresh(staleToken: string | null, problem: unknown): Promise<string | null> {
  const parsed = asProblem(problem);
  if (meansSessionOver(parsed)) {
    // `authenticatedRoute`, pas `refreshEndpoint` : ici c'est le **JWT** qui est jugé
    // irrécupérable sur une route quelconque, pas le refresh token — les deux disent
    // « le serveur a refusé le jeton », mais n'accusent pas la même chose, voir
    // `SessionLostReason`. Le middleware n'appelle `refresh()` que sur un 401
    // (`authMiddleware.ts`), d'où le statut fixe.
    noteSessionLost(serverRefusalReason('authenticatedRoute', 401, parsed?.type ?? null));
    await forget();
    return null;
  }

  return coordinator.refresh(staleToken);
}

/**
 * Au démarrage : le trousseau porte-t-il une session ?
 *
 * Passe par le coordinateur, et pas par `performRefresh` : si une requête part avant que la
 * restauration soit finie, les deux doivent partager le même rafraîchissement.
 */
export async function restore(): Promise<void> {
  try {
    await coordinator.refresh(null);
  } catch {
    // Le dernier rempart (#142). `performRefresh()` ne devrait plus rejeter — c'est tout le
    // sujet de ce ticket — mais `restore()` est appelé en `void` par l'écran de démarrage, qui
    // ne relâche l'écran qu'en sortant de `restoring` : un rejet qui traverserait jusqu'ici sans
    // `catch` figerait l'app pour de bon. Rien à tracer de plus, le point d'origine s'en est
    // déjà chargé.
  }

  // `adopt` et `forget` ont déjà tranché dans les cas nets. Reste la panne serveur, où on ne
  // sait rien : on montre la connexion sans effacer le trousseau, la prochaine ouverture
  // retentera.
  if (state.status === 'restoring') {
    publish({ status: 'signedOut' });
  }
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  try {
    const { data, error } = await publicApi.POST('/api/auth/login', {
      body: { email, password },
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    await adopt(data);
    return { ok: true };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  /**
   * Fuseau IANA de l'appareil. **Le streak et le plafond quotidien se calculent dedans**, et
   * le contrat en fait un attribut de profil que le serveur ne déduit jamais : c'est au client
   * de l'envoyer, et à l'utilisateur de le corriger ensuite s'il déménage.
   */
  timezone: string;
};

export async function register(input: RegisterInput): Promise<AuthOutcome> {
  try {
    const { data, error } = await publicApi.POST('/api/auth/register', {
      body: input,
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    await adopt(data);
    return { ok: true };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}

/**
 * Déconnexion.
 *
 * La route ne demande pas le JWT : la possession du refresh token suffit, et c'est justement
 * quand le JWT vient d'expirer qu'on veut pouvoir se déconnecter proprement. L'appel révoque
 * la famille entière — c'est l'appareil qui part, pas ce jeton-là.
 *
 * L'oubli local est inconditionnel : si le réseau tombe pendant l'appel, garder l'utilisateur
 * connecté serait le pire des deux mondes.
 *
 * **Le jeton de push n'a rien à faire désinscrire ici, et ce n'est pas un oubli** (#56). Le
 * back a livré son #136 par le « chemin B » : l'appareil s'accroche à la famille de refresh
 * tokens du jeton courant, et `LogOutHandler` révoque le jeton de push de cette même famille
 * quand `POST /api/auth/logout` la révoque tout entière. Il n'existe donc aucune route
 * `DELETE /api/devices` (le contrat le dit : `delete?: never` sur `/api/devices`), et ce
 * module n'a rien de plus à envoyer — voir `notifications/registration.ts`.
 */
export async function signOut(): Promise<void> {
  const refreshToken = await readRefreshToken();

  if (refreshToken !== null) {
    try {
      await publicApi.POST('/api/auth/logout', { body: { refreshToken } });
    } catch {
      // Le serveur révoquera à l'expiration. On part quand même.
    }
  }

  // La seule des quatre voulue : elle doit se distinguer des trois autres, sinon le journal
  // dit qu'une session est partie sans jamais dire si c'était voulu.
  noteSessionLost(signedOutReason());
  await forget();
}
