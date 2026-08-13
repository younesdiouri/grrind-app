import { File, Paths } from 'expo-file-system';

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
 * ————— Pourquoi un fichier et pas le trousseau ————————————————————————————————————————
 *
 * `expo-secure-store` porte déjà la clé d'idempotence et le jeton de rafraîchissement, mais sa
 * limite est de 2048 octets. Un lot de quinze séances pèse 11 Ko, et le contrat en autorise
 * deux cents. Ce n'est pas non plus un secret : c'est une note que le client se laisse.
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

let pending: SyncSummary | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Relit le disque, sans lui faire confiance.
 *
 * Une version précédente de l'app a pu écrire une autre forme, et un fichier tronqué reste
 * possible si l'écriture a été interrompue. Dans le doute on rend `null` et on efface : une
 * animation manquée est un incident mineur, un écran qui plante à l'ouverture ne l'est pas.
 *
 * Idempotent : les appels suivants rendent le cache mémoire. C'est ce qui autorise à
 * l'appeler depuis un rendu.
 */
export function loadPending(): SyncSummary | null {
  if (loaded) {
    return pending;
  }

  loaded = true;

  try {
    const handle = file();
    if (!handle.exists) {
      return null;
    }

    const parsed: unknown = JSON.parse(handle.textSync());

    // Le strict minimum pour que `buildTimeline` tienne debout. On ne revalide pas tout le
    // contrat : ce fichier vient de nous, pas du réseau.
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as SyncSummary).imported) ||
      !Array.isArray((parsed as SyncSummary).skipped)
    ) {
      handle.delete();
      return null;
    }

    pending = parsed as SyncSummary;
  } catch {
    forget();
  }

  return pending;
}

export function getPending(): SyncSummary | null {
  return loadPending();
}

export function subscribeToPending(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Met une progression en attente d'être jouée.
 *
 * L'écriture échouant — disque plein, permissions — ne doit rien casser : le résumé reste en
 * mémoire et sera joué normalement dans cette session. On perd seulement la garantie qu'il
 * survive à la mort de l'app, ce qui est exactement ce qu'on avait avant ce module.
 */
export function setPending(summary: SyncSummary): void {
  pending = summary;
  loaded = true;

  try {
    const handle = file();
    if (!handle.exists) {
      handle.create();
    }
    handle.write(JSON.stringify(summary));
  } catch {
    // Voir plus haut : dégradation, pas panne.
  }

  notify();
}

/**
 * La progression a été jouée. C'est le **seul** moment où elle s'efface.
 *
 * Pas à l'ouverture de l'écran : une app tuée pendant l'animation n'a rien montré, et le
 * joueur doit la retrouver au lancement suivant.
 */
export function markPlayed(): void {
  if (pending === null && loaded) {
    return;
  }

  pending = null;
  loaded = true;
  forget();
  notify();
}

function forget(): void {
  pending = null;

  try {
    const handle = file();
    if (handle.exists) {
      handle.delete();
    }
  } catch {
    // Rien à faire : au pire le fichier reste et la prochaine lecture le rejettera.
  }
}
