import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { components } from '@/api/schema';
// La résolution des fichiers locaux appartient au bundler natif, pas au serveur React.
mock.module(new URL('./equippedAvatarImages.ts', import.meta.url), { namedExports: { EQUIPPED_AVATAR_IMAGES: {
  'base-original-dumbbell': { uri: 'base-original-dumbbell.png' },
  'base-original-gloves': { uri: 'base-original-gloves.png' },
  'base-original-unarmed': { uri: 'base-original-unarmed.png' },
} } });
const { CombatAvatarPreview } = await import('./CombatAvatarPreview.tsx');

const empty: components['schemas']['PublicInventory']['equipment'] = {
  HEAD: null, ACCESSORY: null, CHEST: null, WEAPON: null, LEGS: null, FEET: null,
};

describe('CombatAvatarPreview', () => {
  it('affiche la capture correspondant à la réponse serveur et change après retrait', () => {
    const equipment = { ...empty, WEAPON: { key: 'LE_POIDS_LOURD', slot: 'WEAPON' as const,
      kind: 'EQUIPMENT' as const, name: 'Le Poids Lourd', rarity: 'COMMON' as const,
      modifiers: [], weaponType: 'FIST' as const, quantity: 1, imageUrl: 'https://example.test/poids.png' } };
    const equipped = renderToStaticMarkup(createElement(CombatAvatarPreview, { equipment }));
    const gloves = renderToStaticMarkup(createElement(CombatAvatarPreview, { equipment: {
      ...equipment, WEAPON: { ...equipment.WEAPON, key: 'GOLDEN_BOXING_GLOVES', name: 'Gants de boxe dorés' },
    } }));
    const removed = renderToStaticMarkup(createElement(CombatAvatarPreview, { equipment: empty }));
    assert.match(equipped, /base-original-dumbbell\.png/);
    assert.match(equipped, /Le Poids Lourd/);
    assert.match(gloves, /base-original-gloves\.png/);
    assert.match(gloves, /Gants de boxe dorés/);
    assert.doesNotMatch(gloves, /dumbbell\.png|Le Poids Lourd/);
    assert.match(removed, /base-original-unarmed\.png/);
    assert.doesNotMatch(removed, /dumbbell\.png|athlete\.png|gloves\.png/);
  });
  it('signale honnêtement un objet dont le modèle 3D manque', () => {
    const equipment = { ...empty, FEET: { key: 'FUTURE_BOOTS', slot: 'FEET' as const,
      kind: 'EQUIPMENT' as const, name: 'Bottes futures', rarity: 'COMMON' as const,
      modifiers: [], weaponType: null, quantity: 1, imageUrl: 'https://example.test/shoes.png' } };
    const markup = renderToStaticMarkup(createElement(CombatAvatarPreview, { equipment }));
    assert.match(markup, /Équipé, sans aperçu 3D : Bottes futures/);
    assert.match(markup, /base-original-unarmed\.png/);
  });
});
