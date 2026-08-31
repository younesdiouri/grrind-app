import { File, Paths } from 'expo-file-system';

import type { Failure } from '@/features/auth/problems';
import type { SessionLostReason } from '@/features/auth/sessionLostReason';

/**
 * Ce que l'app se rappelle d'elle-même — et **pourquoi c'est écrit**.
 *
 * ————— La question à laquelle ce fichier répond ————————————————————————————————————————
 *
 * « Est-ce que l'observer HealthKit tourne vraiment ? » On se la pose à chaque test, et rien
 * dans l'app ne permettait d'y répondre : une séance qui remonte en arrière-plan n'a par
 * définition personne devant l'écran, et son résumé va se mettre en file (`pending.ts`) pour
 * se jouer à la prochaine ouverture. Entre les deux, aucune trace.
 *
 * Le pire cas est celui qui arrive vraiment : le serveur dort — `fly.io` arrête la machine
 * quand personne ne l'utilise — et le réveil ne dispose que de douze secondes sans rejeu pour
 * toute la course (`retryPolicy.ts`). Un démarrage à froid passe au-dessus, l'import est
 * abandonné, l'issue reste inconnue, l'ancre n'avance pas. **Rien n'est perdu** : la même
 * différence se relit au réveil suivant. Mais vu du téléphone, c'est indiscernable d'un
 * observer qui ne s'est jamais inscrit.
 *
 * Deux lignes séparent les deux cas, et c'est tout l'objet de ce module : le dernier **réveil
 * reçu**, et la dernière **synchronisation aboutie**. Un réveil récent avec une synchro
 * ancienne accuse le réseau ou le serveur ; pas de réveil depuis trois jours accuse
 * l'inscription.
 *
 * ————— L'ouverture de l'app détruisait la preuve (#140) ——————————————————————————————————
 *
 * `settledAt` n'a qu'un seul emplacement, et `sync('launch')` l'écrase avant que quiconque ait
 * pu lire ce qu'il contenait. Une course tuée par le chien de garde natif — le budget de
 * `retryPolicy.ts` protège du reste, pas de ça — n'appelle jamais `noteSettled()` : elle ne
 * laissait donc aucune trace, et la première ouverture qui suit efface même la dernière ligne
 * valable avant de l'avoir montrée à qui vient la consulter.
 *
 * `runStartedAt` répond à ça : posé à l'**entrée** de `perform()` (`sync.ts`), pas dans
 * `sync()` — un appel `throttled` n'entre jamais dans `perform()` et ne doit rien écrire — il
 * survit, lui, à l'ouverture suivante. Une entrée plus récente que la dernière sortie
 * (`settledAt`) est un fait écrit, pas une soustraction de dates faite par le lecteur : voir
 * `hasOrphanedRun()` (`runDiagnostics.ts`, séparé de ce fichier pour la même raison
 * qu'`anchorPolicy.ts` est séparé de `sync.ts` — voir son docblock).
 *
 * Une course coupée par **notre** budget, elle, ressort par `noteSettled()` comme n'importe
 * quel autre verdict — `outcome: 'budgetExceeded'` — parce qu'on garde la main pour l'écrire.
 * Seul le couperet natif, qui ne la rend pas, laisse une entrée orpheline.
 *
 * ————— Ce que ce n'est pas ————————————————————————————————————————————————————————————
 *
 * **Pas une deuxième source de vérité.** `SyncStatus` (`sync.ts`) reste l'état courant de la
 * synchronisation ; ce journal n'en est que la mémoire, celle qui survit à la fermeture de
 * l'app. Personne ne décide quoi que ce soit à partir d'ici — c'est un écran qui le lit, et
 * rien d'autre.
 *
 * **Pas un banc de développement.** Les bancs sont sortis de l'accueil au #84 et n'y
 * reviennent pas déguisés. Un joueur a de bonnes raisons de vouloir savoir quand son app a
 * parlé au serveur pour la dernière fois, et ce bloc est fait pour rester en production.
 *
 * ————— Le disque, et pas le Keychain ——————————————————————————————————————————————————
 *
 * Même choix que `pending.ts` et pour la même raison : ce n'est pas un secret, c'est une note
 * que le client se laisse. `Paths.document` et non `Paths.cache` — le système vide le cache
 * quand l'appareil manque d'espace, et le journal doit précisément survivre aux moments où
 * rien ne va.
 *
 * L'échec est **avalé partout**. Un journal qu'on n'arrive pas à écrire ne doit jamais faire
 * échouer la synchronisation qu'il observe : ce serait le comble d'un module de diagnostic.
 *
 * ————— Le déménagement hors de `health/` (#143) ———————————————————————————————————————
 *
 * Ce fichier vivait dans `features/health/`. `session.ts` (`features/auth/`) a dû y écrire à
 * son tour — voir la section suivante — et faire dépendre `auth/` de `health/` pour ça
 * n'aurait eu aucun sens : ce module ne parle déjà plus seulement de santé, il porte tout ce
 * que l'app se rappelle d'elle-même. D'où `features/diagnostics/`. Le déménagement n'a rien
 * changé au-dessus : mêmes choix, mêmes raisons, seuls les imports ont bougé.
 *
 * ————— Pourquoi la session a été jetée, et par lequel des quatre points (#143) —————————
 *
 * Le back ne révoque quasiment jamais de famille de refresh tokens (zéro sur 77 jetons sur une
 * fenêtre de mesure) : quand un joueur se retrouve déconnecté, c'est le **client** qui a jeté
 * la session, depuis l'un de quatre points de `session.ts` qui appellent tous `forget()` et
 * produisent le même écran. Vu du téléphone, une déconnexion volontaire et une session perdue
 * sont indiscernables — et c'était précisément l'inconnue qui bloquait le `#142`.
 *
 * `sessionLost` porte lequel des quatre a tiré, et quand. La décision — *si* et *lequel*, y
 * compris la distinction entre un refus du refresh token et un refus du jeton d'accès sur une
 * route quelconque, qui n'accusent pas la même chose — vit dans `sessionLostReason.ts`
 * (`features/auth/`), pure et testée sous `node --test` ; ce module-ci ne fait qu'écrire ce
 * qu'on lui tend, comme pour le reste du journal.
 *
 * **Jamais le jeton, sous aucune forme** — ni entier, ni tronqué, ni haché, ni sa longueur.
 * `SessionLostReason` ne le porte pas, et rien ici ne l'ajoute : c'est la session elle-même,
 * un journal qui la garderait deviendrait ce qu'il fallait protéger. Le back n'en garde qu'un
 * SHA-256 et ne l'expose nulle part ; ce client ne fait pas moins bien en ne gardant rien du
 * tout.
 *
 * ————— Le piège tient à *quand* `state.status` vaut `'signedIn'` (#143) ————————————————
 *
 * Le piège du trousseau vide n'est pas seulement « ne pas tracer un premier lancement » : il
 * faut aussi *tracer* le cas que le `#142` doit expliquer, celui d'un utilisateur connecté
 * hier dont le jeton a disparu du trousseau entre deux ouvertures. Au tout premier appel de
 * `restore()`, `state.status` vaut encore `'restoring'` — jamais `'signedIn'`, même pour cet
 * utilisateur-là — donc l'état en mémoire du process courant ne peut pas répondre à « une
 * session existait-elle sur cet appareil ? ».
 *
 * `sessionActive` répond à ça, en persistant ce que `state.status === 'signedIn'` dirait s'il
 * survivait à la fermeture de l'app : posé à `true` par `noteSessionAdopted()` (`adopt()`,
 * `session.ts`), remis à `false` par `noteSessionForgotten()` (`forget()`,
 * inconditionnellement, qu'un abandon ait été tracé ou non). Ce reset systématique est ce qui
 * empêche une déconnexion volontaire de retracer un `missingToken` fantôme au lancement
 * suivant : le trousseau vide qu'elle laisse est le résultat attendu, pas une nouvelle perte.
 *
 * Ce n'est pas une deuxième source de vérité sur l'authentification — voir la section
 * « Ce que ce n'est pas » plus haut. Rien ne lit `sessionActive` pour décider ce que l'app
 * montre ; `missingTokenReason` (`sessionLostReason.ts`) s'en sert uniquement pour décider
 * *s'il faut écrire une ligne de diagnostic*, jamais pour l'état courant.
 */

