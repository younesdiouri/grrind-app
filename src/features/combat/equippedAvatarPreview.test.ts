import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { components } from '@/api/schema';
import { equippedAvatarPreview } from './equippedAvatarPreview.ts';

type Equipment = components['schemas']['PublicInventory']['equipment'];
const empty: Equipment = { HEAD: null, ACCESSORY: null, CHEST: null, HANDS: null, WEAPON: null, LEGS: null, FEET: null };
function item(key: string, slot: NonNullable<Equipment['HANDS']>['slot']): NonNullable<Equipment['HANDS']> {
  return { key, slot, kind: 'EQUIPMENT', name: key, rarity: 'COMMON', modifiers: [], quantity: 1,
    imageUrl: 'https://example.test/item.png' };
}

describe('l’aperçu équipé du serveur (#243)', () => {
  it('montre la tenue de base sans les objets de démonstration quand les emplacements sont vides', () => {
    assert.deepEqual(equippedAvatarPreview(empty), { key: 'base-original-bare-unarmed', unsupported: [] });
  });
  it('ajoute puis retire l’haltère en suivant les réponses serveur, sans ajouter de gants', () => {
    const equipped = { ...empty, WEAPON: item('LE_POIDS_LOURD', 'WEAPON') };
    assert.equal(equippedAvatarPreview(equipped).key, 'base-original-bare-dumbbell');
    assert.equal(equippedAvatarPreview({ ...equipped, WEAPON: null }).key, 'base-original-bare-unarmed');
  });
  it('distingue l’ancien Haltère ego du Poids Lourd avec sa variante bleue', () => {
    assert.equal(equippedAvatarPreview({ ...empty, WEAPON: item('HALTER_EGO', 'WEAPON') }).key,
      'base-original-bare-ego');
    assert.deepEqual(equippedAvatarPreview({ ...empty, WEAPON: item('HALTER_EGO', 'WEAPON') }).unsupported, []);
  });
  it('combine indépendamment les vêtements, les gants et l’arme, puis remplace une couleur', () => {
    const equipment = { ...empty, CHEST: item('SPORT_TSHIRT_SLATE', 'CHEST'),
      LEGS: item('LES_GUINZZ_CYAN', 'LEGS'), HANDS: item('GOLDEN_BOXING_GLOVES', 'HANDS'),
      WEAPON: item('LE_POIDS_LOURD', 'WEAPON') };
    assert.equal(equippedAvatarPreview(equipment).key, 'slate-cyan-gloves-dumbbell');
    assert.equal(equippedAvatarPreview({ ...equipment, LEGS: item('LES_GUINZZ_CORAL', 'LEGS') }).key,
      'slate-coral-gloves-dumbbell');
    assert.equal(equippedAvatarPreview({ ...equipment, CHEST: null }).key, 'base-cyan-gloves-dumbbell');
  });
  it('ne remplace pas un objet ancien/inconnu par un modèle différent et conserve son nom', () => {
    const old = { ...item('IRON_GAUNTLETS', 'HANDS'), name: 'Gantelets de fer' };
    const result = equippedAvatarPreview({ ...empty, HANDS: old });
    assert.equal(result.key, 'base-original-bare-unarmed');
    assert.deepEqual(result.unsupported, [old]);
  });
  it('ne reconnaît pas une clé de modèle rangée dans un autre emplacement', () => {
    const wrongSlot = item('GOLDEN_BOXING_GLOVES', 'FEET');
    assert.deepEqual(equippedAvatarPreview({ ...empty, FEET: wrongSlot }),
      { key: 'base-original-bare-unarmed', unsupported: [wrongSlot] });
  });
});
