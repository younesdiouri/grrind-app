import { api } from '@/api/client';
import { healthProvider } from '@/features/health/current';
import { batchOfDays, WINDOW_DAYS } from '@/features/health/dailyActivityWindow';

/**
 * L'énergie active quotidienne, remontée au serveur — la moitié « santé de fond » de Vitality.
 *
 * ————— Pourquoi elle existe ————————————————————————————————————————————————————————————
 *
 * Vitality a deux moitiés. La variété des sports se calcule déjà toute seule à partir du ledger
 * d'XP. La seconde est ce qui se passe **entre** les séances : sans elle, quelqu'un qui
 * s'entraîne quatre fois par semaine et reste assis les quatre-vingts autres heures a exactement
 * la même Vitality que quelqu'un qui bouge tout le temps. Le serveur sait la calculer
 * (`grrind-back#165`) ; il ne recevait rien.
 *
 * ————— Ce que ce module n'est pas —————————————————————————————————————————————————————
 *
 * **Ce n'est pas un import.** La ressemblance s'arrête au fait que les deux lisent Santé, et
 * confondre les deux coûterait cher :
 *
 * - **Pas d'`Idempotency-Key`, et pas de clé persistée.** `PUT` est idempotent par nature — il
 *   n'y a **aucun crédit** à protéger d'un double comptage, contrairement à l'import. Réutiliser
 *   `batchKey.ts` ici ajouterait un mécanisme dont le seul effet serait de pouvoir se casser.
 * - **Pas de curseur.** On renvoie toute la fenêtre à chaque fois, la journée du jour comprise :
 *   elle est **révisable** par nature — 4 000 kcal à 14 h, 11 000 à 22 h — et le serveur
 *   l'écrase au lieu de la dupliquer. C'est ce qui rend la révision gratuite.
 * - **Pas de mise en scène.** Rien ne s'anime, rien ne s'affiche, rien ne va en file. Le bonus
 *   se verra à la lecture suivante de la progression, expliqué par `vitalityBreakdown`.
 *
 * **Meilleur effort, et silencieux.** Un échec — hors ligne, serveur endormi, permission jamais
 * accordée — ne bloque rien : la Vitality de base continue de fonctionner sans cette moitié, et
 * l'app reste utilisable telle quelle. C'est le modèle de `registerDevice.ts`, pas celui de
 * `sync.ts` : ça ne passe pas par `SyncResult`, ça ne publie aucun état, ça ne se raconte nulle
 * part. Une journée sans énergie remontée n'est pas un incident.
 *
 * **Aucun calcul de bonus ici.** Le client envoie une mesure brute, le serveur décide de ce
 * qu'elle vaut — même règle que pour l'XP. `bonusPermille` est **appliqué**, jamais à appliquer.
 */

/**
 * Lit la fenêtre et l'envoie. Ne jette jamais, ne rend rien.
 *
 * Le `void` n'est pas une paresse : il n'y a rien à faire du résultat. Le rendre inviterait
 * un appelant à l'attendre, puis à l'afficher, puis à en faire un état — et à transformer un
 * meilleur effort en étape dont on peut échouer.
 */
export async function sendDailyActivity(): Promise<void> {
  try {
    const days = batchOfDays(await healthProvider.dailyActiveEnergy(WINDOW_DAYS));

    if (days === null) {
      return;
    }

    await api.PUT('/api/daily-activity', { body: { days } });
  } catch {
    // Voir le docblock : hors ligne, serveur endormi, ou pas de fournisseur. Rien de tout ça
    // n'est un incident, et la prochaine ouverture renverra la même fenêtre.
  }
}
