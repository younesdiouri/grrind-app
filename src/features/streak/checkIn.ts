import { AppState } from 'react-native';

import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { noteProgressionStale } from '@/features/progression/weeklyRefresh';
import type { DroppedItem } from '@/features/reward/timeline';

export type StreakState = components['schemas']['StreakState'];

/**
 * Le pointage du jour (#360). Le streak compte les **ouvertures** de l'app, et le palier du
 * coffre les jours de sport : le pointage part donc **après** la synchronisation santé, sinon
 * une séance du dimanche synchronisée au premier pointage du lundi arrive trop tard pour le
 * coffre de la semaine.
 *
 * Seulement au premier plan : un réveil HealthKit en fond monte l'app sans que le joueur l'ait
 * ouverte, et ce n'est pas un jour d'assiduité.
 *
 * L'état rendu sert l'accueil sans relecture — sinon la course entre le rechargement qui suit
 * la synchro et ce pointage afficherait la veille. Le coffre attend la modale qui le révèle.
 */
let state: { streak: StreakState | null; chest: DroppedItem | null } = { streak: null, chest: null };
const listeners = new Set<() => void>();

function publish(next: typeof state): void {
  state = next;
  for (const listener of listeners) listener();
}

export const streakStore = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  dismissChest: () => publish({ ...state, chest: null }),
  /** À la déconnexion : ni la série ni le coffre d'un autre compte. */
  reset: () => publish({ streak: null, chest: null }),
};

/** Idempotent côté serveur ; ne jette jamais — l'accueil retombe sur `GET /api/streak`. */
export async function checkIn(): Promise<void> {
  if (AppState.currentState !== 'active') return;
  try {
    const { data } = await api.POST('/api/streak/check-in');
    if (data === undefined) return;
    // ponytail: coffre gardé en mémoire seulement ; tué avant la modale, il reste à l'inventaire sans mise en scène.
    publish({ streak: data.streak, chest: data.chest ?? state.chest });
    if (data.chest !== null) noteProgressionStale();
  } catch {
    // Meilleur effort : le prochain passage au premier plan repointe.
  }
}
