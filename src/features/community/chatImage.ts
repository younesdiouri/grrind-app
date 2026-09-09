import { api } from '@/api/client';
import { failureFrom, OFFLINE } from '@/features/auth/problems';
import type { ChatResult } from '@/features/community/chatState';

/** Le transport authentifié partage le refresh ; seuls les pixels en mémoire passent au rendu. */
export async function readChatImage(id: string, messageId: string, signal: AbortSignal): Promise<ChatResult<string>> {
  try {
    const response = await api.GET('/api/guilds/{id}/chat/messages/{messageId}/image', {
      params: { path: { id, messageId } }, parseAs: 'arrayBuffer', signal,
      headers: { 'Cache-Control': 'no-store' },
    });
    if (response.data === undefined) return { ok: false, error: { failure: failureFrom(response.error), retryAt: 0 } };
    const bytes = new Uint8Array(response.data);
    const chunks: string[] = [];
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
    }
    return { ok: true, data: `data:image/webp;base64,${btoa(chunks.join(''))}` };
  } catch { return { ok: false, error: { failure: OFFLINE, retryAt: 0 } }; }
}
