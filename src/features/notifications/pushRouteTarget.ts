import type { components } from '@/api/schema';

/**
 * Le routage porté par une notification.
 *
 * Le back envoie, dans `data` (hors du corps affiché, `title`/`body`/`categoryId`) :
 *
 * ```
 * { groupingKey: "guild-activity:018f…", routeType: "PLAYER_PROFILE", routeId: "<uuid>" }
 * ```
 *
 * Ce canal est APNs, pas HTTP, mais `openapi.yaml` décrit tout de même sa forme
 * (`PushNotificationData`) : le client route dessus, donc `routeType` se génère depuis le
 * contrat plutôt que de recopier ses valeurs à la main.
 *
 * ————— Pourquoi un `routeType` inconnu ne route nulle part ——————————————————————————————
 *
 * `decodePushRouteTarget` ne fait jamais confiance à un `routeType` qu'il ne reconnaît pas —
 * il rend `null`, et l'appelant ne route rien. Un tap qui n'aboutit nulle part se remarque à
 * peine ; un tap qui aboutit ailleurs qu'attendu ressemble à un succès et se remarque encore
 * moins. C'est `hrefFor` (`pushRouting.ts`), pas ce fichier, qui casse le build quand le back
 * ajoute une valeur à l'enum : ici, une valeur inconnue à l'exécution — back plus récent que
 * l'app installée — reste un `null` silencieux plutôt qu'une erreur.
 *
 * ————— Une fonction pure, comme `buildTimeline` ——————————————————————————————————————————
 *
 * `data` arrive du système, non typé — `expo-notifications` ne promet qu'un
 * `Record<string, unknown>`, potentiellement absent. Cette fonction ne dépend de rien
 * d'autre : elle se prouve entièrement sous `node --test` (`pushRouteTarget.test.ts`), sans
 * monter la moindre notification.
 */

type PushRouteType = components['schemas']['PushRouteType'];

export type PushRouteTarget = {
  type: PushRouteType;
  /**
   * L'UUID de la ressource visée — celui de l'auteur de la séance pour `PLAYER_PROFILE`, celui
   * de la guilde pour `GUILD_RISALAT`. Ce dernier n'est **pas consommé** : `GET
   * /api/guilds/mine/risalat` n'accepte aucun identifiant, un compte n'appartenant qu'à une
   * seule guilde. Il est décodé pour que la route sache déjà laquelle ouvrir le jour où ça
   * change.
   */
  routeId: string;
  /**
   * Transportée, **jamais interprétée ici**. `groupingKey` dit quelle notification celle-ci
   * remplace dans le centre de notifications : dépiler pour fusionner l'affichage est un
   * sujet à part, que ce ticket ne demande pas. `null` si le payload ne la porte pas.
   */
  groupingKey: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `data`, tel que le système le rend — jamais réordonné ni deviné, jamais retourné à moitié
 * rempli : soit la forme attendue est là en entier, soit `null`.
 */
export function decodePushRouteTarget(data: unknown): PushRouteTarget | null {
  if (!isRecord(data)) {
    return null;
  }

  const { routeType, routeId, groupingKey } = data;

  // `openapi-typescript` ne génère qu'un type, pas une valeur : `PushRouteType` est erasé à
  // la compilation, et il n'y a rien à interroger ici à l'exécution. La reconnaissance reste
  // donc une comparaison à la valeur du contrat — toute autre chaîne, y compris une future
  // addition du back que cette version de l'app ne connaît pas encore, n'aboutit à aucune
  // route plutôt qu'à une mauvaise.
  //
  // Attention : cette comparaison n'est pas un `switch` exhaustif — contrairement à
  // `hrefFor`, le compilateur ne signale rien quand `PushRouteType` gagne une valeur ici.
  // Une addition oubliée est donc silencieuse : elle rend `null` et ne route nulle part.
  if (routeType !== ('PLAYER_PROFILE' satisfies PushRouteType) && routeType !== ('GUILD_RISALAT' satisfies PushRouteType)) {
    return null;
  }

  if (typeof routeId !== 'string' || routeId.length === 0) {
    return null;
  }

  return {
    type: routeType,
    routeId,
    groupingKey: typeof groupingKey === 'string' ? groupingKey : null,
  };
}
