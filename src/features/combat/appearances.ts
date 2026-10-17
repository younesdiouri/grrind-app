import type { components } from '@/api/schema';
import { enemyArtworkOf } from './enemyPresentation.ts';

export type AppearanceModel = components['schemas']['AppearanceModel'];

/** La clé vient du fait serveur, jamais du profil courant lors d’un rejeu. */
export function appearanceArtwork(models: AppearanceModel[], key: components['schemas']['Appearance'] | null | undefined,
  view: 'front' | 'back', name: string, miniature = false) {
  const model = models.find((entry) => entry.key === key);
  const artwork = enemyArtworkOf({ name, imageUrls: model ? (miniature ? model.thumbnailUrls : model.imageUrls)[view] : null });
  return artwork && model ? { ...artwork, attachments: model.attachments[view],
    foreground: model.foregroundUrls ? Object.fromEntries(Object.entries(model.foregroundUrls[view]).map(([pose, uri]) => [pose, { uri }])) : undefined } : artwork;
}
