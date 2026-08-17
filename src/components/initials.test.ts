import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { initialsOf } from './initials.ts';

describe('les initiales d’un joueur', () => {
  it('prend le premier caractère des deux premiers mots', () => {
    assert.equal(initialsOf('Sam Petit'), 'SP');
    assert.equal(initialsOf('  Léa   Durand '), 'LD');
  });

  it('prend deux caractères d’un nom à un seul mot', () => {
    assert.equal(initialsOf('Zed'), 'ZE');
  });

  it('ignore un troisième mot et au-delà', () => {
    assert.equal(initialsOf('Jean De La Fontaine'), 'JD');
  });

  // Le contrat ne promet pas un nom vide, mais une pastille muette serait un bug plus
  // trompeur qu'un point d'interrogation.
  it('ne rend jamais une pastille vide', () => {
    assert.equal(initialsOf(''), '?');
    assert.equal(initialsOf('   '), '?');
  });
});
