import { File, Paths } from 'expo-file-system';

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
 * `expo-secure-store` porte déjà la clé d'idempotence et le jeton de rafraîchissement, mais sa
 * limite est de 2048 octets. Un lot de quinze séances pèse 11 Ko, et le contrat en autorise
 * deux cents — et la file peut en porter plusieurs. Ce n'est pas non plus un secret : c'est une
 * note que le client se laisse.
 *
 * ————— La lecture est synchrone, et c'est le point ————————————————————————————————————
 *
 * `textSync()` lit le disque **sans promesse**. Une progression en attente est donc connue
 * avant la première image, sans réseau et sans attente : c'est ce qui permet à l'animation
 * d'être le premier écran plutôt que d'arriver par-dessus l'accueil une seconde plus tard.
 * Le réseau ne sert qu'à en découvrir de nouvelles.
 */

const FILE_NAME = 'pending-reward.json';

function file(): File {
  // `Paths.document` et non `Paths.cache` : le système vide le cache quand l'appareil manque
  // d'espace, et perdre l'animation d'un joueur pour récupérer onze kilo-octets serait un
  // mauvais marché.
  return new File(Paths.document, FILE_NAME);
}

let queue: SyncSummary[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Écrit la file entière sur le disque. Une file vide efface le fichier plutôt que d'y laisser
 * un tableau vide : rien à relire ne doit pas dépendre d'un parseur.
 */
function persist(): void {
  try {
    const handle = file();

    if (queue.length === 0) {
      if (handle.exists) {
        handle.delete();
      }
      return;
    }

    if (!handle.exists) {
      handle.create();
    }
    handle.write(JSON.stringify(queue));
  } catch {
    // Dégradation, pas panne : voir `enqueuePending` plus bas.
  }
}

/**
 * Relit le disque, sans lui faire confiance.
 *
 * Idempotent : les appels suivants rendent le cache mémoire. C'est ce qui autorise à
 * l'appeler depuis un rendu.
 */
function loadQueue(): SyncSummary[] {
  if (loaded) {
    return queue;
  }

  loaded = true;

  try {
    const handle = file();
    if (!handle.exists) {
      return queue;
    }

    const parsed: unknown = JSON.parse(handle.textSync());
    queue = parsePendingQueue(parsed);

    if (queue.length === 0) {
      // La forme n'a pas été reconnue : rien à garder, et rien à relire non plus la
      // prochaine fois.
      handle.delete();
    }
  } catch {
    queue = [];
    try {
      const handle = file();
      if (handle.exists) {
        handle.delete();
      }
    } catch {
      // Rien à faire : au pire le fichier reste et la prochaine lecture le rejettera.
    }
  }

  return queue;
}

/** La progression en tête de file — celle qui doit se jouer maintenant, ou rien. */
export function getPending(): SyncSummary | null {
  const current = loadQueue();
  return current.length > 0 ? current[0] : null;
}

export function subscribeToPending(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Ajoute une progression en fin de file. **Aucune fusion** : voir `pendingQueue.ts`.
 *
 * L'écriture échouant — disque plein, permissions — ne doit rien casser : le résumé reste en
 * mémoire et sera joué normalement dans cette session. On perd seulement la garantie qu'il
 * survive à la mort de l'app, ce qui est exactement ce qu'on avait avant ce module.
 */
export function enqueuePending(summary: SyncSummary): void {
  queue = enqueue(loadQueue(), summary);
  loaded = true;
  persist();
  notify();
}

/**
 * La progression en tête de file a été jouée. C'est le **seul** moment où elle s'efface, et
 * elle seule — jamais celles qui la suivent.
 *
 * Pas à l'ouverture de l'écran : une app tuée pendant l'animation n'a rien montré, et le
 * joueur doit la retrouver au lancement suivant.
 */
export function markPlayed(): void {
  const current = loadQueue();
  if (current.length === 0) {
    return;
  }

  queue = dequeuePending(current);
  persist();
  notify();
}
