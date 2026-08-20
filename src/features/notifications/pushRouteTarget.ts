/**
 * Le routage porté par une notification — et **la dette du #57, assumée ici et nulle part
 * ailleurs**.
 *
 * ————— Pourquoi ce fichier recopie un type du back ——————————————————————————————————————
 *
 * Le back envoie, dans `data` (hors du corps affiché, `title`/`body`/`categoryId`) :
 *
 * ```
 * { groupingKey: "guild-activity:018f…", routeType: "PLAYER_PROFILE", routeId: "<uuid>" }
 * ```
 *
 * Ce canal est APNs, pas HTTP : `openapi.yaml` ne le décrit pas, et ne peut pas le décrire
 * tant que younesdiouri/grrind-back#147 — ouvert exprès — n'a pas ajouté cette forme au
 * contrat. En attendant, `PushRouteType` est recopié à la main depuis le code du back
 * (vérifié par l'architecte), et **ce fichier est le seul endroit du client où
 * `'PLAYER_PROFILE'` s'écrit**. Nulle part ailleurs on ne réécrit cette valeur : un futur
 * écran qui a besoin de savoir où router importe `PushRouteTarget` d'ici, jamais la chaîne.
 *
 * ————— Ce qui arrive quand le back ajoute une valeur avant que le client la connaisse ———
 *
 * `PushRouteType` n'est **pas** l'union générée du contrat : rien ici ne casse le build le
 * jour où le back en ajoute une. C'est le prix de la dette ci-dessus, et c'est pour ça que
 * `decodePushRouteTarget` ne fait jamais confiance à un `routeType` qu'il ne reconnaît pas —
 * il rend `null`, et l'appelant ne route rien. Un tap qui n'aboutit nulle part se remarque à
 * peine ; un tap qui aboutit ailleurs qu'attendu ressemble à un succès et se remarque encore
 * moins.
 *
 * ————— Une fonction pure, comme `buildTimeline` ——————————————————————————————————————————
 *
 * `data` arrive du système, non typé — `expo-notifications` ne promet qu'un
 * `Record<string, unknown>`, potentiellement absent. Cette fonction ne dépend de rien
 * d'autre : elle se prouve entièrement sous `node --test` (`pushRouteTarget.test.ts`), sans
 * monter la moindre notification.
 */

/** Recopié depuis le back — voir le docblock ci-dessus. Une seule valeur aujourd'hui. */
type PushRouteType = 'PLAYER_PROFILE';

export type PushRouteTarget = {
  type: PushRouteType;
  /** L'UUID de la ressource visée — celui de l'auteur de la séance pour `PLAYER_PROFILE`. */
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

  // Le seul type que ce client connaît. Toute autre valeur — y compris une future addition
  // du back — n'aboutit à aucune route plutôt qu'à une mauvaise.
  if (routeType !== 'PLAYER_PROFILE') {
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
