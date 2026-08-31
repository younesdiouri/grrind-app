import type { Failure, ProblemType } from '@/features/auth/problems';

/** Une action est son verbe et sa clé catalogue : jamais seulement la clé. */
export function purchaseIntention(itemKey: string): string {
  return `purchase:${itemKey}`;
}

/** Un coffre de même clé peut être acheté puis ouvert : ce ne sont pas le même geste. */
export function chestOpenIntention(itemKey: string): string {
  return `chest-open:${itemKey}`;
}

/** Les refus nommés qui prouvent qu'aucun débit ou ouverture n'a été écrit. */
const PROVES_NOTHING_WRITTEN: ReadonlySet<ProblemType> = new Set<ProblemType>([
  'https://grrind.app/problems/insufficient-coin-balance',
  'https://grrind.app/problems/item-not-purchasable',
  'https://grrind.app/problems/item-already-owned',
  'https://grrind.app/problems/shop-level-too-low',
  'https://grrind.app/problems/item-not-owned',
  'https://grrind.app/problems/item-not-a-chest',
]);

/** Garde la clé sur tout doute : un nouveau UUID pourrait rejouer une action déjà écrite. */
export function forgetsKeyAfter(failure: Failure): boolean {
  return failure.kind === 'problem' && PROVES_NOTHING_WRITTEN.has(failure.problem.type);
}
