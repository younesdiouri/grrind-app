import type { components } from '@/api/schema';

export type SyncState = components['schemas']['SyncState'];

/**
 * Depuis quand demander au fournisseur.
 *
 * **Le curseur vient du serveur.** Le client garde sa dernière synchronisation en cache pour
 * éviter un aller-retour au démarrage, mais il ne doit pas en *dépendre* : réinstallation,
 * changement d'appareil, second appareil sur le même compte. Le cache local est une
 * optimisation, la vérité est ailleurs.
 *
 * **La fenêtre est servie et pas codée en dur.** Elle doit pouvoir bouger sans publication sur
 * les stores : une app qui demanderait trente jours pendant que le serveur en accepte soixante
 * enverrait moins que ce qu'elle pourrait.
 *
 * Ce module est pur — il transforme un `SyncState` en date, rien de plus — pour que le calcul
 * du tout premier lancement, celui qui décide de ce que le joueur verra de son passé, se prouve
 * sans horloge réelle.
 */

/** Le nombre de millisecondes dans un jour. Aucune arithmétique de calendrier ici : la fenêtre
 * est une durée, pas une date de calendrier, et le serveur la tranche de son côté. */
const DAY_MS = 86_400_000;

/**
 * L'instant à partir duquel interroger le fournisseur.
 *
 * Deux cas, et le second est celui qui compte :
 *
 * - `lastImportedAt` connu — on repart de là. Le serveur le calcule sur la fin du workout le
 *   plus récent qu'il **connaisse**, archives hors fenêtre comprises : c'est la frontière de ce
 *   qu'il sait, pas de ce qu'il a payé. Sans quoi tout l'archivé serait re-téléchargé et
 *   ré-envoyé à chaque synchronisation.
 * - **Tout premier lancement** — on demande la fenêtre complète servie par le serveur, et
 *   surtout **pas « tout HealthKit »**. Un téléphone contient parfois trois ans d'Apple Santé ;
 *   les envoyer tous ferait un lot que le contrat refuse (200 workouts au maximum) et
 *   demanderait au serveur d'arbitrer un passé qu'il va de toute façon archiver. C'est lui qui
 *   décide de ce qu'il en fait — le client se contente de ne pas lui mentir sur la fenêtre.
 *
 * On recule d'une marge dans les deux cas. Le curseur est une **fin** de workout, et une séance
 * peut être écrite dans Santé après coup — un import Strava, une montre synchronisée en
 * différé. Redemander est gratuit (le serveur dédoublonne), rater ne l'est pas.
 */
export function windowStart(state: SyncState, now: Date): Date {
  const fullWindow = now.getTime() - state.importWindowDays * DAY_MS;

  if (state.lastImportedAt === null) {
    return new Date(fullWindow);
  }

  const since = Date.parse(state.lastImportedAt);

  // Un curseur illisible — un back plus récent, un cache local corrompu — vaut un premier
  // lancement. C'est le choix le moins destructeur : au pire on renvoie ce que le serveur
  // connaît déjà et qu'il dédoublonnera, au mieux on rattrape ce qu'un curseur cassé aurait
  // fait manquer pour toujours.
  if (Number.isNaN(since)) {
    return new Date(fullWindow);
  }

  // Jamais avant le début de la fenêtre : ce qui est plus ancien ne rapporte rien, et le
  // serveur l'a déjà archivé au premier import.
  return new Date(Math.max(fullWindow, since - OVERLAP_MS));
}

/**
 * De combien on recule le curseur, systématiquement.
 *
 * Une heure. C'est réglé sur le cas réel qu'on veut couvrir — une séance écrite dans Santé un
 * moment après avoir eu lieu — et non sur une horloge qu'on soupçonnerait de dériver : le
 * client ne compare jamais son heure à celle du serveur, il recule d'une durée.
 */
const OVERLAP_MS = 3_600_000;
