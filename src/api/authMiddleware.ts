import type { Middleware } from 'openapi-fetch';

import type { paths } from '@/api/schema';

/**
 * Le middleware d'authentification : il pose le `Bearer`, et rejoue **une fois** sur 401.
 *
 * Ce fichier n'a aucune dépendance d'exécution — ni Expo, ni React, ni réseau. Tout ce dont
 * il a besoin lui est injecté. C'est délibéré : l'invariant qu'il porte (« un seul refresh
 * part, quoi qu'il arrive ») ne se voit pas à l'œil sur un appareil, il se prouve par un
 * test qui tourne sous `node --test` sans monter quoi que ce soit.
 *
 * Voir `src/features/auth/refreshCoordinator.ts` pour l'autre moitié de l'invariant : ici on
 * garantit **une tentative de rejeu par requête**, là-bas **un rafraîchissement partagé**.
 */

/**
 * Les routes que le contrat déclare `security: []`.
 *
 * Elles ne portent pas de `Authorization` et ne déclenchent jamais de rafraîchissement : leur
 * 401 à elles est une réponse métier (identifiants refusés, refresh token consommé), pas un
 * jeton d'accès expiré. Le `Set<keyof paths>` fait casser la compilation le jour où une de
 * ces routes est renommée dans le contrat.
 */
const PUBLIC_PATHS: ReadonlySet<string> = new Set<keyof paths>([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/social/{provider}',
]);

export type AuthMiddlewareDeps = {
  /**
   * Le jeton d'accès courant, ou `null`. Relu **à chaque requête** : il change sous les pieds
   * du middleware dès qu'un rafraîchissement aboutit.
   */
  getAccessToken: () => string | null;
  /**
   * Obtient un jeton d'accès utilisable, en partant de celui qui vient d'être refusé.
   *
   * `problem` est le corps du 401, **tel quel**. Le middleware ne l'interprète pas : c'est le
   * contrat qui dit ce que chaque `type` appelle — rafraîchir sur `access-token-expired`,
   * rendre la main sur `access-token-invalid` et `access-token-missing` — et cette
   * connaissance-là appartient à la session, pas au transport.
   *
   * Rend `null` quand la session est morte : le 401 d'origine remonte alors tel quel, sans
   * rejeu.
   */
  refresh: (staleToken: string | null, problem: unknown) => Promise<string | null>;
};

/**
 * Le corps du refus, sans consommer la réponse.
 *
 * `openapi-fetch` lira le corps après nous pour le rendre à l'appelant : il faut donc une
 * copie, sous peine de lui passer un flux déjà vidé. Un corps illisible n'est pas une erreur
 * ici — c'est `null`, et la session tranchera.
 */
async function refusalBody(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

export function createAuthMiddleware(deps: AuthMiddlewareDeps): Middleware {
  /**
   * Les requêtes parties et pas encore revenues, indexées par l'`id` que `openapi-fetch`
   * attribue à chaque appel. On y garde de quoi rejouer, et **avec quel jeton** on avait
   * tenté : c'est cette deuxième information qui distingue « ma session est morte » de
   * « j'étais en vol pendant que quelqu'un d'autre renouvelait ».
   */
  const inFlight = new Map<string, { replay: Request; token: string | null }>();

  return {
    onRequest({ request, schemaPath, id }) {
      if (PUBLIC_PATHS.has(schemaPath)) {
        return undefined;
      }

      const token = deps.getAccessToken();

      // Le corps d'une `Request` est un flux à usage unique, et `fetch` le consomme. Un 401
      // se rejoue : la copie se prend donc **avant** l'envoi. Elle se prend aussi **avant**
      // de poser l'en-tête, pour que le rejeu ne traîne pas le jeton déjà refusé.
      inFlight.set(id, { replay: request.clone(), token });

      if (token !== null) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }

      return request;
    },

    async onResponse({ response, id, options }) {
      const attempt = inFlight.get(id);
      inFlight.delete(id);

      if (attempt === undefined || response.status !== 401) {
        return undefined;
      }

      const token = await deps.refresh(attempt.token, await refusalBody(response));
      if (token === null) {
        // Session morte. Le 401 remonte intact : c'est au provider d'auth d'avoir déjà
        // basculé l'app sur l'écran de connexion, pas au middleware de naviguer.
        return undefined;
      }

      attempt.replay.headers.set('Authorization', `Bearer ${token}`);

      // Le rejeu part par `options.fetch`, **hors du middleware**. C'est ce qui borne la
      // boucle à une tentative par construction, plutôt que par un drapeau qu'on pourrait
      // oublier de poser : un 401 sur le rejeu n'a aucun chemin pour relancer un refresh.
      return await options.fetch(attempt.replay);
    },

    onError({ id }) {
      // Réseau coupé : `onResponse` ne sera jamais appelé pour cet `id`. Sans ça, la copie
      // de rejeu resterait dans la map pour la durée de vie du client.
      inFlight.delete(id);
      return undefined;
    },
  };
}
