import { useSyncExternalStore } from 'react';

import { getState, getSessionOwner, subscribe, type AuthState } from '@/features/auth/session';

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

/** Capture l'owner au rendu pour les callbacks qui peuvent survivre à leur écran. */
export function useSessionOwner() {
  const auth = useAuth();
  return auth.status === 'signedIn' ? getSessionOwner() : null;
}
