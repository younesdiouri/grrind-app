import type { components } from '@/api/schema';

export type TogetherBonus = components['schemas']['TogetherBonus'];
type Page = components['schemas']['TogetherBonusPage'];
type Snapshot = { owner: string | null; bonuses: TogetherBonus[]; solicited: boolean; failed: boolean; presentedId: string | null };

export function createTogetherInbox(deps: {
  readCursor(owner: string): Promise<string | null>;
  writeCursor(owner: string, id: string): Promise<void>;
  fetchPage(after: string | null): Promise<Page>;
}) {
  let state: Snapshot = { owner: null, bonuses: [], solicited: false, failed: false, presentedId: null };
  let generation = 0;
  let loading: Promise<void> | null = null;
  let acknowledging: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: Snapshot) => { state = next; for (const listener of listeners) listener(); };
  const bind = (owner: string | null) => {
    if (state.owner === owner) return;
    generation += 1;
    loading = null;
    acknowledging = null;
    publish({ owner, bonuses: [], solicited: false, failed: false, presentedId: null });
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    bind,
    markPresented(owner: string, id: string) {
      if (state.owner === owner && state.bonuses[0]?.id === id && state.presentedId !== id) publish({ ...state, presentedId: id });
    },
    load(owner: string, solicited = false): Promise<void> {
      bind(owner);
      if (solicited && !state.solicited) publish({ ...state, solicited: true });
      if (state.bonuses.length > 0) return Promise.resolve();
      if (loading) return loading;
      const current = generation;
      loading = (async () => {
        try {
          const cursor = await deps.readCursor(owner);
          if (generation !== current) return;
          const page = await deps.fetchPage(cursor);
          if (generation === current) publish({ ...state, bonuses: page.bonuses, failed: false });
        } catch {
          if (generation === current) publish({ ...state, failed: true });
        } finally { if (generation === current) loading = null; }
      })();
      return loading;
    },
    acknowledge(owner: string, id: string): Promise<void> {
      if (state.owner !== owner || state.bonuses[0]?.id !== id) return Promise.reject(new Error('Reçu non courant.'));
      if (acknowledging) return acknowledging;
      const current = generation;
      acknowledging = deps.writeCursor(owner, id).then(() => {
        if (generation === current) publish({ ...state, bonuses: state.bonuses.slice(1), presentedId: null });
      }).finally(() => { if (generation === current) acknowledging = null; });
      return acknowledging;
    },
  };
}
