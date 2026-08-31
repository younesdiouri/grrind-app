import { api } from '@/api/client';
import { failureFrom, type Failure } from '@/features/auth/problems';
import { fingerprintOf } from '@/features/health/batchKey';
import { noteRunStarted, noteSettled } from '@/features/health/journal';
import { healthProvider } from '@/features/health/current';
import { batchKeys } from '@/features/health/keyStore';
import type { WorkoutData } from '@/features/health/provider';
import { sendUntilAnswered, type Reply } from '@/features/health/replay';
import { retryDelaysFor, runBudgetMsFor } from '@/features/health/retryPolicy';
import { BudgetExceeded, withinBudget } from '@/features/health/runBudget';
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
 *    nombre de rejeux qui dépend du déclencheur (`retryPolicy.ts`).
 * 5. Le `SyncSummary` part se faire jouer — ou pas, voir plus bas (`src/features/reward/`).
 *
 * Le tout est sérialisé par `syncCoordinator.ts` : **une seule synchronisation à la fois**, et
 * pas deux à trente secondes d'intervalle.
 *
 * ————— Un budget sur la course entière, pas sur le seul `POST` (#140) ——————————————————————
 *
 * En arrière-plan, un signal d'abandon naît à l'**entrée** de cette fonction et couvre les
 * étapes 1 et 4 — le `GET` autant que le `POST` — parce que le `GET` peut à lui seul
 * déclencher un rafraîchissement de jeton (401), et qu'un réveil sans personne pour regarder
 * n'a que `runBudgetMsFor('background')` (`retryPolicy.ts`) avant le chien de garde natif
 * d'iOS. Une course qui a passé tout son budget dans le refresh n'aura jamais tenté le
 * `POST` — c'est la panne diagnostiquée en production le 2026-08-31 (#140).
 *
 * Ce que ce signal ne fait **jamais**, c'est annuler le rafraîchissement lui-même :
 * `runDeadline()` n'est passé ni à `createAuthMiddleware`, ni à `session.refresh()`, ni à
 * `publicApi` — l'invariant n°1 (voir `CLAUDE.md`) l'emporte sur ce budget. Un
 * `POST /api/auth/refresh` interrompu en vol laisse le serveur avoir consommé le jeton sans
 * que le client ait persisté la paire neuve : la prochaine ouverture rejoue un jeton mort, et
 * le back révoque la famille entière — déconnexion de l'appareil. Un refresh déjà parti va
 * donc au bout, quoi qu'il arrive à ce budget.
 *
 * Et parce que le rejeu post-refresh d'`authMiddleware.ts` clone la requête d'origine
 * (`request.clone()`) pour la rejouer sur `Authorization` neuf, et que le polyfill `fetch` de
 * React Native n'offre aucune garantie que `signal` survive à ce clonage, cette fonction ne
 * compte pas sur l'abandon du transport pour s'arrêter à temps : le `GET` et le `POST` sont
 * courus contre le budget par `withinBudget()` (`runBudget.ts`), qui rend `BudgetExceeded` dès
 * que le signal s'abat, que l'appel sous-jacent ait ou non fini par le remarquer lui-même. Un
 * simple point de contrôle posé *après* un `await` ne suffisait pas : quand le budget expire
 * pendant l'attente, l'`await` ne revient jamais jusqu'à ce point — `fetch` rejette sur
 * `AbortError`, et l'exception saute par-dessus (revue de la #141). `withinBudget` rend cet
 * abandon prouvable sous `node --test` plutôt que dépendant d'un polyfill.
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
  | { kind: 'failed'; failure: Failure }
  /**
   * Notre propre budget (`runBudgetMsFor`, `retryPolicy.ts`) a expiré avant qu'un verdict ne
   * tombe (#140). Distinct de `failed` : ce n'est pas un refus du serveur, on ne sait même
   * pas s'il a été atteint. C'est ce qui permet à l'écran de le dire pour ce que c'est, plutôt
   * que de le confondre avec une panne réseau — voir `outcomeDetail()` (`reglages.tsx`).
   */
  | { kind: 'budgetExceeded' };

/** Le maximum que le contrat accepte dans un lot. */
const MAX_BATCH = 200;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Le signal d'abandon de la course, selon le budget du déclencheur
 * (`runBudgetMsFor`, `retryPolicy.ts`).
 *
 * `AbortSignal.timeout` n'existe pas sous le polyfill que React Native embarque
 * (`abort-controller` v3, antérieur à cette méthode) : `AbortController` et `setTimeout` font
 * le même travail, à la main. `cancel()` doit être appelé une fois la course réglée — verdict
 * ou abandon — sans quoi la minuterie tournerait pour rien après coup.
 */
function runDeadline(trigger: SyncTrigger): { signal: AbortSignal | undefined; cancel: () => void } {
  const budgetMs = runBudgetMsFor(trigger);
  if (budgetMs === null) {
    return { signal: undefined, cancel: () => undefined };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

/**
 * Le budget a-t-il expiré ?
 *
 * Réservé aux deux étapes qui ne passent pas par le réseau — la lecture HealthKit et la clé
 * d'idempotence, ni l'une ni l'autre courues par `withinBudget()` (`runBudget.ts`) — et posé
 * *après* elles, jamais avant : la lecture HealthKit n'est pas annulable (`runBudgetMsFor`,
 * `retryPolicy.ts`), donc il n'y a rien à interrompre plus tôt, seulement à constater une fois
 * qu'elle a rendu la main. Le `GET` et le `POST`, eux, sont courus contre le budget directement
 * — voir le docblock en tête de fichier.
 */
function exceeded(deadline: { signal: AbortSignal | undefined }): boolean {
  return deadline.signal?.aborted === true;
}

async function perform(trigger: SyncTrigger): Promise<SyncResult> {
  // C'est ici et pas dans `sync()` que la synchronisation commence vraiment : un appel refusé
  // par le seuil, ou qui en rejoint une déjà partie, n'entre jamais dans cette fonction. Le
  // dire ailleurs ferait clignoter l'écran entre « en cours » et « rien à faire ».
  publish({ phase: 'syncing' });

  // Et sur le disque (#140) : une course tuée par le chien de garde natif avant tout verdict
  // n'appellera jamais `noteSettled()` plus bas. Sans cette ligne, rien ne distinguerait ça
  // d'une synchronisation qui n'a simplement jamais eu lieu — voir `journal.ts`.
  noteRunStarted();

  // Le budget de toute la course : le `GET` ci-dessous, le refresh qu'un 401 peut y déclencher,
  // et le `POST` plus bas. Jamais le refresh lui-même — voir le docblock en tête de fichier.
  const deadline = runDeadline(trigger);

  try {
    if (!(await healthProvider.isAvailable())) {
      return { kind: 'unavailable' };
    }

    // 1. Depuis quand. Le cache local évite un aller-retour, mais il n'est pas la vérité : ce
    //    n'est pas une optimisation qu'on peut se permettre au prix d'un curseur faux.
    //
    // Couru contre le budget, pas seulement bordé par lui : voir `withinBudget()`
    // (`runBudget.ts`) et le docblock en tête de fichier — un point de contrôle posé après
    // cet `await` ne s'exécuterait jamais si le budget expire pendant l'attente elle-même.
    const state = await withinBudget(
      api.GET('/api/workouts/sync-state', { signal: deadline.signal }),
      deadline.signal,
    );

    if (state.data === undefined) {
      return { kind: 'failed', failure: failureFrom(state.error) };
    }

    // 2. Ce qui a bougé depuis. Non annulable — voir `runBudgetMsFor` — donc pas de point de
    //    contrôle avant, seulement après.
    const since = windowStart(state.data, new Date());
    const found = await healthProvider.workoutsSince(since);

    if (exceeded(deadline)) {
      return { kind: 'budgetExceeded' };
    }

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

    if (exceeded(deadline)) {
      return { kind: 'budgetExceeded' };
    }

    // 4. L'envoi, rejoué tant qu'on ignore ce que le serveur a fait, et couru contre le même
    //    budget que le `GET` — le rejeu post-refresh d'un 401 sur ce `POST` a la même faiblesse
    //    que celui du `GET` (voir `withinBudget()`), donc le même traitement : un abandon est
    //    une panne de transport comme une autre pour `sendUntilAnswered`, donc une issue
    //    **inconnue**, donc pas de commit d'ancre — voir `anchorPolicy.ts`. La même différence
    //    se relira simplement au prochain réveil.
    const answer = await withinBudget(
      sendUntilAnswered<SyncSummary>(
        () =>
          api.POST('/api/workouts/import', {
            params: { header: { 'Idempotency-Key': key } },
            body: { workouts },
            signal: deadline.signal,
          }) as unknown as Promise<Reply<SyncSummary>>,
        { delays: retryDelaysFor(trigger), sleep },
      ),
      deadline.signal,
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
  } catch (error) {
    // `withinBudget()` (`runBudget.ts`) jette `BudgetExceeded` quand c'est le budget qui a
    // tranché, jamais sur une vraie panne de transport survenue pendant qu'il tenait encore —
    // voir son docblock. Tout le reste est une panne comme `sync()` en attrapait déjà une avant
    // cette fonction : la classer ici plutôt que de la laisser remonter garde `perform()`
    // cohérente avec son propre type de retour.
    if (error instanceof BudgetExceeded) {
      return { kind: 'budgetExceeded' };
    }

    return { kind: 'failed', failure: failureFrom(error) };
  } finally {
    deadline.cancel();
  }
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
