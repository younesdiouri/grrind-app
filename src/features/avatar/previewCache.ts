import { capturePreview } from './capturePreview.ts';

// Covers a full guild plus profile/full-body previews; bound both count and base64 memory.
export const PREVIEW_CACHE_ENTRIES = 64;
export const PREVIEW_CACHE_BYTES = 16 * 1024 * 1024;

export function createPreviewCache(capture: (configuration: string) => Promise<string>) {
  let queue: Promise<unknown> = Promise.resolve();
  const images = new Map<string, string>();
  let bytes = 0;
  function remove(key: string) {
    bytes -= (images.get(key)?.length ?? 0) * 2;
    images.delete(key);
  }
  function get(key: string) {
    const uri = images.get(key);
    if (uri) { images.delete(key); images.set(key, uri); }
    return uri;
  }
  function remember(key: string, uri: string) {
    remove(key);
    if (uri.length * 2 > PREVIEW_CACHE_BYTES) return;
    images.set(key, uri);
    bytes += uri.length * 2;
    while (images.size > PREVIEW_CACHE_ENTRIES || bytes > PREVIEW_CACHE_BYTES) remove(images.keys().next().value!);
  }
  return { get, delete: remove,
    request(key: string, active: () => boolean): Promise<string | undefined> {
      if (!active()) return Promise.resolve(undefined);
      const cached = get(key);
      if (cached) return Promise.resolve(cached);
      const result = queue.catch(() => undefined).then(async () => {
        if (!active()) return;
        const existing = get(key);
        if (existing) return existing;
        const uri = await capturePreview(key, capture, active);
        // A native capture already started cannot be cancelled. Keep it for the next visit.
        if (uri) remember(key, uri);
        return active() ? uri : undefined;
      });
      queue = result;
      return result;
    },
  };
}
