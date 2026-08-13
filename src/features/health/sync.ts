import { api } from '@/api/client';
import { failureFrom, type Failure } from '@/features/auth/problems';
import { fingerprintOf } from '@/features/health/batchKey';
import { healthProvider } from '@/features/health/current';
import { batchKeys } from '@/features/health/keyStore';
import type { WorkoutData } from '@/features/health/provider';
import { sendUntilAnswered, type Reply } from '@/features/health/replay';
import { createSyncCoordinator, type SyncOutcome, type SyncTrigger } from '@/features/health/syncCoordinator';
import { windowStart } from '@/features/health/syncState';
import type { SyncSummary } from '@/features/reward/timeline';

/**
 * La synchronisation, de bout en bout.
 *
 * L'enchaînement tient en cinq temps, et chacun a son fichier :
 *
 * 1. `GET /api/workouts/sync-state` — depuis quand ? Le curseur vient du serveur (`syncState.ts`).
 * 2. Le fournisseur rend ce qui a bougé depuis (`provider.ts`, `current.ts`).
 * 3. Le lot obtient sa clé d'idempotence, appariée à son empreinte (`batchKey.ts`, `keyStore.ts`).
 * 4. `POST /api/workouts/import`, rejoué tant que l'issue est inconnue (`replay.ts`).
 * 5. Le `SyncSummary` part se faire jouer (`src/features/reward/`).
 *
 * Le tout est sérialisé par `syncCoordinator.ts` : **une seule synchronisation à la fois**, et
 * pas deux à trente secondes d'intervalle.
 *
 * ————— Pas de tâche de fond en V1 ————————————————————————————————————————————————————
 *
 * `expo-background-task` existe, mais iOS ne garantit aucun réveil. Une synchronisation qu'on ne
 * peut pas expliquer à l'utilisateur produit des animations qui se déclenchent dans le vide —
 * ou pire, une progression déjà jouée quand il ouvre l'app. Les trois déclencheurs sont donc
 * tous des moments où quelqu'un regarde l'écran.
 */

/**
 * L'état de la synchronisation, **hors de l'arbre React**.
 *
 * Même choix que la session d'authentification, et pour la même raison : la synchronisation
 * vit déjà dehors — son coordinateur est un singleton de module, et elle survit au démontage
 * de l'écran qui l'a lancée. La dupliquer dans un `useState` créerait deux vérités à garder
 * d'accord, et obligerait chaque écran à redéclencher pour connaître l'état.
 *
 * React s'y abonne par `useSyncExternalStore` (voir `useSync.ts`), ce qui évite au passage le
 * `setState` synchrone dans un effet — celui qui déclenche des rendus en cascade.
 */
export type SyncStatus =
  | { phase: 'idle' }
  | { phase: 'syncing' }
  | { phase: 'settled'; result: SyncResult };

let status: SyncStatus = { phase: 'idle' };
const listeners = new Set<() => void>();

/**
 * Combien de verdicts sont tombés depuis le démarrage.
 *
 * C'est ce à quoi s'abonne un écran qui doit **relire le serveur** quand la synchronisation
 * a pu changer ses chiffres — l'accueil et ses deux routes. S'abonner au statut lui-même
 * les ferait recharger au passage `idle → syncing`, c'est-à-dire avant que rien n'ait bougé.
 *
 * Le compteur vit ici, avec ce qu'il compte, plutôt que d'être dérivé par le consommateur :
 * `useSyncExternalStore` exige un `getSnapshot` **pur**, et une dérivation qui mémorise
 * quelque part sa dernière valeur vue n'en est pas un.
 */
let settledRevision = 0;

