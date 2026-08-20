import type { SyncTrigger } from '@/features/health/syncCoordinator';

/**
 * Le budget d'un import selon ce qui a demandé la synchronisation.
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
 * ————— Combien de temps laisser à la requête elle-même ——————————————————————————————————
 *
 * Le chien de garde natif de 25 secondes borne **toute** la fenêtre d'exécution du réveil —
 * la requête de curseur, la lecture HealthKit, l'import et l'écriture sur disque comprises —
 * donc l'import ne peut pas s'en arroger la totalité. Dix secondes laissent la marge à ce qui
 * l'entoure ; un import qui n'a pas répondu en dix secondes dans une poche ne répondra pas
 * utilement, et rien ne sert d'attendre plus près du couperet natif.
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

/** Le budget de la requête d'import, en millisecondes. `null` : pas de budget, pas de couperet. */
const BACKGROUND_TIMEOUT_MS = 10_000;

export function importTimeoutMsFor(trigger: SyncTrigger): number | null {
  return trigger === 'background' ? BACKGROUND_TIMEOUT_MS : null;
}
