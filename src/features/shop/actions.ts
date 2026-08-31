import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';

import { shopActionKeys } from './actionKeyStore.ts';
import { chestOpenIntention, forgetsKeyAfter, purchaseIntention } from './keyPolicy.ts';

export type PurchaseOutcome =
  | { kind: 'purchased'; purchase: components['schemas']['Purchase'] }
  | { kind: 'refused'; failure: Failure };

export type ChestOpenOutcome =
  | { kind: 'opened'; chest: components['schemas']['ChestOpen'] }
  | { kind: 'refused'; failure: Failure };

/** Achète un objet sans jamais refaire une action dont la réponse a pu se perdre. */
export async function purchaseItem(itemKey: string): Promise<PurchaseOutcome> {
  const intention = purchaseIntention(itemKey);
  const key = await shopActionKeys.keyFor(intention);
  const reply = await api
    .POST('/api/shop/purchases', {
      params: { header: { 'Idempotency-Key': key } },
      body: { itemKey },
    })
    .catch(() => null);

  if (reply === null) {
    return { kind: 'refused', failure: OFFLINE };
  }

  if (reply.data !== undefined) {
    await shopActionKeys.forget(intention);
    return { kind: 'purchased', purchase: reply.data };
  }

  const failure = failureFrom(reply.error);
  if (forgetsKeyAfter(failure)) {
    await shopActionKeys.forget(intention);
  }

  return { kind: 'refused', failure };
}

/** Ouvre une pile de coffres ; le contenu n'existe côté écran qu'après ce POST. */
export async function openChest(itemKey: string): Promise<ChestOpenOutcome> {
  const intention = chestOpenIntention(itemKey);
  const key = await shopActionKeys.keyFor(intention);
  const reply = await api
    .POST('/api/inventory/chests/{key}/open', {
      params: { path: { key: itemKey }, header: { 'Idempotency-Key': key } },
    })
    .catch(() => null);

  if (reply === null) {
    return { kind: 'refused', failure: OFFLINE };
  }

  if (reply.data !== undefined) {
    await shopActionKeys.forget(intention);
    return { kind: 'opened', chest: reply.data };
  }

  const failure = failureFrom(reply.error);
  if (forgetsKeyAfter(failure)) {
    await shopActionKeys.forget(intention);
  }

  return { kind: 'refused', failure };
}
