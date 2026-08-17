import { failureFrom, OFFLINE } from '@/features/auth/problems';

/**
 * Enveloppe un appel `openapi-fetch` pour qu'une `queryFn` React Query ne jette jamais qu'une
 * `Failure` structurée — jamais l'exception brute.
 *
 * `openapi-fetch` attrape déjà le `fetch` dans son propre try/catch, mais **relance**
 * l'exception d'origine dès qu'aucun middleware `onError` ne la transforme
 * (`node_modules/openapi-fetch/dist/index.mjs`) — et le nôtre (`authMiddleware.ts`) rend
 * `undefined` sur un refus réseau, précisément pour laisser passer ce cas. Sans ce module, un
 * back injoignable (arrêté, IP LAN périmée après un bail DHCP…) fait remonter un `TypeError`
 * jusqu'à `messageFor`, qui n'accepte qu'une `Failure` et jette au rendu à son tour.
 *
 * `guildActions.ts` fait le même choix `catch → OFFLINE`, en ligne, parce qu'il n'a qu'un seul
 * appel à protéger. Ici la `queryFn` en a potentiellement plusieurs à venir (#43 en ajoutera),
 * d'où le partage plutôt qu'un try/catch recopié à chaque hook.
 */
export async function queryOrFailure<T>(call: () => Promise<{ data?: T; error?: unknown }>): Promise<T> {
  let result: { data?: T; error?: unknown };

  try {
    result = await call();
  } catch {
    // Pas de corps de réponse à lire ici : le réseau n'a jamais répondu, donc rien ne
    // distingue ce refus d'une absence de connexion. `OFFLINE` est le même choix que partout
    // ailleurs dans le client pour ce cas.
    throw OFFLINE;
  }

  if (result.data === undefined) {
    throw failureFrom(result.error);
  }

  return result.data;
}
