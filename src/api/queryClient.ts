import { QueryClient } from '@tanstack/react-query';

/**
 * Le client React Query — un seul pour tout le process, comme `api` dans `client.ts` et pour
 * la même raison : recréé à chaque montage d'écran, il perdrait son cache exactement quand on
 * en a besoin, par exemple en revenant sur l'onglet Guilde après l'avoir quitté.
 */
export const queryClient = new QueryClient();
