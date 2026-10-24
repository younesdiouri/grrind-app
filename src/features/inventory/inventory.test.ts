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
    key: 'SPORT_TSHIRT_SLATE',
    kind: 'EQUIPMENT',
    name: 'T-shirt sportif — Ardoise',
    rarity: 'COMMON',
    slot: 'CHEST',
    weaponType: null,
    modifiers: [],
    priceCoins: 10,
    sellPriceCoins: 5,
    imageUrl: '',
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
  it('conserve la quantité des ressources sans les proposer comme équipement', () => {
    const resource = line({ kind: 'RESOURCE', slot: null, quantity: 12 });
    assert.equal(isEquippable(resource), false);
    assert.equal(itemCount(inventory({ items: [resource] })), 12);
  });
  it('ne propose d’équiper que les objets que le contrat nomme EQUIPMENT', () => {
    const equipment = line({ kind: 'EQUIPMENT', slot: 'CHEST' });
    const chest = line({ kind: 'CHEST', slot: null, key: 'DUNE_CHEST' });

    assert.equal(isEquippable(equipment), true);
    // Le coffre n'est pas reconnu grâce à son slot absent : `kind` est la donnée pérenne.
    assert.equal(isEquippable(chest), false);
  });

  it("rend les six emplacements dans l'ordre du contrat, vides compris", () => {
    const slots = equippedSlots(inventory());

    assert.deepEqual(
      slots.map((entry) => entry.slot),
      ['HEAD', 'CHEST', 'LEGS', 'FEET', 'ACCESSORY', 'WEAPON'],
    );
    // Un emplacement libre est un emplacement à dessiner : il ne disparaît pas de la liste.
    assert.equal(slots.length, EQUIPMENT_SLOT_ORDER.length);
    assert.ok(slots.every((entry) => entry.line === null));
  });

  it("porte l'objet de chaque emplacement occupé, sans le déplacer dans la liste", () => {
    const shirt = line({ key: 'SPORT_TSHIRT_CORAL', slot: 'CHEST' });
    const slots = equippedSlots(inventory({ equipment: { ...inventory().equipment, CHEST: shirt } }));

    assert.equal(slots[1].slot, 'CHEST');
    assert.equal(slots[1].line, shirt);
    // L'ordre ne remonte pas ce qui est porté : la doublure se lit toujours de la tête aux pieds.
    assert.equal(slots[0].slot, 'HEAD');
  });

  it('reconnaît une ligne du sac portée en ce moment, par sa clé', () => {
    const shirt = line({ key: 'SPORT_TSHIRT_CORAL', slot: 'CHEST' });
    const bag = inventory({
      equipment: { ...inventory().equipment, CHEST: shirt },
      items: [shirt, line({ key: 'GOLDEN_BOXING_GLOVES', slot: 'WEAPON' })],
    });

    assert.equal(isEquipped(bag, 'SPORT_TSHIRT_CORAL'), true);
    assert.equal(isEquipped(bag, 'GOLDEN_BOXING_GLOVES'), false);
    // `items` porte **tout**, équipé compris : la ligne portée reste dans le sac, elle n'en
    // est jamais retirée — c'est la même ligne vue sous un autre angle.
    assert.equal(bag.items.length, 2);
  });

  it('compte les exemplaires et non les lignes', () => {
    const bag = inventory({
      items: [line({ quantity: 3 }), line({ key: 'GOLDEN_BOXING_GLOVES', quantity: 2 })],
    });

    // Trois t-shirts sont trois objets dans un sac, pas une ligne.
    assert.equal(itemCount(bag), 5);
    assert.equal(itemCount(inventory()), 0);
  });
});


describe('le verdict de vente dans le sac', () => {
  it('retire la dernière unité et affiche le solde serveur', () => {
    const shirt = line();
    const after = inventoryAfterSale(inventory({ items: [shirt] }), {
      itemKey: shirt.key, quantity: 0, coins: 15, coinsBefore: 0, coinsAfter: 215,
    });
    assert.deepEqual(after.items, []);
    assert.equal(after.coins, 215);
  });

  it('conserve le doublon équipé avec sa quantité serveur', () => {
    const shirt = line({ quantity: 3 });
    const before = inventory({ items: [shirt], equipment: { ...inventory().equipment, CHEST: shirt } });
    const after = inventoryAfterSale(before, {
      itemKey: shirt.key, quantity: 2, coins: 0, coinsBefore: 20, coinsAfter: 20,
    });
    assert.equal(after.items[0].quantity, 2);
    assert.equal(after.equipment.CHEST?.quantity, 2);
    assert.equal(after.equipment.CHEST?.key, shirt.key);
    assert.equal(before.items[0].quantity, 3);
  });
});
