import { getSettledRevision, subscribeToSync } from '@/features/health/sync';
import { createLaunchGate, LAUNCH_WAIT_MS } from '@/features/reward/launchGate';
import { loadPending } from '@/features/reward/pending';

/**
 * Le portillon de lancement, branché sur le vrai disque et la vraie synchronisation.
 *
 * Singleton de module, comme la session et le coordinateur de synchronisation : il n'y a
 * qu'un lancement, et deux instances chacune avec son propre « déjà démarré » retireraient
 * l'écran de démarrage deux fois.
 *
 * Toute la décision vit dans `launchGate.ts`, qui n'importe rien et se prouve sous
 * `node --test`. Ce fichier ne fait que fournir l'heure, le disque et le réseau.
 */
const gate = createLaunchGate({
  hasPending: () => loadPending() !== null,
  settledRevision: getSettledRevision,
  subscribeToSync,
  timeoutMs: LAUNCH_WAIT_MS,
  setTimer: (run, ms) => setTimeout(run, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
});

export const beginLaunch = gate.begin;
export const isLaunchSettled = gate.isSettled;
export const subscribeToLaunch = gate.subscribe;
