import { failureFrom, OFFLINE, type Failure } from '../auth/problems.ts';
import type { ActionKeys } from '../shop/actionKeys.ts';

export type Confirmed<T> = { kind: 'done'; data: T } | { kind: 'refused'; failure: Failure };

/** Raid et fabrication conservent leur intention tant que le serveur n'a pas confirmé le résultat. */
export function createConfirmedAction<T>(keys: ActionKeys,
  post: (intention: string, key: string) => Promise<{ data?: T; error?: unknown }>,
  definitive: (failure: Failure) => boolean = () => false,
) {
  const pending = new Map<string, Promise<Confirmed<T>>>();
  return (intention: string): Promise<Confirmed<T>> => {
    const existing = pending.get(intention);
    if (existing) return existing;
    const promise = (async (): Promise<Confirmed<T>> => {
      try {
        const key = await keys.keyFor(intention);
        const reply = await post(intention, key);
        if (reply.data !== undefined) {
          await keys.forget(intention);
          return { kind: 'done', data: reply.data };
        }
        const failure = failureFrom(reply.error);
        if (definitive(failure)) await keys.forget(intention);
        return { kind: 'refused', failure };
      } catch {
        return { kind: 'refused', failure: OFFLINE };
      }
    })().finally(() => pending.delete(intention));
    pending.set(intention, promise);
    return promise;
  };
}
