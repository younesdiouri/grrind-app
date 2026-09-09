import type { ChatError, ChatResult, ChatSubscription } from '@/features/community/chatState';

export const CHAT_POLL_MS = 30_000;
export const CHAT_RENEW_MARGIN_MS = 30_000;

type RealtimeDeps = {
  subscription: () => Promise<ChatResult<ChatSubscription>>;
  connect: (subscription: ChatSubscription, changed: () => void, opened: () => void, closed: () => void) => () => void;
  catchUp: () => Promise<void>;
  onError: (error: ChatError) => void;
  onStatus: (connected: boolean) => void;
  now: () => number;
  schedule: (callback: () => void, delay: number) => () => void;
};

/** HTTP reste autonome ; deux timers bornés, aucune reconnexion en arrière-plan. */
export function createChatRealtime(deps: RealtimeDeps) {
  let generation = 0;
  let active = false;
  let disposed = false;
  let retryAt = 0;
  let disconnect = () => {};
  const close = () => { disconnect(); disconnect = () => {}; };
  let cancelRenew = () => {};
  let cancelPoll = () => {};
  const poll = () => {
    cancelPoll();
    if (!active) return;
    cancelPoll = deps.schedule(() => { void deps.catchUp(); poll(); }, CHAT_POLL_MS);
  };
  const open = async () => {
    const current = ++generation;
    close();
    cancelRenew();
    deps.onStatus(false);
    if (!active) return;
    if (retryAt > deps.now()) {
      cancelRenew = deps.schedule(() => void open(), retryAt - deps.now());
      return;
    }
    const response = await deps.subscription();
    if (!active || current !== generation) return;
    if (!response.ok) {
      deps.onError(response.error);
      if (!active || current !== generation) return;
      retryAt = Math.max(response.error.retryAt, deps.now() + CHAT_POLL_MS);
      cancelRenew = deps.schedule(() => void open(), retryAt - deps.now());
      return;
    }
    retryAt = 0;
    const valid = () => active && current === generation;
    disconnect = deps.connect(response.data,
      () => { if (valid()) void deps.catchUp(); },
      () => { if (valid()) { deps.onStatus(true); void deps.catchUp(); } },
      () => {
        if (!valid()) return;
        deps.onStatus(false);
        cancelRenew();
        cancelRenew = deps.schedule(() => void open(), CHAT_POLL_MS);
        void deps.catchUp();
      });
    const delay = Math.max(1000, Date.parse(response.data.expiresAt) - deps.now() - CHAT_RENEW_MARGIN_MS);
    cancelRenew = deps.schedule(() => void open(), delay);
  };
  return {
    setActive(next: boolean) {
      if (disposed || active === next) return;
      active = next;
      if (active) { void open(); void deps.catchUp(); poll(); }
      else { generation++; close(); cancelRenew(); cancelPoll(); deps.onStatus(false); }
    },
    dispose() { disposed = true; active = false; generation++; close(); cancelRenew(); cancelPoll(); },
  };
}

/** Seul le signal chat.changed a un sens ; les événements ne contiennent aucun message. */
export function createChatSignalParser(changed: () => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk;
    let match: RegExpExecArray | null;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const event = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const data = event.split(/\r?\n/).filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart()).join('\n');
      try { if (JSON.parse(data).type === 'chat.changed') changed(); } catch { /* heartbeat */ }
    }
    // Le hub ne porte qu'un signal minuscule : un événement mal formé ne doit pas croître.
    if (buffer.length > 16_384) buffer = '';
  };
}