/** Ce que la dernière synchronisation a produit — les cinq issues de `SyncResult`. */
export type JournalOutcome = 'summary' | 'nothingToSend' | 'unavailable' | 'failed' | 'budgetExceeded';

export type SyncJournal = {
  /**
   * Quand une course est entrée dans `perform()` pour la dernière fois. ISO 8601.
   *
   * Voir le docblock en tête de fichier : c'est cette ligne, comparée à `settledAt`, qui rend
   * une interruption par le chien de garde natif lisible au lieu de disparaître à l'ouverture
   * suivante.
   */
  runStartedAt: string | null;
  /** Quand un verdict est tombé pour la dernière fois, quel qu'il soit. ISO 8601. */
  settledAt: string | null;
  outcome: JournalOutcome | null;
  /** Combien de séances ont été créditées. `0` est une valeur, pas une absence. */
  imported: number | null;
  /**
   * Le refus, **tel quel** et non son message déjà rendu. Un message figé sur le disque
   * survivrait à sa propre correction ; `messageFor` le rendra à la lecture, dans la langue
   * et les mots du jour.
   */
  failure: Failure | null;
  /** Le dernier réveil HealthKit reçu. C'est *la* ligne qui répond à la question. */
  wokeAt: string | null;
  /**
   * L'inscription au réveil (`enableBackgroundDelivery`). `null` : jamais tentée.
   *
   * Elle échoue tant que HealthKit n'a rien accordé, et cet échec est **avalé** dans
   * `backgroundWakeup.ios.ts` — à raison, l'utilisateur n'a rien à en faire sur le moment.
   * Mais il doit laisser une trace lisible quelque part, et c'est ici.
   */
  registration: 'registered' | 'failed' | null;
  /**
   * La dernière fois qu'une session a été jetée, et par lequel des quatre points. `null` :
   * jamais, sur cet appareil. Voir la section du docblock ci-dessus.
   */
  sessionLost: SessionLostEntry | null;
  /**
   * Une session est-elle censée être active, d'après le dernier `adopt()`/`forget()` connu ?
   * Persisté pour que `missingTokenReason` puisse répondre à « y avait-il une session à
   * perdre ? » même au tout premier appel de `restore()`, où `state.status` (en mémoire) vaut
   * encore `'restoring'`. Voir la section du docblock ci-dessus — ce n'est pas une deuxième
   * source de vérité sur l'authentification, seulement la mémoire de ce que `session.ts` en
   * pensait à la fin du dernier process.
   */
  sessionActive: boolean;
};

