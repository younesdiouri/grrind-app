import type { components } from '@/api/schema';

type Equipment = components['schemas']['PublicInventory']['equipment'];
type Shirt = 'base' | 'slate' | 'coral';
type Pants = 'original' | 'violet' | 'cyan' | 'coral';
export type AvatarPreviewKey = `${Shirt}-${Pants}-${'unarmed' | 'gloves' | 'dumbbell' | 'ego' | 'ferPlay' | 'huilesson'}`;

/** Clés et emplacements serveur, indépendants des noms traduits et des choix de l’atelier. */
export function equippedModels(equipment: Record<string, Pick<NonNullable<Equipment['WEAPON']>, 'key'> | null | undefined>) {
  const shirt: Shirt = equipment.CHEST?.key === 'SPORT_TSHIRT_SLATE' ? 'slate'
    : equipment.CHEST?.key === 'SPORT_TSHIRT_CORAL' ? 'coral' : 'base';
  const pants: Pants = equipment.LEGS?.key === 'LES_GUINZZ_PURPLE' ? 'violet'
    : equipment.LEGS?.key === 'LES_GUINZZ_CYAN' ? 'cyan'
    : equipment.LEGS?.key === 'LES_GUINZZ_CORAL' ? 'coral' : 'original';
  const weapon = equipment.WEAPON?.key === 'GOLDEN_BOXING_GLOVES' ? 'gloves'
    : equipment.WEAPON?.key === 'LE_POIDS_LOURD' ? 'dumbbell'
    : equipment.WEAPON?.key === 'HALTER_EGO' ? 'ego'
    : equipment.WEAPON?.key === 'FER_PLAY' ? 'ferPlay'
    : equipment.WEAPON?.key === 'HUILESSON' ? 'huilesson' : 'unarmed';
  return { shirt, pants, weapon } as const;
}

export function equippedAvatarPreview(equipment: Equipment) {
  const { shirt, pants, weapon } = equippedModels(equipment);
  const represented = { CHEST: shirt !== 'base', LEGS: pants !== 'original', WEAPON: weapon !== 'unarmed' };
  const unsupported = Object.entries(equipment).flatMap(([slot, line]) =>
    line && !represented[slot as keyof typeof represented] ? [line] : []);
  const key: AvatarPreviewKey = `${shirt}-${pants}-${weapon}`;
  return { key, unsupported };
}
