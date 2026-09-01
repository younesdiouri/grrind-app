import assert from 'node:assert/strict';
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
    quantity: 1,
    ...overrides,
  };
}

function inventory(overrides: Partial<Inventory> = {}): Inventory {
  return {
    coins: 0,
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

  it('garantit que chaque emplacement libre a une ligne null et conserve la clé du slot (#128)', () => {
    const slots = equippedSlots(inventory());
    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const match = slots.find((entry) => entry.slot === slot);
      assert.ok(match !== undefined);
      assert.equal(match.line, null);
    }
  });
});
