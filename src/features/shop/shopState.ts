import type { components } from '@/api/schema';

type Listing = components['schemas']['ShopListing'];

/** L'état de l'étal est rendu, jamais déduit d'un solde ou d'un niveau local. */
export function purchaseControl(item: Listing): { label: string; disabled: boolean } {
  if (!item.unlocked) {
    return { label: `Niveau ${item.minimumLevel}`, disabled: true };
  }

  // `owned` bloque l'équipement, jamais le coffre : il s'empile et chaque exemplaire s'ouvre.
  if (item.kind === 'EQUIPMENT' && item.owned) {
    return { label: 'Déjà possédé', disabled: true };
  }

  if (!item.affordable) {
    return { label: 'Pas assez de pièces', disabled: true };
  }

  return { label: 'Acheter', disabled: false };
}
