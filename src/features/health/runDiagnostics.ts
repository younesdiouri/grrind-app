import type { SyncJournal } from '@/features/diagnostics/journal';

/**
 * Ce que `journal.ts` laisse deviner sur le sort de la dernière course, sans y toucher.
 *
 * Fichier séparé de `journal.ts`, et pour la même raison qu'`anchorPolicy.ts` est séparé de
 * `sync.ts` : `journal.ts` importe `expo-file-system` **en valeur**, et rien de ce qui
 * l'importe en valeur ne se charge sous `node --test` — le paquet embarque du TypeScript non
 * transpilé sous `node_modules`, que Node refuse de décoder lui-même. `SyncJournal` n'est
 * repris ici qu'en **type**, erasé à la compilation, pour que ces deux décisions se prouvent
 * sans jamais évaluer le module qui touche au disque.
 *
 * Les deux fonctions lisent la même paire de champs — `runStartedAt`, posé à l'entrée de
 * `perform()`, et `settledAt`, posé à sa sortie — et répondent à deux questions liées mais
 * distinctes : la course a-t-elle seulement fini (`hasOrphanedRun`), et si oui, combien de
 * temps a-t-elle pris (`runDurationSeconds`) ? Aucun champ de plus sur le disque : la seconde
 * question se calcule à la lecture, elle ne se stocke pas.
 */

/**
 * Une course est-elle entrée dans `perform()` sans qu'aucun verdict ne soit tombé derrière
 * elle ?
 *
 * Deux causes se rangent derrière une course sans verdict, et cette fonction ne les distingue
 * pas — ce n'est pas de son ressort. Voir `Synchronisation()` (`reglages.tsx`), le seul
 * appelant : c'est lui qui sait, par `useSyncStatus`, si une synchronisation tourne **dans ce
 * process précis** — auquel cas elle sortira par `noteSettled()` d'un instant à l'autre — et
 * peut donc écarter ce cas-là avant de conclure à une interruption. Une fois ce premier cas
 * écarté par l'appelant, il ne reste que le second : la course a été coupée par le chien de
 * garde natif, sans que rien n'ait pu s'écrire au moment où c'est arrivé (#140, voir le
 * docblock en tête de `journal.ts`) — `runStartedAt` postérieur à `settledAt` ne peut plus
 * vouloir dire que ça.
 */
export function hasOrphanedRun(journal: SyncJournal): boolean {
  if (journal.runStartedAt === null) {
    return false;
  }

  if (journal.settledAt === null) {
    return true;
  }

  return new Date(journal.runStartedAt).getTime() > new Date(journal.settledAt).getTime();
}

/**
 * Combien de temps la dernière course a duré, en secondes — `null` quand la question n'a pas
 * de réponse.
 *
 * Elle n'en a pas dans deux cas, et ils se confondent volontairement ici : pas de course
 * jamais entrée, ou une course entrée sans verdict derrière elle (`hasOrphanedRun`). Dans ce
 * second cas on sait qu'elle a duré *au moins* jusqu'au couperet natif, jamais *combien* — le
 * chien de garde ne laisse rien à lire au moment où il coupe — et rendre un chiffre inventerait
 * une précision qu'on n'a pas.
 *
 * C'est cette mesure qui manquait depuis le début du développement du réveil (#140, complément
 * du 2026-08-31) : sans elle, « interrompue » ne dit pas si le budget de douze secondes est
 * trop court ou si c'est le reste — bootstrap, refresh, lecture HealthKit — qui déborde avant
 * même de l'atteindre.
 */
export function runDurationSeconds(journal: SyncJournal): number | null {
  if (journal.runStartedAt === null || journal.settledAt === null) {
    return null;
  }

  const startedAt = new Date(journal.runStartedAt).getTime();
  const settledAt = new Date(journal.settledAt).getTime();

  if (settledAt < startedAt) {
    // Le verdict le plus récent est antérieur à l'entrée la plus récente : ce n'est pas celui
    // de cette course-ci, voir `hasOrphanedRun`.
    return null;
  }

  return (settledAt - startedAt) / 1000;
}

/**
 * La durée d'une course, en mots — « 1,3 s », « 12 s ».
 *
 * Une seconde décimale sous dix secondes : c'est l'échelle à laquelle une course en
 * arrière-plan se joue, et où la différence entre « réglée en 1,3 s » et « réglée en 4,8 s »
 * dit quelque chose. Au-delà, la seconde entière suffit — personne ne distingue 11,4 s de
 * 11,6 s à l'oeil, et le budget lui-même (`runBudgetMsFor`, `retryPolicy.ts`) est un compte
 * rond.
 */
export function formatRunDuration(seconds: number): string {
  return seconds < 10 ? `${seconds.toFixed(1).replace('.', ',')} s` : `${Math.round(seconds)} s`;
}
