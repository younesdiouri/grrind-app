import type { components } from '@/api/schema';

type Equipment = components['schemas']['PublicInventory']['equipment'];
type Shirt = 'base' | 'slate' | 'coral';
type Pants = 'original' | 'violet' | 'cyan' | 'coral';
export type AvatarPreviewKey = `${Shirt}-${Pants}-${'bare' | 'gloves'}-${'unarmed' | 'dumbbell' | 'ego'}`;

/** Clés et emplacements serveur, indépendants des noms traduits et des choix de l’atelier. */
export function equippedAvatarPreview(equipment: Equipment) {
  const shirt: Shirt = equipment.CHEST?.key === 'SPORT_TSHIRT_SLATE' ? 'slate'
    : equipment.CHEST?.key === 'SPORT_TSHIRT_CORAL' ? 'coral' : 'base';
  const pants: Pants = equipment.LEGS?.key === 'LES_GUINZZ_PURPLE' ? 'violet'
    : equipment.LEGS?.key === 'LES_GUINZZ_CYAN' ? 'cyan'
    : equipment.LEGS?.key === 'LES_GUINZZ_CORAL' ? 'coral' : 'original';
  const gloves = equipment.HANDS?.key === 'GOLDEN_BOXING_GLOVES';
  const weapon = equipment.WEAPON?.key === 'LE_POIDS_LOURD' ? 'dumbbell'
    : equipment.WEAPON?.key === 'HALTER_EGO' ? 'ego' : 'unarmed';
  const represented = { CHEST: shirt !== 'base', LEGS: pants !== 'original', HANDS: gloves, WEAPON: weapon !== 'unarmed' };
  const unsupported = Object.entries(equipment).flatMap(([slot, line]) =>
    line && !represented[slot as keyof typeof represented] ? [line] : []);
  const key: AvatarPreviewKey = `${shirt}-${pants}-${gloves ? 'gloves' : 'bare'}-${weapon}`;
  return { key, unsupported };
}
