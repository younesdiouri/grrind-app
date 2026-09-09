import type { components, operations } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

export type ChatMessage = components['schemas']['GuildMessage'];
export type ChatPage = operations['get_community_chat_history']['responses'][200]['content']['application/json'];
export type ChatSubscription = operations['post_community_chat_subscription']['responses'][200]['content']['application/json'];
export type ChatQuery = NonNullable<operations['get_community_chat_history']['parameters']['query']>;
export type PreparedPhoto = { uri: string };
export type ChatDraft = { clientId: string; text: string; photo: PreparedPhoto | null };
export type ChatError = { failure: Failure; retryAt: number };
export type ChatResult<T> = { ok: true; data: T } | { ok: false; error: ChatError };

export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) => {
    const left = BigInt(a.cursor);
    const right = BigInt(b.cursor);
    return left < right ? -1 : left > right ? 1 : a.id.localeCompare(b.id);
  });
}

export function retryAfterMs(value: string | null, now: number): number {
  if (value === null) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}
