import { Directory, File, Paths } from 'expo-file-system';

import type { PreparedPhoto } from '@/features/community/chatState';

export function chatPhotoDirectory() {
  const directory = new Directory(Paths.cache, 'guild-chat');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export function purgeChatPhotoCache() {
  try {
    const directory = new Directory(Paths.cache, 'guild-chat');
    if (directory.exists) directory.delete();
  } catch { /* Le système peut avoir déjà évincé le cache. */ }
}

export function removeChatPhoto(photo: PreparedPhoto) {
  if (!photo.uri.startsWith(Paths.cache.uri)) return;
  try {
    const file = new File(photo.uri);
    if (file.exists) file.delete();
  } catch { /* Le cache peut déjà avoir été évincé par le système. */ }
}
