import type { components } from '@/api/schema';

/**
 * La session telle qu'elle survit à la mort du process — et **pourquoi elle survit**.
 *
 * ————— Ce que ce module supprime (#146) ————————————————————————————————————————————————
 *
 * `restore()` faisait tourner le refresh token à **chaque** naissance de process, premier plan
 * comme réveil en arrière-plan, que le jeton d'accès soit encore valide ou non. Chaque rotation
 * traverse une fenêtre irréductible : entre le `COMMIT` du serveur et le retour de
 * `writeRefreshToken()`, un process tué perd le successeur, et l'ouverture suivante présente un
 * jeton déjà consommé — que le back lit comme un rejeu, et il révoque la famille entière.
 *
 * C'est arrivé le 2026-09-01, en production. L'app avait rafraîchi à 07:21 puis à 07:33 ; à
 * 07:43 un réveil en arrière-plan a fait tourner un jeton d'accès **valide jusqu'à 07:48**, le
 * serveur a committé, le process est mort avant l'écriture. Quarante-neuf minutes plus tard,
 * l'app présentait le prédécesseur : quinze jetons révoqués, écran de connexion.
 *
 * La fenêtre ne se ferme pas — `adopt()` (`session.ts`) fait déjà tout ce qu'on peut pour la
 * rétrécir. Ce qui se réduit, c'est le **nombre de fois qu'on y entre**. D'où ce module : le
 * jeton d'accès est persisté avec son instant d'expiration, et un démarrage qui en trouve un
 * encore valide reprend la session **sans rien faire tourner**.
 *
 * ————— Pourquoi le profil est persisté avec, alors que le ticket ne l'énumère pas ————————
 *
 * Parce que `AuthState` n'a pas d'état « connecté sans profil » : `{ status: 'signedIn' }`
 * porte un `UserProfile`, et l'écran de démarrage ne se relâche que sur cette bascule. Ne
 * persister que le jeton obligerait `restore()` à aller chercher le profil par `GET /api/me`
 * — donc à remplacer une requête réseau par une autre au démarrage, y compris sur le réveil en
 * arrière-plan où chaque aller-retour se prend sur les douze secondes du budget
 * (`retryPolicy.ts`). Reprendre sans réseau du tout est le seul choix qui rende vraiment le
 * temps qu'on voulait rendre.
 *
 * Le profil ainsi repris est celui du dernier `adopt()`. Il ne vieillit pas plus qu'aujourd'hui
 * : `state.user` n'est déjà rafraîchi que par un `adopt()`, jamais entre deux, et la première
 * rotation paresseuse (401 → `refresh()`) le remet à jour au plus tard un quart d'heure après
 * l'ouverture.
 *
 * ————— Pur, et testé comme tel ————————————————————————————————————————————————————————
 *
 * Aucune dépendance d'exécution — même raison que `sessionLostReason.ts` et
 * `refreshCoordinator.ts` : ce qui décide « ce démarrage doit-il rotationner ? » se prouve sous
 * `node --test`, pas sur un appareil où les deux issues affichent exactement le même écran et
 * où la mauvaise ne se manifeste qu'une heure plus tard, par une déconnexion.
 *
 * **Jamais le refresh token.** Il ne passe pas par ici, sous aucune forme : il vit seul dans son
 * propre item du trousseau (`tokenStore.ts`), et rien n'a de raison de le lire en même temps que
 * le reste.
 */

export type UserProfile = components['schemas']['UserProfile'];

/** Ce qui est écrit dans le trousseau à côté du refresh token. Voir `tokenStore.ts`. */
export type StoredSession = {
  accessToken: string;
  /** Quand le JWT cesse d'être accepté, en ISO 8601. Dérivé de `expiresIn` à l'adoption. */
  expiresAt: string;
  /** Le profil du dernier `adopt()` — voir le docblock ci-dessus pour ce qu'il vaut. */
  user: UserProfile;
};

/**
 * La marge avant l'expiration, en secondes.
 *
 * Elle penche volontairement du mauvais côté : **mieux vaut une rotation de trop qu'un 401 au
 * premier appel**. Un jeton qui expire dans quarante secondes tiendrait sans doute le temps du
 * démarrage, mais pas celui d'une synchronisation de lancement ; et l'horloge de l'appareil
 * n'est pas celle du serveur. Le coût d'une rotation évitable est nul — c'est justement ce que
 * ce module rend fréquent — celui d'un aller-retour raté au démarrage ne l'est pas.
 */
export const EXPIRY_MARGIN_SECONDS = 60;

/** L'instant d'expiration, depuis la durée de vie que le contrat rend (`TokenPair.expiresIn`). */
export function expiryFrom(expiresIn: number, now: Date): string {
  return new Date(now.getTime() + expiresIn * 1000).toISOString();
}

/**
 * Ce jeton d'accès peut-il encore servir, marge comprise ?
 *
 * `false` sur tout ce qui n'est pas une réponse claire — absent, illisible, expiré, daté d'une
 * chaîne qui n'est pas une date. Le démarrage retombe alors sur la rotation, qui est le
 * comportement d'avant le `#146` : ce module ne peut que faire *moins* de rotations, jamais
 * moins de sessions.
 */
export function isUsable(session: StoredSession | null, now: Date): session is StoredSession {
  if (session === null) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return expiresAt - now.getTime() > EXPIRY_MARGIN_SECONDS * 1000;
}

/**
 * Relit ce que le trousseau a rendu.
 *
 * Le contenu vient du disque, écrit par une version de l'app qui n'est pas forcément celle qui
 * le relit : une forme inattendue rend `null` — donc une rotation — plutôt qu'un
 * `{ status: 'signedIn' }` portant un profil troué, qui casserait au premier écran qui le lit.
 * On ne valide que ce dont dépend la reprise ; le reste du profil est du contrat, et le contrat
 * ne se revalide pas à la lecture du disque.
 */
export function parseStoredSession(raw: string | null): StoredSession | null {
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const { accessToken, expiresAt, user } = parsed as Partial<StoredSession>;

  if (typeof accessToken !== 'string' || accessToken === '') {
    return null;
  }

  if (typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt))) {
    return null;
  }

  if (typeof user !== 'object' || user === null || typeof user.id !== 'string') {
    return null;
  }

  return { accessToken, expiresAt, user };
}
