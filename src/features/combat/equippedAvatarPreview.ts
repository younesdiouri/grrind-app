import type { components } from '@/api/schema';

type Equipment = components['schemas']['PublicInventory']['equipment'];
type Shirt = 'base' | 'slate' | 'coral';
type Pants = 'original' | 'violet' | 'cyan' | 'coral';

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
  // Le Bandeau éclair (#306) s'ajuste à toutes les coiffures ; une autre coiffe n'a pas de modèle.
  const headband = equipment.HEAD?.key === 'BANDEAU_ECLAIR';
  return { shirt, pants, weapon, headband } as const;
}
