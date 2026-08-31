import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';

import type { ActionKeys } from './actionKeys.ts';
import { chestOpenIntention, forgetsKeyAfter, purchaseIntention } from './keyPolicy.ts';

export type PurchaseOutcome =
  | { kind: 'purchased'; purchase: components['schemas']['Purchase'] }
  | { kind: 'refused'; failure: Failure };

export type ChestOpenOutcome =
  | { kind: 'opened'; chest: components['schemas']['ChestOpen'] }
  | { kind: 'refused'; failure: Failure };

type PurchaseRequest = { itemKey: string; params: { header: { 'Idempotency-Key': string } } };
type ChestOpenRequest = {
  itemKey: string;
  params: { path: { key: string }; header: { 'Idempotency-Key': string } };
};

export type ShopActionRequests = {
  purchase: (request: PurchaseRequest) => Promise<{ data?: components['schemas']['Purchase']; error?: unknown }>;
  openChest: (request: ChestOpenRequest) => Promise<{ data?: components['schemas']['ChestOpen']; error?: unknown }>;
};

export type ShopActionsDeps = { keys: ActionKeys; requests: ShopActionRequests };

/** Les deux actions posent la clé avant le POST et la gardent tant qu'un verdict reste incertain. */
export function createShopActions({ keys, requests }: ShopActionsDeps) {
  async function purchaseItem(itemKey: string): Promise<PurchaseOutcome> {
    const intention = purchaseIntention(itemKey);
    const key = await keys.keyFor(intention);
    const reply = await requests
      .purchase({ itemKey, params: { header: { 'Idempotency-Key': key } } })
      .catch(() => null);

    if (reply === null) return { kind: 'refused', failure: OFFLINE };
    if (reply.data !== undefined) {
      await keys.forget(intention);
      return { kind: 'purchased', purchase: reply.data };
    }

    const failure = failureFrom(reply.error);
    if (forgetsKeyAfter(failure)) await keys.forget(intention);
    return { kind: 'refused', failure };
  }

  async function openChest(itemKey: string): Promise<ChestOpenOutcome> {
    const intention = chestOpenIntention(itemKey);
    const key = await keys.keyFor(intention);
    const reply = await requests
      .openChest({ itemKey, params: { path: { key: itemKey }, header: { 'Idempotency-Key': key } } })
      .catch(() => null);

    if (reply === null) return { kind: 'refused', failure: OFFLINE };
    if (reply.data !== undefined) {
      await keys.forget(intention);
      return { kind: 'opened', chest: reply.data };
    }

    const failure = failureFrom(reply.error);
    if (forgetsKeyAfter(failure)) await keys.forget(intention);
    return { kind: 'refused', failure };
  }

  return { purchaseItem, openChest };
}
