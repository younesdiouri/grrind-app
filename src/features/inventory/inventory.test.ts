import assert from 'node:assert/strict';
import { inventoryAfterSale } from './saleInventory.ts';
import { describe, it } from 'node:test';

import {
  EQUIPMENT_SLOT_ORDER,
  equippedSlots,
  isEquippable,
  isEquipped,
  itemCount,
  type Inventory,
  type InventoryLine,
} from './inventory.ts';

function line(overrides: Partial<InventoryLine> = {}): InventoryLine {
  return {
    key: 'WORN_RUNNING_SHOES',
    kind: 'EQUIPMENT',
    name: 'Baskets usées',
    rarity: 'COMMON',
    slot: 'FEET',
    modifiers: [],
    priceCoins: 30,
    sellPriceCoins: 15,
    imageUrl: 'https://api.grrind.app/game-images/items/worn-running-shoes.png',
    quantity: 1,
    ...overrides,
  };
}

function inventory(overrides: Partial<Inventory> = {}): Inventory {
  return {
    coins: 0,
    statistics: {
      attributes: {
        strength: { base: 0, equipmentBonus: 0, effective: 0 },
        endurance: { base: 0, equipmentBonus: 0, effective: 0 },
        mobility: { base: 0, equipmentBonus: 0, effective: 0 },
        dexterity: { base: 0, equipmentBonus: 0, effective: 0 },
        vitality: { base: 0, equipmentBonus: 0, effective: 0 },
      },
      fighter: { hp: 140, damage: 16, mitigationPercent: 0, comboPercent: 0, dodgePercent: 0,
        maintenancePercent: 0, criticalChancePercent: 0, guardPercent: 0,
        criticalResistancePercent: 0, cooldownReductionPercent: 0, precisionPercent: 0 },
    },
    equipment: {
      HEAD: null,
      CHEST: null,
      HANDS: null,
      LEGS: null,
      FEET: null,
      ACCESSORY: null,
      WEAPON: null,
    },
    items: [],
    ...overrides,
  };
}

describe("la doublure et le sac, tels que l'écran les lit (#30)", () => {
  it('ne propose d’équiper que les objets que le contrat nomme EQUIPMENT', () => {
    const equipment = line({ kind: 'EQUIPMENT', slot: 'FEET' });
    const chest = line({ kind: 'CHEST', slot: null, key: 'DUNE_CHEST' });

    assert.equal(isEquippable(equipment), true);
    // Le coffre n'est pas reconnu grâce à son slot absent : `kind` est la donnée pérenne.
    assert.equal(isEquippable(chest), false);
  });

  it("rend les sept emplacements dans l'ordre du contrat, vides compris", () => {
    const slots = equippedSlots(inventory());

    assert.deepEqual(
      slots.map((entry) => entry.slot),
      ['HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'ACCESSORY', 'WEAPON'],
    );
    // Un emplacement libre est un emplacement à dessiner : il ne disparaît pas de la liste.
    assert.equal(slots.length, EQUIPMENT_SLOT_ORDER.length);
    assert.ok(slots.every((entry) => entry.line === null));
  });

  it("porte l'objet de chaque emplacement occupé, sans le déplacer dans la liste", () => {
    const boots = line({ key: 'STORMCALLERS_BOOTS', slot: 'FEET' });
    const slots = equippedSlots(inventory({ equipment: { ...inventory().equipment, FEET: boots } }));

    assert.equal(slots[4].slot, 'FEET');
    assert.equal(slots[4].line, boots);
    // L'ordre ne remonte pas ce qui est porté : la doublure se lit toujours de la tête aux pieds.
    assert.equal(slots[0].slot, 'HEAD');
  });

  it('reconnaît une ligne du sac portée en ce moment, par sa clé', () => {
    const boots = line({ key: 'STORMCALLERS_BOOTS', slot: 'FEET' });
    const bag = inventory({
      equipment: { ...inventory().equipment, FEET: boots },
      items: [boots, line({ key: 'IRON_GAUNTLETS', slot: 'HANDS' })],
    });

    assert.equal(isEquipped(bag, 'STORMCALLERS_BOOTS'), true);
    assert.equal(isEquipped(bag, 'IRON_GAUNTLETS'), false);
    // `items` porte **tout**, équipé compris : la ligne portée reste dans le sac, elle n'en
    // est jamais retirée — c'est la même ligne vue sous un autre angle.
    assert.equal(bag.items.length, 2);
  });

  it('compte les exemplaires et non les lignes', () => {
    const bag = inventory({
      items: [line({ quantity: 3 }), line({ key: 'IRON_GAUNTLETS', quantity: 2 })],
    });

    // Trois paires de bottes sont trois objets dans un sac, pas une ligne.
    assert.equal(itemCount(bag), 5);
    assert.equal(itemCount(inventory()), 0);
  });
});


describe('le verdict de vente dans le sac', () => {
  it('retire la dernière unité et affiche le solde serveur', () => {
    const shoes = line();
    const after = inventoryAfterSale(inventory({ items: [shoes] }), {
      itemKey: shoes.key, quantity: 0, coins: 15, coinsBefore: 0, coinsAfter: 215,
    });
    assert.deepEqual(after.items, []);
    assert.equal(after.coins, 215);
  });

  it('conserve le doublon équipé avec sa quantité serveur', () => {
    const shoes = line({ quantity: 3 });
    const before = inventory({ items: [shoes], equipment: { ...inventory().equipment, FEET: shoes } });
    const after = inventoryAfterSale(before, {
      itemKey: shoes.key, quantity: 2, coins: 0, coinsBefore: 20, coinsAfter: 20,
    });
    assert.equal(after.items[0].quantity, 2);
    assert.equal(after.equipment.FEET?.quantity, 2);
    assert.equal(after.equipment.FEET?.key, shoes.key);
    assert.equal(before.items[0].quantity, 3);
  });
});
