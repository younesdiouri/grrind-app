import type { SyncTrigger } from '@/features/health/syncCoordinator';

/**
 * Le budget d'une synchronisation selon ce qui l'a demandée.
 *
 * Deux réglages, tous deux ici parce que c'est la même notion : combien on est prêt à
 * dépenser pour obtenir un verdict, et ça dépend de qui attend.
 *
 * ————— Combien de fois rejouer ————————————————————————————————————————————————————————
 *
 * Le bouton, l'ouverture de l'app et le retour au premier plan rejouent trois fois
 * (`FOREGROUND_DELAYS`, voir `replay.ts` pour ce que « rejouer » veut dire) parce qu'un joueur
 * regarde l'écran et peut attendre quelques secondes de plus pour ne pas perdre son animation.
 *
 * Le réveil HealthKit n'a personne pour regarder, et le budget d'exécution est compté avant
 * même que le natif ne coupe la parole — voir le chien de garde de 25 secondes dans
 * `GrrindHealthModule.swift`. Une requête, et on rend la main : un échec ne s'y rattrape pas
 * sur place, le prochain réveil ou la prochaine ouverture repartira avec la **même** clé
 * d'idempotence, puisque rien n'aura bougé côté serveur.
 *
 * ————— Combien de temps laisser à la course entière (#140) ——————————————————————————————
 *
 * Ce budget couvrait autrefois le seul `POST /api/workouts/import`. Le `GET
 * /api/workouts/sync-state` qui le précède — et le rafraîchissement de jeton qu'un 401 peut y
 * déclencher — n'avait **aucune** borne : un réveil pouvait passer les 25 secondes du chien de
 * garde natif à attendre un refresh abouti sans qu'il reste une seconde pour l'import lui-même.
 * C'est très exactement la trace lue en production le 2026-08-31 (#140) : refresh consommé,
 * `POST /api/workouts/import` jamais parti.
 *
 * Le budget porte donc désormais sur **toute la course** : le `GET`, le refresh qu'il peut
 * provoquer, et le `POST`. Il naît à l'entrée de `perform()` (`sync.ts`) et non plus juste
 * avant l'envoi.
 *
 * Il ne dimensionne **pas** le rafraîchissement lui-même — l'invariant n°1 l'emporte, voir le
 * docblock d'`authMiddleware.ts` : une rotation de jeton abandonnée en vol laisse le serveur
 * avoir consommé l'ancien sans que le client ait persisté le nouveau, et la prochaine ouverture
 * rejoue un jeton mort — la famille entière est révoquée, l'appareil se déconnecte. Le signal ne
 * se plombe donc jamais jusqu'à `session.refresh()` : voir `sync.ts`, qui le pose sur le `GET`
 * et le `POST`, jamais plus profond.
 *
 * Contre le chien de garde de 25 secondes, et pas les 10 secondes recopiées de l'ancien
 * budget — qui ne couvraient qu'un `POST` seul, quand une course en contient deux (le `GET`, le
 * `POST`) et parfois trois (le refresh entre les deux) :
 *
 * - ~5 s en amont, hors de notre main : le réveil peut arriver app tuée, il faut charger le
 *   bundle JS et remonter la session avant même d'entrer dans `perform()` ;
 * - ~5 s en aval : la lecture HealthKit n'est pas annulable, puis viennent la clé
 *   d'idempotence, la file d'attente, le journal, la notification et l'ancre ;
 * - ~3 s de marge, pour que **notre** abandon précède le couperet natif — c'est tout l'intérêt
 *   du budget : un abandon à nous écrit le journal (`journal.ts`) et laisse l'ancre en place
 *   (`anchorPolicy.ts`), le couperet natif ne laisse rien du tout.
 *
 * Ce n'est pas un desserrage : le `POST` disposait de dix secondes après un `GET` et un
 * refresh non bornés, c'est-à-dire d'un total illimité. Il dispose désormais de ce qui reste
 * de douze secondes partagées avec tout ce qui le précède.
 *
 * En avant-plan, aucun budget : quelqu'un regarde, et il n'y a pas de couperet qui coupe la
 * parole au processus.
 *
 * Un abandon rend l'issue **inconnue** exactement comme une panne de transport : `fetch` rejette
 * sur `AbortError`, `sendUntilAnswered` (`replay.ts`) le traite déjà comme n'importe quelle
 * requête qui ne répond pas, et `shouldCommitAnchor` (`anchorPolicy.ts`) n'y fait donc pas
 * avancer l'ancre. C'est ce qui rend ce budget sans danger : la même différence se relit
 * simplement au prochain réveil, rien n'est perdu.
 *
 * Fichier séparé de `sync.ts` et sans dépendance d'exécution, pour la même raison que
 * `syncCoordinator.ts` : cette politique se prouve sous `node --test`, elle ne se constate pas
 * sur un appareil qu'on a laissé sonner dans une poche.
 */

const FOREGROUND_DELAYS = [400, 1200, 3000] as const;
const BACKGROUND_DELAYS: readonly number[] = [];

export function retryDelaysFor(trigger: SyncTrigger): readonly number[] {
  return trigger === 'background' ? BACKGROUND_DELAYS : FOREGROUND_DELAYS;
}

/** Le chien de garde natif — `completionWatchdogSeconds`, `GrrindHealthModule.swift`. */
const NATIVE_WATCHDOG_SECONDS = 25;
/** Charger le bundle et remonter la session sur une app tuée, avant d'entrer dans `perform()`. */
const BOOTSTRAP_MARGIN_SECONDS = 5;
/** La lecture HealthKit non annulable, la clé, la file, le journal, la notification, l'ancre. */
const TAIL_MARGIN_SECONDS = 5;
/** Pour que notre abandon précède le couperet natif au lieu de le suivre. */
const NATIVE_WATCHDOG_HEADROOM_SECONDS = 3;

const BACKGROUND_RUN_BUDGET_MS =
  (NATIVE_WATCHDOG_SECONDS - BOOTSTRAP_MARGIN_SECONDS - TAIL_MARGIN_SECONDS - NATIVE_WATCHDOG_HEADROOM_SECONDS) *
  1000;

/**
 * Le budget de toute la course en arrière-plan, en millisecondes. `null` : pas de budget, pas
 * de couperet — voir le docblock ci-dessus.
 */
export function runBudgetMsFor(trigger: SyncTrigger): number | null {
  return trigger === 'background' ? BACKGROUND_RUN_BUDGET_MS : null;
}
