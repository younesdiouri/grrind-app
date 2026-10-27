import type { components } from '@/api/schema';
import type { EquipmentSlot } from '@/design/tokens';

export type Inventory = components['schemas']['Inventory'];
export type InventoryLine = components['schemas']['InventoryLine'];
export const INVENTORY_CATEGORIES = {
  all: 'Tous', weapons: 'Armes', outfits: 'Tenues', materials: 'Composants', chests: 'Coffres',
} as const;
export type InventoryCategory = keyof typeof INVENTORY_CATEGORIES;

/** Filtres de présentation : les accessoires et le bandeau font partie de la tenue. */
export function filterInventoryItems(items: InventoryLine[], category: InventoryCategory): InventoryLine[] {
  switch (category) {
    case 'all': return items;
    case 'weapons': return items.filter((item) => item.kind === 'EQUIPMENT' && item.slot === 'WEAPON');
    case 'outfits': return items.filter((item) => item.kind === 'EQUIPMENT' && item.slot !== 'WEAPON');
    case 'materials': return items.filter((item) => item.kind === 'RESOURCE');
    case 'chests': return items.filter((item) => item.kind === 'CHEST');
  }
}

export type EquippableInventoryLine = InventoryLine & {
  kind: 'EQUIPMENT';
  slot: EquipmentSlot;
};

/**
 * L'ordre des emplacements, celui du contrat. Les gants occupent WEAPON comme les haltères.
 *
 * Le Record exige toutes les clés du contrat : oublier un emplacement casse le build.
 */
const EQUIPMENT_SLOT_ORDER_KEYS: Record<EquipmentSlot, true> = {
  HEAD: true,
  CHEST: true,
  LEGS: true,
  FEET: true,
  ACCESSORY: true,
  WEAPON: true,
};

export const EQUIPMENT_SLOT_ORDER = Object.keys(EQUIPMENT_SLOT_ORDER_KEYS) as EquipmentSlot[];

/** Un emplacement et ce qu'il porte — `null` quand il est libre, jamais absent. */
export type EquippedSlot = { slot: EquipmentSlot; line: InventoryLine | null };

/**
 * La doublure, emplacement par emplacement, **dans l'ordre du contrat**.
 *
 * `equipment` porte toujours toutes les clés, `null` pour les vides : il n'y a donc rien à
 * compléter ici, seulement à mettre en ordre. Un emplacement libre est un emplacement à
 * dessiner — c'est même la moitié de l'information de cet écran, celle qui dit ce qu'on
 * pourrait porter et qu'on ne porte pas.
 */
export function equippedSlots(inventory: Inventory): EquippedSlot[] {
  return EQUIPMENT_SLOT_ORDER.map((slot) => ({ slot, line: inventory.equipment[slot] }));
}

/**
 * Cette ligne du sac est-elle portée en ce moment.
 *
 * **Ce n'est pas la dérivation que le contrat interdit.** Ce qu'il interdit, c'est de
 * reconstruire une liste à partir de l'autre — retirer d'`items` ce qui est équipé, ou déduire
 * la doublure du sac. `items` porte tout, équipé compris, « c'est la même ligne vue sous un
 * autre angle » : dire *lequel* de ces angles s'applique à une ligne donnée est exactement ce
 * que l'angle vaut, et c'est ce qui évite de proposer « Équiper » sur ce qu'on porte déjà.
 *
 * La marque vaut pour la **clé**, pas pour l'exemplaire : deux paires de bottes identiques dont
 * une est aux pieds forment une seule ligne, qui est bien celle d'un objet porté. Le contrat ne
 * distingue pas les exemplaires — `key` est « stable, ce n'est pas un identifiant
 * d'exemplaire » — donc le client ne le fait pas non plus.
 */
export function isEquipped(inventory: Inventory, itemKey: string): boolean {
  return EQUIPMENT_SLOT_ORDER.some((slot) => inventory.equipment[slot]?.key === itemKey);
}

/**
 * La décision vient de `kind`. Le contrôle de `slot` rend seulement sûre la forme aplatie que
 * génère OpenAPI, qui ne peut pas exprimer que `EQUIPMENT` implique un emplacement.
 */
export function isEquippable(line: InventoryLine): line is EquippableInventoryLine {
  return line.kind === 'EQUIPMENT' && line.slot !== null;
}

/**
 * Combien d'exemplaires le sac contient — la somme des quantités, pas le nombre de lignes.
 *
 * C'est ce que l'entrée de l'accueil annonce, et c'est le compte qu'un joueur vérifie : trois
 * paires de bottes sont trois objets dans un sac, pas une ligne.
 */
export function itemCount(inventory: Inventory): number {
  return inventory.items.reduce((total, line) => total + line.quantity, 0);
}
