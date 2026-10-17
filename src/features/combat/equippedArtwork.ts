import type { components } from '@/api/schema';
import type { EquipmentArtwork } from './equipmentArtwork';

type CatalogItem = components['schemas']['EquipmentArtworkModel'];
type Fighter = { appearance?: string | null; equipment?: components['schemas']['BattleEquipment'] };

/** Les références du combat priment sur la version active actuelle du catalogue. */
export function equippedArtwork(catalog: CatalogItem[], fighter: Fighter, view: 'back' | 'front'): EquipmentArtwork[] {
  if (!fighter.appearance) return [];
  return Object.entries(fighter.equipment ?? {}).flatMap(([slot, reference]) => {
    const item = catalog.find((entry) => entry.key === reference.key && entry.version === reference.artworkVersion
      && entry.slot === slot && entry.compatibleAppearances.includes(fighter.appearance!));
    return item?.layers.map((layer, index) => ({
      key: `${item.key}:${item.version}:${index}`, attachment: layer.attachment,
      source: { uri: layer.sourceUrls[view] }, aspectRatio: layer.aspectRatio,
      scale: layer.scale, pivot: { x: view === 'front' ? 1 - layer.pivot.x : layer.pivot.x, y: layer.pivot.y }, plane: layer.plane,
    })) ?? [];
  });
}
