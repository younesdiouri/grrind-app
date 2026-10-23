import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { components } from '@/api/schema';
import { equippedAvatarPreview } from './equippedAvatarPreview.ts';

type Equipment = components['schemas']['PublicInventory']['equipment'];
const empty: Equipment = { HEAD: null, ACCESSORY: null, CHEST: null, WEAPON: null, LEGS: null, FEET: null };
function item(key: string, slot: NonNullable<Equipment['WEAPON']>['slot']): NonNullable<Equipment['WEAPON']> {
  return { key, slot, kind: 'EQUIPMENT', name: key, rarity: 'COMMON', modifiers: [], quantity: 1,
    imageUrl: 'https://example.test/item.png' };
}

describe('l’aperçu équipé du serveur (#243)', () => {
  it('montre la tenue de base sans les objets de démonstration quand les emplacements sont vides', () => {
    assert.deepEqual(equippedAvatarPreview(empty), { key: 'base-original-unarmed', unsupported: [] });
  });
  it('ajoute puis retire l’haltère en suivant les réponses serveur, sans ajouter de gants', () => {
    const equipped = { ...empty, WEAPON: item('LE_POIDS_LOURD', 'WEAPON') };
    assert.equal(equippedAvatarPreview(equipped).key, 'base-original-dumbbell');
    assert.equal(equippedAvatarPreview({ ...equipped, WEAPON: null }).key, 'base-original-unarmed');
  });
  it('distingue l’ancien Haltère ego du Poids Lourd avec sa variante bleue', () => {
    assert.equal(equippedAvatarPreview({ ...empty, WEAPON: item('HALTER_EGO', 'WEAPON') }).key,
      'base-original-ego');
    assert.deepEqual(equippedAvatarPreview({ ...empty, WEAPON: item('HALTER_EGO', 'WEAPON') }).unsupported, []);
  });
  it('remplace l’haltère par les gants, puis les retire sans changer les vêtements', () => {
    const equipment = { ...empty, CHEST: item('SPORT_TSHIRT_SLATE', 'CHEST'),
      LEGS: item('LES_GUINZZ_CYAN', 'LEGS'),
      WEAPON: item('LE_POIDS_LOURD', 'WEAPON') };
    assert.equal(equippedAvatarPreview(equipment).key, 'slate-cyan-dumbbell');
    const gloves = { ...equipment, WEAPON: item('GOLDEN_BOXING_GLOVES', 'WEAPON') };
    assert.deepEqual(equippedAvatarPreview(gloves), { key: 'slate-cyan-gloves', unsupported: [] });
    assert.equal(equippedAvatarPreview({ ...gloves, WEAPON: null }).key, 'slate-cyan-unarmed');
    assert.equal(equippedAvatarPreview({ ...gloves, WEAPON: item('HALTER_EGO', 'WEAPON') }).key, 'slate-cyan-ego');
    assert.equal(equippedAvatarPreview({ ...equipment, LEGS: item('LES_GUINZZ_CORAL', 'LEGS') }).key,
      'slate-coral-dumbbell');
    assert.equal(equippedAvatarPreview({ ...equipment, CHEST: null }).key, 'base-cyan-dumbbell');
  });
  it('ne remplace pas un objet ancien/inconnu par un modèle différent et conserve son nom', () => {
    const old = { ...item('FUTURE_BOOTS', 'FEET'), name: 'Bottes futures' };
    const result = equippedAvatarPreview({ ...empty, FEET: old });
    assert.equal(result.key, 'base-original-unarmed');
    assert.deepEqual(result.unsupported, [old]);
  });
  it('ne reconnaît pas une clé de modèle rangée dans un autre emplacement', () => {
    const wrongSlot = item('GOLDEN_BOXING_GLOVES', 'FEET');
    assert.deepEqual(equippedAvatarPreview({ ...empty, FEET: wrongSlot }),
      { key: 'base-original-unarmed', unsupported: [wrongSlot] });
  });
});
