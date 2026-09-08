import type { paths } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import { forgetsKeyAfter } from '@/features/shop/keyPolicy';

type SaleOperation = paths['/api/inventory/sales']['post'];
export type SaleInput = SaleOperation['requestBody']['content']['application/json'];
export type Sale = SaleOperation['responses'][200]['content']['application/json'];
export type PendingSale = { body: SaleInput; key: string };
export type SaleOutcome =
  | { kind: 'sold'; sale: Sale }
  | { kind: 'refused'; failure: Failure };

type SaleStore = {
  read: () => Promise<PendingSale | null>;
  write: (pending: PendingSale | null) => Promise<void>;
  mint: () => string;
};

/**
 * Une vente incertaine se résout avant la suivante, même après un redémarrage. Persister
 * seulement l’UUID perdrait le prix confirmé si le catalogue change entre deux tentatives.
 * Le corps et sa clé sont donc conservés ensemble jusqu’au verdict certain du serveur.
 */
export function createSaleAction({ store, request }: {
  store: SaleStore;
  request: (request: { body: SaleInput; params: { header: { 'Idempotency-Key': string } } }) =>
    Promise<{ data?: Sale; error?: unknown }>;
}) {
  let inFlight: Promise<SaleOutcome> | null = null;

  async function run(body: SaleInput): Promise<SaleOutcome> {
    try {
      const pending = await store.read() ?? { body, key: store.mint() };
      await store.write(pending);
      const reply = await request({ body: pending.body, params: { header: { 'Idempotency-Key': pending.key } } });
      if (reply.data !== undefined) {
        await store.write(null);
        return { kind: 'sold', sale: reply.data };
      }
      const failure = failureFrom(reply.error);
      if (forgetsKeyAfter(failure)) await store.write(null);
      return { kind: 'refused', failure };
    } catch {
      return { kind: 'refused', failure: OFFLINE };
    }
  }

  return {
    pending: () => store.read(),
    sell: (body: SaleInput): Promise<SaleOutcome> => {
      inFlight ??= run(body).finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
