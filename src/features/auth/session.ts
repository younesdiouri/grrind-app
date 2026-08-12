import { publicApi } from '@/api/publicClient';
import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import {
  createRefreshCoordinator,
  type RefreshCoordinator,
} from '@/features/auth/refreshCoordinator';
import {
  clearRefreshToken,
  getAccessToken,
  readRefreshToken,
  setAccessToken,
  writeRefreshToken,
} from '@/features/auth/tokenStore';

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

/** Le nombre de rafraîchissements réellement partis. Lu par le banc de l'écran d'accueil. */
let attempts = 0;

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
 */
async function adopt(session: AuthSession): Promise<void> {
  await writeRefreshToken(session.tokens.refreshToken);
  setAccessToken(session.tokens.accessToken);
  publish({ status: 'signedIn', user: session.user });
}

/** Oublie tout, localement. Le serveur a déjà tranché ou n'a plus rien à révoquer. */
async function forget(): Promise<void> {
  setAccessToken(null);
  await clearRefreshToken();
  publish({ status: 'signedOut' });
}

/**
 * Le rafraîchissement réel — **jamais appelé directement**, toujours au travers du
 * coordinateur, qui garantit qu'il n'en part qu'un à la fois.
 *
 * Il ne rejette jamais : un échec est une valeur (`null`), parce que l'appelant est un
 * middleware qui doit décider s'il rejoue ou s'il laisse remonter le 401 d'origine.
 */
async function performRefresh(): Promise<string | null> {
  const refreshToken = await readRefreshToken();
  if (refreshToken === null) {
    await forget();
    return null;
  }

  attempts += 1;

  try {
    const { data, response } = await publicApi.POST('/api/auth/refresh', {
      body: { refreshToken },
    });

    if (data !== undefined) {
      await adopt(data);
      return data.tokens.accessToken;
    }

    if (response.status === 401 || response.status === 422) {
      // Jeton inconnu, expiré, ou déjà consommé. Dans le dernier cas la famille vient d'être
      // révoquée : il n'y a plus de session à sauver, et s'accrocher au jeton ne ferait que
      // rejouer la révocation à la prochaine ouverture.
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

export const refresh = coordinator.refresh;

/**
 * Au démarrage : le trousseau porte-t-il une session ?
 *
 * Passe par le coordinateur, et pas par `performRefresh` : si une requête part avant que la
 * restauration soit finie, les deux doivent partager le même rafraîchissement.
 */
export async function restore(): Promise<void> {
  await coordinator.refresh(null);

  // `adopt` et `forget` ont déjà tranché dans les cas nets. Reste la panne serveur, où on ne
  // sait rien : on montre la connexion sans effacer le trousseau, la prochaine ouverture
  // retentera.
  if (state.status === 'restoring') {
    publish({ status: 'signedOut' });
  }
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  try {
    const { data, error, response } = await publicApi.POST('/api/auth/login', {
      body: { email, password },
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error, response.status) };
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
    const { data, error, response } = await publicApi.POST('/api/auth/register', {
      body: input,
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error, response.status) };
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
 */
/**
 * Le banc de vérification, et pourquoi il est dans le code de production.
 *
 * « Un seul rafraîchissement part » ne se voit pas à l'œil : les deux issues — un refresh ou
 * deux — affichent le même écran, et la seconde ne se manifeste qu'à l'ouverture suivante,
 * par une déconnexion inexpliquée. Le test unitaire prouve la règle sur les deux modules
 * (`refreshCoordinator.test.ts`, `authMiddleware.test.ts`) ; ce compteur-ci la vérifie sur le
 * vrai back, avec le vrai trousseau, depuis l'écran d'accueil.
 */
export function refreshAttempts(): number {
  return attempts;
}

/**
 * Périme le JWT sans toucher au refresh token, pour rejouer la situation qui coûte cher :
 * deux requêtes qui expirent en même temps.
 *
 * Sans porte dérobée, il faudrait attendre quinze minutes pour l'observer une fois.
 */
export function expireAccessTokenForTesting(): void {
  if (!__DEV__) {
    return;
  }

  setAccessToken('perime.pour.le.banc');
}

export async function signOut(): Promise<void> {
  const refreshToken = await readRefreshToken();

  if (refreshToken !== null) {
    try {
      await publicApi.POST('/api/auth/logout', { body: { refreshToken } });
    } catch {
      // Le serveur révoquera à l'expiration. On part quand même.
    }
  }

  await forget();
}
