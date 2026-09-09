import { fetch } from 'expo/fetch';

import { createChatSignalParser } from '@/features/community/chatRealtime';
import type { ChatSubscription } from '@/features/community/chatState';

export function connectChatStream(subscription: ChatSubscription, changed: () => void, opened: () => void, closed: () => void) {
  const abort = new AbortController();
  const url = new URL(subscription.url);
  url.searchParams.append('topic', subscription.topic);
  void (async () => {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'text/event-stream', Authorization: `Bearer ${subscription.token}`, 'Cache-Control': 'no-store' },
      signal: abort.signal,
    });
    if (!response.ok || !response.body) throw new Error('Stream unavailable');
    opened();
    const reader = response.body.getReader();
    const decode = new TextDecoder();
    const parse = createChatSignalParser(changed);
    try {
      while (!abort.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        parse(decode.decode(value, { stream: true }));
      }
    } finally { reader.releaseLock(); }
  })().catch(() => {}).finally(() => { if (!abort.signal.aborted) closed(); });
  return () => abort.abort();
}
