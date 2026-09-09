import { isGuildGone } from '@/features/community/guildRefresh';
import { mergeMessages, type ChatDraft, type ChatError, type ChatMessage, type ChatPage, type ChatQuery, type ChatResult, type PreparedPhoto } from '@/features/community/chatState';

export type ChatDeps = {
  history: (query: ChatQuery) => Promise<ChatResult<ChatPage>>;
  send: (draft: ChatDraft) => Promise<ChatResult<ChatMessage>>;
  removePhoto: (photo: PreparedPhoto) => void;
  onGone: () => void;
  now: () => number;
};

type ChatState = {
  messages: ChatMessage[];
  before: string | null;
  loading: boolean;
  loadingOlder: boolean;
  loaded: boolean;
  error: ChatError | null;
  draft: ChatDraft | null;
  sending: boolean;
  sendError: ChatError | null;
};

const empty = (): ChatState => ({ messages: [], before: null, loading: false,
  loadingOlder: false, loaded: false, error: null, draft: null, sending: false, sendError: null });

/** Une instance par ouverture et par guilde ; aucun contenu privé dans le cache global. */
export function createChatController(deps: ChatDeps) {
  let state = empty();
  let disposed = false;
  let after = '0';
  let sendRetryAt = 0;
  let catchUpPromise: Promise<void> | null = null;
  let catchUpAgain = false;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<ChatState>) => {
    if (disposed) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const dispose = () => {
    if (state.draft?.photo) deps.removePhoto(state.draft.photo);
    state = empty();
    disposed = true;
    listeners.forEach((listener) => listener());
    listeners.clear();
  };
  const acceptError = (error: ChatError, send = false) => {
    if (disposed) return;
    if (isGuildGone(error.failure)) {
      dispose();
      deps.onGone();
    } else publish(send ? { sendError: error } : { error });
  };
  const merge = (messages: ChatMessage[]) => {
    if (disposed) return;
    const merged = mergeMessages(state.messages, messages);
    // Un envoi HTTP peut devancer le rattrapage : il ne déplace jamais `after`.
    publish({ messages: merged });
  };
  const load = async () => {
    if (disposed || state.loading || state.loaded || (state.error?.retryAt ?? 0) > deps.now()) return;
    publish({ loading: true, error: null });
    const result = await deps.history({ limit: 50 });
    if (disposed) return;
    if (result.ok) {
      merge(result.data.messages ?? []);
      after = state.messages.at(-1)?.cursor ?? '0';
      publish({ before: result.data.nextCursor ?? null, loaded: true });
    } else acceptError(result.error);
    publish({ loading: false });
  };
  const catchUp = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (catchUpPromise) { catchUpAgain = true; return catchUpPromise; }
    catchUpPromise = (async () => {
      if (!state.loaded) await load();
      if (!state.loaded || disposed || (state.error?.retryAt ?? 0) > deps.now()) return;
      do {
        catchUpAgain = false;
        let more = true;
        while (more && !disposed) {
          const result = await deps.history({ after, limit: 50 });
          if (disposed) return;
          if (!result.ok) { acceptError(result.error); return; }
          const messages = result.data.messages ?? [];
          merge(messages);
          const next = result.data.nextCursor;
          const latest = messages.at(-1)?.cursor;
          more = next != null && next !== after;
          after = next ?? latest ?? after;
          publish({ error: null });
        }
      } while (catchUpAgain && !disposed);
    })().finally(() => { catchUpPromise = null; });
    return catchUpPromise;
  };
  return {
    getState: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose, load, catchUp,
    async older() {
      if (disposed || state.loadingOlder || !state.before || (state.error?.retryAt ?? 0) > deps.now()) return;
      publish({ loadingOlder: true });
      const result = await deps.history({ before: state.before, limit: 50 });
      if (disposed) return;
      if (result.ok) {
        merge(result.data.messages ?? []);
        publish({ before: result.data.nextCursor ?? null, error: null });
      } else acceptError(result.error);
      publish({ loadingOlder: false });
    },
    setDraft(draft: ChatDraft | null) {
      if (disposed || state.sending) {
        if (draft?.photo && draft.photo !== state.draft?.photo) deps.removePhoto(draft.photo);
        return;
      }
      if (state.draft?.photo && state.draft.photo !== draft?.photo) deps.removePhoto(state.draft.photo);
      publish({ draft, sendError: sendRetryAt > deps.now() ? state.sendError : null });
    },
    async send() {
      const draft = state.draft;
      if (disposed || !draft || state.sending || sendRetryAt > deps.now()) return;
      publish({ sending: true, sendError: null });
      const result = await deps.send(draft);
      if (disposed) return;
      if (result.ok) {
        merge([result.data]);
        if (draft.photo) deps.removePhoto(draft.photo);
        publish({ draft: null });
        void catchUp();
      } else { sendRetryAt = result.error.retryAt; acceptError(result.error, true); }
      publish({ sending: false });
    },
    acceptError,
  };
}
