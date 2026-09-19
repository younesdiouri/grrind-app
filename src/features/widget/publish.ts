import { api } from '@/api/client';
import { writeSnapshot } from '@/features/widget/bridge';
import { snapshotFrom, type Progression } from '@/features/widget/snapshot';

/**
 * Les deux façons de rafraîchir le widget, selon ce que l'appelant a déjà en main.
 *
 * ————— Deux entrées et pas une —————————————————————————————————————————————————————————
 *
 * L'accueil vient de lire `GET /api/progression` pour s'afficher : lui faire relire la même
 * route pour le widget doublerait la requête à chaque ouverture. Le réveil en arrière-plan,
 * lui, n'a jamais la progression — il importe des séances et reçoit un `SyncSummary`, qui
 * décrit un *passage* et pas un état. Une seule fonction obligerait l'un des deux à mentir.
 *
 * ————— Pourquoi le réveil en arrière-plan vaut sa requête ————————————————————————————————
 *
 * C'est lui qui donne son intérêt au widget. Sans cette entrée, les chiffres de l'écran
 * d'accueil ne bougeraient qu'après que le joueur a ouvert l'app — c'est-à-dire exactement
 * quand il n'a plus besoin du widget. Avec elle, la séance est comptée, la notification part,
 * et le widget est déjà juste quand il regarde son téléphone.
 */

/** L'appelant a la progression : rien à demander au serveur. */
export async function publishProgression(progression: Progression): Promise<void> {
  await writeSnapshot(snapshotFrom(progression, new Date()));
}

/**
 * L'appelant ne l'a pas : une lecture, puis la même publication.
 *
 * Ne jette jamais — un widget périmé ne doit pas faire échouer l'import qui l'accompagne, ni
 * empêcher l'ancre HealthKit d'avancer. Un refus du serveur laisse simplement l'ancien
 * instantané en place, avec sa date.
 */
export async function refreshWidget(): Promise<void> {
  try {
    const progression = await api.GET('/api/progression');

    if (progression.data === undefined) {
      return;
    }

    await publishProgression(progression.data);
  } catch {
    // Voir le docblock : jamais au détriment de l'appelant.
  }
}