function publish(next: SyncStatus): void {
  status = next;

  if (next.phase === 'settled') {
    settledRevision += 1;
  }

  for (const listener of listeners) {
    listener();
  }
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function getSettledRevision(): number {
  return settledRevision;
}

export function subscribeToSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Ce qu'une synchronisation a produit. */
export type SyncResult =
  /** Le serveur a répondu. `replayed` dit qu'il a ressorti une réponse au lieu de la produire. */
  | { kind: 'summary'; summary: SyncSummary; replayed: boolean }
  /**
   * Le fournisseur n'a rien rendu. **Ce n'est pas une erreur, et ce n'est pas non plus un
   * refus** : HealthKit ne dit jamais si l'utilisateur a refusé la lecture, donc « aucune
   * activité » et « accès non donné » sont indiscernables ici. L'écran qui consomme ça doit
   * être écrit pour l'ambiguïté (#17), pas en choisir une.
   */
  | { kind: 'nothingToSend' }
  /** Pas de fournisseur de santé sur cet appareil. */
  | { kind: 'unavailable' }
  | { kind: 'failed'; failure: Failure };

/** Le maximum que le contrat accepte dans un lot. */
const MAX_BATCH = 200;

/** Les attentes entre deux envois. Trois rejeus, pendant que le joueur regarde l'écran. */
const RETRY_DELAYS = [400, 1200, 3000] as const;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function perform(): Promise<SyncResult> {
  // C'est ici et pas dans `sync()` que la synchronisation commence vraiment : un appel refusé
  // par le seuil, ou qui en rejoint une déjà partie, n'entre jamais dans cette fonction. Le
  // dire ailleurs ferait clignoter l'écran entre « en cours » et « rien à faire ».
  publish({ phase: 'syncing' });

  if (!(await healthProvider.isAvailable())) {
    return { kind: 'unavailable' };
  }

  // 1. Depuis quand. Le cache local évite un aller-retour, mais il n'est pas la vérité : ce
  //    n'est pas une optimisation qu'on peut se permettre au prix d'un curseur faux.
  const state = await api.GET('/api/workouts/sync-state');
  if (state.data === undefined) {
    return { kind: 'failed', failure: failureFrom(state.error) };
  }

  // 2. Ce qui a bougé depuis.
  const since = windowStart(state.data, new Date());
  const found = await healthProvider.workoutsSince(since);

  if (found.length === 0) {
    return { kind: 'nothingToSend' };
  }

  // Le contrat borne le lot à 200. On garde les **plus récents** : c'est ce que le joueur a
  // dans la tête en ouvrant l'app, et le reste n'est pas perdu — le curseur n'avancera que de
  // ce qui est passé, donc la synchronisation suivante reprendra où celle-ci s'est arrêtée.
  const workouts: WorkoutData[] = found.slice(-MAX_BATCH);

  // 3. La clé, appariée au lot. Même lot qu'à la tentative d'avant → même clé → le serveur
  //    ressort la réponse d'origine plutôt qu'une synchronisation vide.
  const key = await batchKeys.keyFor(fingerprintOf(workouts.map((w) => w.externalId)));

  // 4. L'envoi, rejoué tant qu'on ignore ce que le serveur a fait.
  const answer = await sendUntilAnswered<SyncSummary>(
    () =>
      api.POST('/api/workouts/import', {
        params: { header: { 'Idempotency-Key': key } },
        body: { workouts },
      }) as unknown as Promise<Reply<SyncSummary>>,
    { delays: RETRY_DELAYS, sleep },
  );

  if (!answer.ok) {
    // La clé **reste** en place : aucun verdict n'est tombé, ou il en est tombé un que la
    // prochaine tentative doit pouvoir rejouer à l'identique. L'effacer ici rouvrirait
    // exactement la fenêtre que ce mécanisme ferme.
    return { kind: 'failed', failure: failureFrom(answer.refusal) };
  }

  // Le lot a son verdict : la clé n'a plus rien à protéger, et la garder ferait rejouer une
  // clé périmée sur un lot différent — un 409 `idempotency-key-reused` gratuit.
  await batchKeys.forget();

  return { kind: 'summary', summary: answer.data, replayed: answer.replayed };
}

const coordinator = createSyncCoordinator<SyncResult>({
  perform,
  now: () => Date.now(),
  minimumIntervalMs: 30_000,
});

/**
 * Synchronise, ou rejoint celle qui tourne déjà.
 *
 * Ne jette pas : tout ce qui peut mal se passer ressort en `SyncResult`. Un déclencheur
 * automatique n'a personne pour attraper une exception, et une synchronisation ratée ne doit
 * pas être un incident — c'est un état de l'app, pas une panne.
 */
export async function sync(trigger: SyncTrigger): Promise<SyncOutcome<SyncResult>> {
  let outcome: SyncOutcome<SyncResult>;
  try {
    outcome = await coordinator.sync(trigger);
  } catch (error) {
    outcome = { status: 'done', result: { kind: 'failed', failure: failureFrom(error) } };
  }

  // `throttled` n'est **pas** un résultat : rien n'est parti, et l'écran doit rester exactement
  // sur ce qu'il montrait. L'annoncer serait expliquer une mécanique interne à quelqu'un qui a
  // juste rouvert son app.
  if (outcome.status !== 'throttled') {
    publish({ phase: 'settled', result: outcome.result });
  }

  return outcome;
}
