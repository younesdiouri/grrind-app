import { useSyncExternalStore } from 'react';

import { getState, subscribe, type AuthState } from '@/features/auth/session';

/**
 * L'état d'authentification, vu de React.
 *
 * `useSyncExternalStore` plutôt qu'un contexte : la session vit déjà hors de l'arbre — le
 * middleware HTTP en dépend — et la dupliquer dans un `useState` créerait deux vérités à
 * garder d'accord. Ici il n'y en a qu'une, React s'y abonne.
 */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getState);
}
