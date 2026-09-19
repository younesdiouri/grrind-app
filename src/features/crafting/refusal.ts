import type { Failure } from '@/features/auth/problems';

/** Ces refus prouvent qu'aucun ingrédient n'a été consommé ; une nouvelle tentative pourra évoluer. */
export function craftingWasRefused(failure: Failure): boolean {
  return failure.kind === 'problem' && (failure.problem.type === 'https://grrind.app/problems/recipe-unavailable'
    || failure.problem.type === 'https://grrind.app/problems/insufficient-crafting-resources');
}
