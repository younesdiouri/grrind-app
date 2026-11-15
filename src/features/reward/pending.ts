import { File, Paths } from 'expo-file-system';

import { getSessionOwner, isCurrentOwner, subscribe as subscribeToSession, type SessionOwner } from '@/features/auth/session';
import {
  dequeuePending,
  enqueuePending as enqueue,
  parsePendingQueue,
} from '@/features/reward/pendingQueue';
import type { SyncSummary } from '@/features/reward/timeline';

/**
 * La progression **non jouée**, et pourquoi elle vit sur le disque.
 *
 * ————— « Importée » et « vue » ne sont pas le même état ——————————————————————————————
 *
 * L'import est un état du **serveur** : la séance est en base, l'XP est créditée. Avoir joué
 * l'animation est un état du **client**, et rien côté serveur ne le connaît ni ne peut le
 * connaître.
 *
 * Les confondre coûte exactement un scénario, et il n'est pas rare : l'import réussit, l'app
 * est tuée avant que l'animation ait été jouée — retour au bureau, appel entrant, iOS qui
 * récupère de la mémoire. À l'ouverture suivante, la synchronisation retrouve la séance en
 * `ALREADY_IMPORTED`, `imported` est vide, et **le joueur ne verra jamais sa progression**.
 * L'XP est juste, la mise en scène est perdue — précisément le dommage que la clé
 * d'idempotence existe pour éviter, mais qu'elle ne couvre que jusqu'à la réponse HTTP.
 *
 * D'où ce magasin : le résumé survit à la mort de l'app et n'est effacé **qu'une fois joué**.
 *
 * ————— Une file, pas une valeur ————————————————————————————————————————————————————
 *
 * Le réveil HealthKit (#55) écrit ici comme les autres déclencheurs, mais lui n'a personne
 * pour regarder l'écran : plusieurs réveils peuvent tomber entre deux ouvertures de l'app,
 * chacun avec son `SyncSummary`. Écraser le premier par le second effacerait une progression
 * pourtant créditée — l'XP resterait juste, la mise en scène disparaîtrait. `pending.ts` porte
 * donc une **file**, jouée dans l'ordre d'arrivée, chaque résumé effacé à la fin de sa propre
 * animation. Elle ne fusionne jamais deux résumés : voir `pendingQueue.ts`, où vit toute la
 * logique de la file, pure et prouvée sous `node --test`. Ce fichier ne fait que la brancher
 * sur le disque.
 *
 * ————— Pourquoi un fichier et pas le trousseau ————————————————————————————————————————
 *
 * Les gros corps peuvent être refusés par `expo-secure-store` (historiquement dès environ
 * 2048 octets sur iOS). Un lot de quinze séances pèse 11 Ko, et le contrat en autorise deux
 * cents — et la file peut en porter plusieurs. Comme l'intention d'import, le reçu reste
 * dans les documents privés de l'app ; les jetons restent au Keychain.
 *
 * ————— La lecture est synchrone, et c'est le point ————————————————————————————————————
 *
 * `textSync()` lit le disque **sans promesse**. Une progression en attente est donc connue
 * avant la première image, sans réseau et sans attente : c'est ce qui permet à l'animation
 * d'être le premier écran plutôt que d'arriver par-dessus l'accueil une seconde plus tard.
 * Le réseau ne sert qu'à en découvrir de nouvelles.
 */

/**
 * Un fichier par compte, conservé à la déconnexion ; la génération reste en mémoire.
 * `pending-reward.json` (résumé seul OU tableau sans owner) reste intact, en quarantaine :
 * aucun champ de ces formats ne prouve le propriétaire. Ne jamais l'attribuer au prochain
 * compte connecté. Sa récupération attend une preuve d'appartenance ; aucun gain n'est recalculé.
 */
function file(ownerId: string): File {
  // `Paths.document` et non `Paths.cache` : le système vide le cache quand l'appareil manque
  // d'espace, et perdre l'animation d'un joueur pour récupérer onze kilo-octets serait un
  // mauvais marché.
  return new File(Paths.document, `pending-reward-${encodeURIComponent(ownerId)}.json`);
}

type PendingState = { queue: SyncSummary[]; importKey: string | null };
const queues = new Map<string, PendingState>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Le fichier précédent protège les reçus si le processus s'arrête pendant le remplacement.
 * File.write n'est pas atomique dans SDK57 : on écrit d'abord un nouveau fichier complet.
 */
function persist(ownerId: string, state: PendingState): void {
  const target = file(ownerId);
  const previous = new File(`${target.uri}.previous`);
  const next = new File(`${target.uri}.next`);
  if (state.queue.length === 0 && state.importKey === null) {
    if (previous.exists) previous.delete();
    if (target.exists) target.delete();
    return;
  }
  next.write(JSON.stringify(state));
  if (target.exists) {
    if (previous.exists) previous.delete();
    target.move(previous);
  }
  next.move(file(ownerId));
  try { if (previous.exists) previous.delete(); } catch { /* Le nouveau reçu est déjà durable. */ }
}

