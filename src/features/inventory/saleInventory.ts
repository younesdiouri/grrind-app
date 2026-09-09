import type { Inventory } from './inventory.ts';
import { EQUIPMENT_SLOT_ORDER } from './inventory.ts';
import type { Sale } from './saleRunner.ts';

/** Applique les quantités et le solde rendus par le serveur, puis le caller relit le sac. */
export function inventoryAfterSale(inventory: Inventory, sale: Sale): Inventory {
  const equipment = { ...inventory.equipment };
  for (const slot of EQUIPMENT_SLOT_ORDER) {
    const line = equipment[slot];
    if (line?.key === sale.itemKey) {
      equipment[slot] = sale.quantity === 0 ? null : { ...line, quantity: sale.quantity };
    }
  }
  return {
    ...inventory,
    coins: sale.coinsAfter,
    equipment,
    items: inventory.items.flatMap((line) => line.key !== sale.itemKey ? [line]
      : sale.quantity === 0 ? [] : [{ ...line, quantity: sale.quantity }]),
  };
}