/** Une session jetée, datée. Voir `SessionLostReason` (`features/auth/sessionLostReason.ts`)
 *  pour ce que `reason` peut porter — jamais le jeton, sous aucune forme. */
export type SessionLostEntry = {
  at: string;
  reason: SessionLostReason;
};

const EMPTY: SyncJournal = {
  runStartedAt: null,
  settledAt: null,
  outcome: null,
  imported: null,
  failure: null,
  wokeAt: null,
  registration: null,
  sessionLost: null,
  sessionActive: false,
};

const FILE_NAME = 'sync-journal.json';

function file(): File {
  return new File(Paths.document, FILE_NAME);
}

let journal: SyncJournal | null = null;
const listeners = new Set<() => void>();

/**
 * Lit le journal — **sans promesse**, comme `pending.ts`. Un écran de réglages n'a pas à
 * afficher un témoin de chargement pour six champs déjà sur le disque.
 */
export function getJournal(): SyncJournal {
  if (journal !== null) {
    return journal;
  }

  try {
    const handle = file();
    journal = handle.exists ? ({ ...EMPTY, ...JSON.parse(handle.textSync()) } as SyncJournal) : EMPTY;
  } catch {
    // Un fichier illisible n'est pas plus grave qu'un fichier absent : on repart de vide, et
    // la prochaine écriture le remplacera.
    journal = EMPTY;
  }

  return journal;
}