/** Ne jamais effacer un reçu illisible : l'import doit garder son intention dans ce cas. */
function loadState(ownerId: string): PendingState {
  const cached = queues.get(ownerId);
  if (cached !== undefined) return cached;
  let handle = file(ownerId);
  if (!handle.exists) handle = new File(`${handle.uri}.previous`);
  let state: PendingState = { queue: [], importKey: null };
  if (handle.exists) {
    const parsed: unknown = JSON.parse(handle.textSync());
    if (typeof parsed === 'object' && parsed !== null && 'queue' in parsed) {
      const stored = parsed as PendingState;
      if (!Array.isArray(stored.queue) ||
          (stored.importKey !== null && typeof stored.importKey !== 'string')) {
        throw new Error('Reçu d’import illisible');
      }
      state = { queue: parsePendingQueue(stored.queue), importKey: stored.importKey };
      if (state.queue.length !== stored.queue.length) throw new Error('File de reçus illisible');
    } else {
      // Formats antérieurs PAR COMPTE seulement ; le legacy global reste en quarantaine.
      const queue = parsePendingQueue(parsed);
      if (queue.length === 0 && !(Array.isArray(parsed) && parsed.length === 0)) {
        throw new Error('File de reçus illisible');
      }
      state = { queue, importKey: null };
    }
  }
  queues.set(ownerId, state);
  return state;
}

/** La progression en tête de file — celle qui doit se jouer maintenant, ou rien. */
export function getPending(owner: SessionOwner | null = getSessionOwner()): SyncSummary | null {
  if (!isCurrentOwner(owner)) return null;
  try { return loadState(owner.id).queue[0] ?? null; } catch { return null; }
}

export function subscribeToPending(listener: () => void): () => void {
  listeners.add(listener);
  const unsubscribeSession = subscribeToSession(listener);
  return () => {
    listeners.delete(listener);
    unsubscribeSession();
  };
}

/**
 * Les progressions que le joueur a **demandées**, par identité d'objet.
 *
 * ————— Ce que ça sert à distinguer (#97) ——————————————————————————————————————————————
 *
 * `usePendingReward` refuse d'ouvrir l'écran quand le joueur a touché l'écran, et cette garde
 * a raison : une progression qui arrive d'un réveil en arrière-plan ne doit pas s'ouvrir
 * par-dessus quelqu'un en train de lire. Mais elle ne distinguait pas **d'où** la progression
 * venait. Quelqu'un qui vient de taper « Synchroniser maintenant » — ou de tirer pour
 * rafraîchir — a demandé exactement ça, et le lui refuser au motif qu'il a touché l'écran pour
 * le demander est un contresens.
 *
 * ————— En mémoire, et jamais sur le disque ————————————————————————————————————————————
 *
 * Une `WeakMap` et pas un champ persisté, et c'est la bonne durée de vie : « sollicité »
 * qualifie un geste **de cette session**. Rejoué au lancement suivant, il serait faux — le
 * joueur qui rouvre son app n'a rien demandé, et de toute façon `hasInteracted()` est faux sur
 * un processus neuf, donc la progression s'y joue déjà sans passe-droit.
 *
 * La génération empêche de réutiliser le geste après reconnexion. Les clés faibles ne
 * retiennent pas un résumé de quinze séances en mémoire après qu'il a été joué.
 */
const solicited = new WeakMap<SyncSummary, SessionOwner>();

/**
 * La clé du dernier import suffit : une seule intention existe par compte, libérée après
 * cette écriture. Elle reste après ACK pour dédoublonner un nettoyage d'intention refusé.
 * `asked` conserve le geste dans sa génération ; aucune fusion ni calcul de récompense.
 */
export function enqueuePending(summary: SyncSummary, owner: SessionOwner, asked = false, importKey?: string): void {
  if (!isCurrentOwner(owner)) return;
  const current = loadState(owner.id);
  if (importKey !== undefined && current.importKey === importKey) {
    const queued = current.queue.at(-1);
    if (asked && summary.imported.length > 0 && queued) {
      solicited.set(queued, owner);
      notify();
    }
    return;
  }
  const state = {
    queue: importKey !== undefined && summary.imported.length === 0 ? current.queue : enqueue(current.queue, summary),
    importKey: importKey ?? current.importKey,
  };
  persist(owner.id, state);
  queues.set(owner.id, state);
  if (asked && summary.imported.length > 0) solicited.set(summary, owner);
  notify();
}

/**
 * Le joueur a-t-il demandé cette progression, dans cette session ?
 *
 * Faux pour tout ce qui est relu du disque — ce qui est correct : un résumé retrouvé au
 * lancement n'a pas été sollicité, il attendait.
 */
export function wasSolicited(summary: SyncSummary): boolean {
  return isCurrentOwner(solicited.get(summary) ?? null);
}

/**
 * La progression en tête de file a été jouée. C'est le **seul** moment où elle s'efface, et
 * elle seule — jamais celles qui la suivent.
 *
 * Pas à l'ouverture de l'écran : une app tuée pendant l'animation n'a rien montré, et le
 * joueur doit la retrouver au lancement suivant.
 */
export function markPlayed(summary: SyncSummary, owner: SessionOwner | null): boolean {
  if (!isCurrentOwner(owner)) return false;
  const current = loadState(owner.id);
  if (current.queue[0] !== summary) return false;

  const state = { ...current, queue: dequeuePending(current.queue) };
  try { persist(owner.id, state); } catch { return false; }
  queues.set(owner.id, state);
  notify();
  return true;
}
