import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import type { PreparedPhoto } from '@/features/community/chatState';
import { chatPhotoDirectory, removeChatPhoto } from '@/features/community/chatFiles';

export { removeChatPhoto } from '@/features/community/chatFiles';

const MAX_EDGE = 1600;
const MAX_BYTES = 5 * 1024 * 1024;

/** Le codec natif applique l'orientation et produit un JPEG unique, conservé pour le retry. */
export async function pickChatPhoto(): Promise<PreparedPhoto | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
  if (picked.canceled) return null;
  const source = picked.assets[0];
  const context = ImageManipulator.manipulate(source.uri);
  let output: PreparedPhoto | null = null;
  try {
    if (Math.max(source.width, source.height) > MAX_EDGE) {
      context.resize(source.width >= source.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }
    const rendered = await context.renderAsync();
    try {
      output = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    } finally { rendered.release(); }
    if (new File(output.uri).size > MAX_BYTES) throw new Error('La photo reste trop volumineuse. Choisis une autre image.');
    const prepared = new File(output.uri);
    await prepared.move(chatPhotoDirectory());
    output = { uri: prepared.uri };
    return output;
  } catch (error) {
    if (output) removeChatPhoto(output);
    throw error;
  } finally {
    context.release();
    removeChatPhoto({ uri: source.uri });
  }
}