export function subscribeToJournal(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Écrit ce qui change, garde le reste. */
function record(patch: Partial<SyncJournal>): void {
  const next = { ...getJournal(), ...patch };
  journal = next;

  try {
    const handle = file();
    if (!handle.exists) {
      handle.create();
    }
    handle.write(JSON.stringify(next));
  } catch {
    // Voir le docblock : un journal qu'on n'arrive pas à écrire ne fait échouer personne.
    // La valeur en mémoire reste juste pour cette session, ce qui est déjà l'essentiel.
  }

  for (const listener of listeners) {
    listener();
  }
}

/**
 * Une course vient de commencer — appelé depuis `perform()` (`sync.ts`), et de là seulement :
 * un appel `throttled` ou qui rejoint une synchronisation déjà en vol n'entre jamais dans
 * `perform()`, et ne doit rien écrire ici. Voir le docblock en tête de fichier.
 */
export function noteRunStarted(): void {
  record({ runStartedAt: new Date().toISOString() });
}

/** Un verdict est tombé. Appelé par `sync.ts`, pour les quatre déclencheurs. */
export function noteSettled(entry: {
  outcome: JournalOutcome;
  imported: number | null;
  failure: Failure | null;
}): void {
  record({
    settledAt: new Date().toISOString(),
    outcome: entry.outcome,
    imported: entry.imported,
    failure: entry.failure,
  });
}

/** HealthKit vient de réveiller l'app. Noté **avant** l'import, pas après : le réveil a eu
 *  lieu même si ce qui suit échoue, et c'est exactement ce qu'on cherche à distinguer. */
export function noteWake(): void {
  record({ wokeAt: new Date().toISOString() });
}

/** L'inscription au réveil a été tentée. */
export function noteRegistration(registered: boolean): void {
  record({ registration: registered ? 'registered' : 'failed' });
}

/**
 * Une session vient d'être jetée — appelé par `session.ts`, aux points qui appellent
 * `forget()` et ont tranché une raison à tracer. `reason` est déjà tranché à l'appel : c'est
 * `sessionLostReason.ts` qui décide *si* et *par lequel*, ce module-ci ne fait qu'écrire. Voir
 * le docblock en tête de fichier.
 */
export function noteSessionLost(reason: SessionLostReason): void {
  record({ sessionLost: { at: new Date().toISOString(), reason } });
}

/**
 * Une session vient d'être adoptée — appelé par `adopt()` (`session.ts`), inconditionnellement.
 * Voir la section « Le piège tient à *quand* `state.status` vaut `'signedIn'` » en tête de
 * fichier : c'est ce qui permet à `missingTokenReason` de répondre juste dès le tout premier
 * `performRefresh()` d'un process, avant que `state` en mémoire n'ait eu la moindre chance de
 * valoir `'signedIn'`.
 */
export function noteSessionAdopted(): void {
  record({ sessionActive: true });
}

/**
 * Une session vient d'être oubliée — appelé par `forget()` (`session.ts`),
 * **inconditionnellement**, que `noteSessionLost` ait été appelé ou non pour ce même départ.
 * Sans ce reset systématique, une déconnexion volontaire retracerait un `missingToken`
 * fantôme au lancement suivant : le trousseau vide qu'elle laisse est le résultat attendu de
 * `signOut()`, pas une nouvelle perte à expliquer.
 */
export function noteSessionForgotten(): void {
  record({ sessionActive: false });
}
