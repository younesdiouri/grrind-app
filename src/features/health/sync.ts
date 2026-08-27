import { api } from '@/api/client';
import { failureFrom, type Failure } from '@/features/auth/problems';
import { fingerprintOf } from '@/features/health/batchKey';
import { noteSettled } from '@/features/health/journal';
import { healthProvider } from '@/features/health/current';
import { batchKeys } from '@/features/health/keyStore';
import type { WorkoutData } from '@/features/health/provider';
import { sendUntilAnswered, type Answer, type Reply } from '@/features/health/replay';
import { importTimeoutMsFor, retryDelaysFor } from '@/features/health/retryPolicy';
import { createSyncCoordinator, type SyncOutcome, type SyncTrigger } from '@/features/health/syncCoordinator';
import { windowStart } from '@/features/health/syncState';
import { enqueuePending } from '@/features/reward/pending';
import type { SyncSummary } from '@/features/reward/timeline';

/**
 * La synchronisation, de bout en bout.
 *
 * L'enchaînement tient en cinq temps, et chacun a son fichier :
 *
 * 1. `GET /api/workouts/sync-state` — depuis quand ? Le curseur vient du serveur (`syncState.ts`).
 * 2. Le fournisseur rend ce qui a bougé depuis (`provider.ts`, `current.ts`).
 * 3. Le lot obtient sa clé d'idempotence, appariée à son empreinte (`batchKey.ts`, `keyStore.ts`).
 * 4. `POST /api/workouts/import`, rejoué tant que l'issue est inconnue (`replay.ts`), selon un
 *    budget — nombre de rejeux et délai avant abandon — qui dépend du déclencheur
 *    (`retryPolicy.ts`).
 * 5. Le `SyncSummary` part se faire jouer — ou pas, voir plus bas (`src/features/reward/`).
 *
 * Le tout est sérialisé par `syncCoordinator.ts` : **une seule synchronisation à la fois**, et
 * pas deux à trente secondes d'intervalle.
 *
 * ————— Un chemin, quatre déclencheurs ——————————————————————————————————————————————————
 *
 * Le bouton, l'ouverture de l'app et le retour au premier plan regardent tous les trois un
 * écran : leur `SyncSummary` peut se jouer dès qu'il arrive. Le réveil HealthKit (#55) emprunte
 * exactement le même chemin — même `POST /api/workouts/import`, même clé d'idempotence, même
 * traitement de la réponse — mais lui n'a personne devant l'écran. **Il ne joue donc rien** : le
 * résumé va se mettre en file (`pending.ts`) comme n'importe quel autre, et attend d'être
 * consommé à la prochaine ouverture par le portillon de lancement (`launchGate.ts`). Ce qu'un
 * `expo-background-task` en V1 aurait cassé reste vrai — une progression ne se joue jamais dans
 * le vide — et c'est exactement pour ça que le réveil écrit sur le disque au lieu d'animer.
 *
 * Le câblage du réveil lui-même — `enableBackgroundDelivery()`, l'événement natif, l'ancre —
 * ne vit pas ici : voir `backgroundWakeup.ios.ts`, qui appelle `sync('background')` comme
 * n'importe quel appelant, et `anchorPolicy.ts` pour la décision qui suit.
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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Le signal d'abandon de la requête d'import, selon le budget du déclencheur
 * (`importTimeoutMsFor`, `retryPolicy.ts`).
 *
 * `AbortSignal.timeout` n'existe pas sous le polyfill que React Native embarque
 * (`abort-controller` v3, antérieur à cette méthode) : `AbortController` et `setTimeout` font
 * le même travail, à la main. `cancel()` doit être appelé une fois la requête réglée — verdict
 * ou abandon — sans quoi la minuterie tournerait pour rien après coup.
 */
function importDeadline(trigger: SyncTrigger): { signal: AbortSignal | undefined; cancel: () => void } {
  const timeoutMs = importTimeoutMsFor(trigger);
  if (timeoutMs === null) {
    return { signal: undefined, cancel: () => undefined };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function perform(trigger: SyncTrigger): Promise<SyncResult> {
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

  // 4. L'envoi, rejoué tant qu'on ignore ce que le serveur a fait — sous un abandon en
  //    arrière-plan (`importDeadline`) : un abandon est une panne de transport comme une autre
  //    pour `sendUntilAnswered`, donc une issue **inconnue**, donc pas de commit d'ancre — voir
  //    `anchorPolicy.ts`. La même différence se relira simplement au prochain réveil.
  const deadline = importDeadline(trigger);
  let answer: Answer<SyncSummary>;
  try {
    answer = await sendUntilAnswered<SyncSummary>(
      () =>
        api.POST('/api/workouts/import', {
          params: { header: { 'Idempotency-Key': key } },
          body: { workouts },
          signal: deadline.signal,
        }) as unknown as Promise<Reply<SyncSummary>>,
      { delays: retryDelaysFor(trigger), sleep },
    );
  } finally {
    deadline.cancel();
  }

  if (!answer.ok) {
    // La clé **reste** en place : aucun verdict n'est tombé, ou il en est tombé un que la
    // prochaine tentative doit pouvoir rejouer à l'identique. L'effacer ici rouvrirait
    // exactement la fenêtre que ce mécanisme ferme.
    return { kind: 'failed', failure: failureFrom(answer.refusal) };
  }

  // Le lot a son verdict : la clé n'a plus rien à protéger, et la garder ferait rejouer une
  // clé périmée sur un lot différent — un 409 `idempotency-key-reused` gratuit.
  await batchKeys.forget();

  // Une progression qui n'a rien crédité n'est pas un moment : `imported` vide veut dire que
  // tout était déjà compté ou écarté, et ouvrir un plein écran là-dessus serait une fausse
  // joie. C'est aussi ce que dit `totals === null`.
  if (answer.data.imported.length > 0) {
    // **Avant** de rendre le résultat, et sur le disque : à partir d'ici la progression est
    // due au joueur, même si l'app meurt dans la seconde. Le serveur, lui, la considère déjà
    // comptée et ne la renverra jamais. En file, pas en valeur : un réveil qui tombe pendant
    // qu'un résumé précédent attend encore de se jouer ne doit pas l'effacer.
    //
    // `manual` est le seul déclencheur qui vienne d'un **geste** : le bouton de
    // synchronisation, le tirer-pour-rafraîchir. Une progression qu'on vient de demander n'a
    // pas à attendre le prochain lancement à froid — voir `wasSolicited` (#97).
    enqueuePending(answer.data, trigger === 'manual');
  }

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

    // Et sur le disque (#82). `SyncStatus` reste l'état courant, le journal n'en est que la
    // mémoire — celle qui survit à la fermeture de l'app, et sans laquelle « est-ce que
    // l'observer tourne ? » n'a aucune réponse. Rien ne décide quoi que ce soit à partir de
    // là : c'est un écran de réglages qui le lit, et rien d'autre.
    const result = outcome.result;
    noteSettled({
      outcome: result.kind,
      imported: result.kind === 'summary' ? result.summary.imported.length : null,
      failure: result.kind === 'failed' ? result.failure : null,
    });
  }

  return outcome;
}
