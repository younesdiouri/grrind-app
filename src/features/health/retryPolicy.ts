import type { SyncTrigger } from '@/features/health/syncCoordinator';

/**
 * Combien de fois rejouer un import raté, selon ce qui a demandé la synchronisation.
 *
 * Le budget n'est pas le même partout. Le bouton, l'ouverture de l'app et le retour au premier
 * plan rejouent trois fois (`FOREGROUND_DELAYS`, voir `replay.ts` pour ce que « rejouer » veut
 * dire) parce qu'un joueur regarde l'écran et peut attendre quelques secondes de plus pour ne
 * pas perdre son animation.
 *
 * Le réveil HealthKit n'a personne pour regarder, et le budget d'exécution est compté avant
 * même que le natif ne coupe la parole — voir le chien de garde de 25 secondes dans
 * `GrrindHealthModule.swift`. Une requête, et on rend la main : un échec ne s'y rattrape pas
 * sur place, le prochain réveil ou la prochaine ouverture repartira avec la **même** clé
 * d'idempotence, puisque rien n'aura bougé côté serveur.
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
