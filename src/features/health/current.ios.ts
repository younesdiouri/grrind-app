import { appleHealthProvider } from '@/features/health/appleHealth';
import { isE2eBuild } from '@/features/health/e2e';
import { mockHealthProvider } from '@/features/health/mockHealth';
import type { HealthProvider } from '@/features/health/provider';

/**
 * Sur iPhone, la santé c'est HealthKit — sauf dans le bundle du harnais E2E, qui tourne sur un
 * Simulator où il n'y a ni montre, ni séance, ni feuille d'autorisation.
 *
 * Le branchement ne coûte rien au chemin de production : `isE2eBuild` est une constante de
 * *bundling* (voir `e2e.ts`), donc dans toute app qui n'a pas été construite par
 * `scripts/e2e-ios.sh`, cette expression est déjà résolue et le bouchon n'est pas embarqué.
 */
export const healthProvider: HealthProvider = isE2eBuild
  ? mockHealthProvider
  : appleHealthProvider;
