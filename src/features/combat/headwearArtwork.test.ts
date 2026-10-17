import assert from 'node:assert/strict';
import { after, test } from 'node:test';

// Frontière Metro/native : Node ne possède pas le registre d’images embarquées.
const previous = Object.getOwnPropertyDescriptor(globalThis, 'require');
Object.defineProperty(globalThis, 'require', { configurable: true, value: (uri: string) => ({ uri }) });
const { headwearArtwork, MURID_HEADBAND } = await import('./headwearArtwork.ts');
after(() => { if (previous) Object.defineProperty(globalThis, 'require', previous); else Reflect.deleteProperty(globalThis, 'require'); });

test('les deux camps résolvent la coiffe figée, avec le miroir du défié', () => {
  const fighter = { appearance: 'MURID' as const, equipment: { HEAD: { key: 'TEMPERED_HEADBAND', artworkVersion: 'v1' } } };
  assert.equal(headwearArtwork(fighter, 'back'), MURID_HEADBAND.back);
  assert.equal(headwearArtwork(fighter, 'front'), MURID_HEADBAND.front);
});

test('ancien combat, autre emplacement, coiffe ou version inconnue ne prêtent pas le bandeau', () => {
  assert.equal(headwearArtwork({ appearance: 'MURID' }, 'back'), undefined);
  const fighters: Parameters<typeof headwearArtwork>[0][] = [
    { appearance: null, equipment: { HEAD: { key: 'TEMPERED_HEADBAND', artworkVersion: 'v1' } } },
    { appearance: 'MURID' as const, equipment: { FEET: { key: 'TEMPERED_HEADBAND', artworkVersion: 'v1' } } },
    { appearance: 'MURID' as const, equipment: { HEAD: { key: 'CROWN_OF_THE_TIRELESS', artworkVersion: null } } },
    { appearance: 'MURID' as const, equipment: { HEAD: { key: 'TEMPERED_HEADBAND', artworkVersion: 'v2' } } },
  ];
  for (const fighter of fighters) assert.equal(headwearArtwork(fighter, 'back'), undefined);
});
