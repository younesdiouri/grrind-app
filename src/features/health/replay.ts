import type { ProblemDetails, ProblemType } from '@/features/auth/problems';

/**
 * Le rejeu d'un import, jusqu'à obtenir un verdict.
 *
 * Une clé d'idempotence ne déclenche pas le rejeu, elle le rend **sûr**. Rejouer, c'est ici que
 * ça se décide — et la question n'est pas « la requête a-t-elle échoué ? » mais **« sait-on ce
 * que le serveur a fait ? »**.
 *
 * - Réseau coupé, passerelle muette, serveur en 500 : on ne sait pas. Le lot est peut-être
 *   déjà crédité. On renvoie la même clé — au pire le serveur ressort la réponse qu'il avait
 *   déjà produite, au mieux il exécute enfin.
 * - `idempotency-key-in-flight` : on sait au contraire que la première requête est **arrivée** et
 *   travaille encore. C'est le signal le plus net qu'il faut attendre et redemander.
 * - Tout le reste — corps refusé, clé réutilisée, jeton mort — est un verdict. Insister ne
 *   changerait rien et ferait patienter le joueur pour rien.
 *
 * Un import où **tout est écarté** n'est pas un échec : c'est un 200 avec `imported` vide, et
 * il traverse ce module comme n'importe quel succès.
 *
 * Le nombre de rejeus est **borné**, et volontairement petit : ceci tourne pendant que le joueur
 * regarde son écran, à l'ouverture de l'app. Quand la série s'épuise, on rend la main sans rien
 * effacer — la prochaine synchronisation repartira avec la **même** clé, puisque le lot n'aura
 * pas bougé et qu'aucun verdict n'est tombé.
 *
 * Comme le coordinateur de rafraîchissement, ce module n'a **aucune dépendance d'exécution** :
 * l'attente est injectée, et le refus n'est pas traduit ici. C'est ce qui permet de prouver la
 * politique sous `node --test`, en quelques millisecondes, au lieu de couper un tunnel Wi-Fi et
 * d'espérer.
 */

/** L'en-tête par lequel le serveur signale qu'il a ressorti une réponse au lieu de la produire. */
export const REPLAY_HEADER = 'Idempotent-Replay';

/**
 * Une réponse d'`openapi-fetch`, réduite à ce dont ce module a besoin. Une `Response` du DOM la
 * satisfait telle quelle, et un test n'a pas à en fabriquer une.
 */
export type Reply<T> = {
  data?: T;
  error?: unknown;
  response: { headers: { get: (name: string) => string | null } };
};

/**
 * Le verdict, ou son absence.
 *
 * Le refus remonte **brut** : le traduire en message appartient à l'appelant, qui seul sait sur
 * quel écran il va s'afficher. Un transport qui a lâché donne `null` — ce que `failureFrom` lit
 * déjà comme « hors ligne ».
 */
export type Answer<T> =
  | { ok: true; data: T; replayed: boolean }
  | { ok: false; refusal: unknown };

export type ReplayDeps = {
  /**
   * Les attentes entre deux envois, en millisecondes. **Sa longueur borne le nombre de rejeus** :
   * une série vide envoie une fois et rend la main.
   */
  delays: readonly number[];
  sleep: (ms: number) => Promise<void>;
};

/**
 * Le `type` du refus, ou `null`.
 *
 * Volontairement plus permissif qu'`asProblem`, qui exige aussi un `detail` : le rejeu doit
 * trancher même sur un corps que la validation complète rejetterait. Il ne lit que l'identifiant
 * de la panne, et un corps illisible se range du côté du doute — donc du rejeu.
 */
function refusalType(refusal: unknown): ProblemType | null {
  if (typeof refusal !== 'object' || refusal === null) {
    return null;
  }

  const { type } = refusal as Partial<ProblemDetails>;

  return typeof type === 'string' ? (type as ProblemType) : null;
}

/**
 * Ce refus laisse-t-il l'issue inconnue ?
 *
 * Le doute vaut rejeu. C'est le sens du `null` en tête : corps illisible, proxy qui répond du
 * HTML, `type` qu'une version plus ancienne du client ne connaît pas — dans tous ces cas on
 * ignore ce que le serveur a fait, donc on redemande. Le rejeu est gratuit, c'est toute la
 * promesse de la clé.
 */
export function outcomeUnknown(refusal: unknown): boolean {
  const type = refusalType(refusal);

  return (
    type === null ||
    type === 'https://grrind.app/problems/internal-error' ||
    type === 'https://grrind.app/problems/idempotency-key-in-flight'
  );
}

export async function sendUntilAnswered<T>(
  send: () => Promise<Reply<T>>,
  deps: ReplayDeps,
): Promise<Answer<T>> {
  let refusal: unknown = null;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const reply = await send();

      if (reply.data !== undefined) {
        return {
          ok: true,
          data: reply.data,
          replayed: reply.response.headers.get(REPLAY_HEADER) === 'true',
        };
      }

      refusal = reply.error;

      if (!outcomeUnknown(refusal)) {
        return { ok: false, refusal };
      }
    } catch {
      // `fetch` ne rejette que sur le transport : le serveur n'a rien dit, donc on ne sait rien.
      refusal = null;
    }

    if (attempt >= deps.delays.length) {
      return { ok: false, refusal };
    }

    await deps.sleep(deps.delays[attempt]);
  }
}
