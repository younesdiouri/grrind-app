/**
 * D'où sort l'adresse de l'API — la règle, séparée de ce qui la lit.
 *
 * ————— Pourquoi ce module existe ——————————————————————————————————————————————————————
 *
 * Sur iPhone physique, `localhost` désigne **le téléphone**, pas le Mac : il faut donc l'IP
 * LAN du Mac. Or cette IP est distribuée par DHCP et change toute seule — box redémarrée,
 * bail expiré, réseau changé. La recopier à la main dans `.env.local` à chaque fois est une
 * corvée qui se solde toujours de la même manière : on l'oublie, l'app ne joint plus le back,
 * et on cherche ailleurs.
 *
 * Personne n'a pourtant besoin de la chercher : **Metro la connaît déjà**. C'est exactement
 * l'adresse qu'il a donnée au téléphone pour que celui-ci vienne chercher le bundle. Le back
 * tourne sur le même Mac, à un autre port : l'hôte est le même, seul le port change.
 *
 * ————— Deux façons de la retrouver, parce qu'Expo Go et un dev client ne se ressemblent pas —
 *
 * `expo-constants` la ressert dans `hostUri`, mais **seulement quand le manifeste est allé la
 * chercher lui-même** — c'est le cas d'Expo Go. Un dev client (`expo run:ios`, ce dépôt) ne
 * passe pas par ce manifeste : il boote directement contre Metro, et `hostUri` reste
 * `undefined`. La même adresse existe pourtant ailleurs — c'est l'hôte de l'URL depuis laquelle
 * le bundle JS a été chargé, `NativeModules.SourceCode.scriptURL`, posée par React Native
 * lui-même pour les mêmes raisons (`Libraries/Core/Devtools/getDevServer.js`). Elle est donc
 * tentée en second, quand `hostUri` ne donne rien.
 *
 * ————— L'ordre de préséance ——————————————————————————————————————————————————————————
 *
 * 1. `EXPO_PUBLIC_API_URL`, si elle est posée — **l'explicite gagne toujours**. C'est ce qui
 *    permet de viser une préproduction, un tunnel, ou un back qui ne tourne pas sur le Mac.
 *    Une déduction qui passerait devant une configuration écrite serait impossible à annuler.
 * 2. l'hôte du serveur de développement — `hostUri` puis `scriptURL` —, en développement
 *    seulement.
 * 3. `localhost`, qui reste juste sur simulateur — et qui est le seul choix honnête pour un
 *    build de production dont personne n'a configuré l'adresse : mieux vaut échouer sur place
 *    que taper l'IP privée de quelqu'un d'autre.
 *
 * ————— Sur le format de `hostUri` et de `scriptURL` ——————————————————————————————————
 *
 * La doc versionnée du SDK 57 type `hostUri` en `string` et **ne dit pas** de quoi il est
 * fait : ni schéma, ni port, ni chemin ne sont garantis présents ou absents. `scriptURL`, lui,
 * est une URL complète de bundle (`http://192.168.1.13:8081/index.bundle?platform=ios&dev=…`).
 * Plutôt que de parier sur la forme observée un jour sur une machine, `hostFrom` les accepte
 * toutes et se prouve sur chacune — c'est moins cher qu'un bug qui ne se reproduit que chez
 * quelqu'un d'autre.
 */

/** Le port du back en local (Docker). L'hôte varie, lui ne varie pas. */
export const API_PORT = 8080;

/**
 * L'hôte contenu dans un `hostUri`, quelle qu'en soit la forme — `192.168.1.10:8081`,
 * `http://192.168.1.10:8081`, `exp://192.168.1.10:8081/--/x`, `localhost`, `[::1]:8081`.
 *
 * `null` quand il n'y a pas d'hôte à en tirer : l'appelant retombe alors sur `localhost`
 * plutôt que de fabriquer une URL bancale.
 */
export function hostFrom(hostUri: string): string | null {
  const withoutScheme = hostUri.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const authority = withoutScheme.split('/')[0].split('?')[0];

  if (authority === '') {
    return null;
  }

  // Une IPv6 littérale s'écrit entre crochets — `[::1]:8081` — précisément parce que ses
  // deux-points ne sont pas ceux du port. Les crochets restent : sans eux, l'URL construite
  // plus bas ne serait plus analysable.
  if (authority.startsWith('[')) {
    const close = authority.indexOf(']');
    return close === -1 ? null : authority.slice(0, close + 1);
  }

  const host = authority.split(':')[0];

  return host === '' ? null : host;
}

/**
 * L'adresse de l'API, selon l'ordre de préséance décrit en tête de module.
 *
 * Tout arrive en paramètre — la variable d'environnement, le `hostUri`, le `scriptURL`, le
 * drapeau de développement — pour que la règle se prouve sans Metro, sans appareil et sans
 * horloge.
 */
export function resolveApiBaseUrl(params: {
  configured: string | undefined;
  hostUri: string | undefined;
  scriptURL: string | undefined;
  isDev: boolean;
}): string {
  const explicit = params.configured?.trim();

  if (explicit !== undefined && explicit !== '') {
    // La barre finale est retirée ici plutôt que laissée à `openapi-fetch` : les chemins du
    // contrat commencent tous par `/`, et `…:8080/` + `/api/…` donnerait un double slash.
    return explicit.replace(/\/+$/, '');
  }

  if (params.isDev) {
    // `hostUri` d'abord — c'est Expo Go. `scriptURL` ensuite — c'est le dev client, qui ne
    // passe jamais par le manifeste et laisse `hostUri` à `undefined`.
    for (const source of [params.hostUri, params.scriptURL]) {
      const host = source === undefined ? null : hostFrom(source);

      if (host !== null) {
        return `http://${host}:${API_PORT}`;
      }
    }
  }

  return `http://localhost:${API_PORT}`;
}
