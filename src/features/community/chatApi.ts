import { File } from 'expo-file-system';

import { api } from '@/api/client';
import { failureFrom, OFFLINE } from '@/features/auth/problems';
import { retryAfterMs, type ChatDraft, type ChatPage, type ChatMessage, type ChatQuery, type ChatResult, type ChatSubscription } from '@/features/community/chatState';

function result<T>(data: T | undefined, error: unknown, response: Response): ChatResult<T> {
  if (data !== undefined) return { ok: true, data };
  return { ok: false, error: { failure: failureFrom(error),
    retryAt: Date.now() + retryAfterMs(response.headers.get('Retry-After'), Date.now()) } };
}

const offline = (): ChatResult<never> => ({ ok: false, error: { failure: OFFLINE, retryAt: 0 } });

export function chatApi(id: string, signal: AbortSignal) {
  return {
    async history(query: ChatQuery): Promise<ChatResult<ChatPage>> {
      try {
        const response = await api.GET('/api/guilds/{id}/chat/messages', { params: { path: { id }, query }, signal });
        return result(response.data, response.error, response.response);
      } catch { return offline(); }
    },
    async send(draft: ChatDraft): Promise<ChatResult<ChatMessage>> {
      try {
        const response = await api.POST('/api/guilds/{id}/chat/messages', {
          params: { path: { id } }, signal,
          body: { clientId: draft.clientId, text: draft.text },
          ...(draft.photo ? { bodySerializer: () => {
            const form = new FormData();
            form.append('clientId', draft.clientId);
            form.append('text', draft.text);
            form.append('image', new File(draft.photo!.uri), 'photo.jpg');
            return form;
          } } : {}),
        });
        return result(response.data, response.error, response.response);
      } catch { return offline(); }
    },
    async subscription(): Promise<ChatResult<ChatSubscription>> {
      try {
        const response = await api.POST('/api/guilds/{id}/chat/subscription', { params: { path: { id } }, signal });
        return result(response.data, response.error, response.response);
      } catch { return offline(); }
    },
  };
}
