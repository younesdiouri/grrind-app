import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatFoughtAt, formatTurns } from './format.ts';

describe('le nombre de tours, en phrase', () => {
  it('accorde le pluriel', () => {
    assert.equal(formatTurns(16), '16 tours');
  });

  it('garde le singulier à un tour — un combat expédié en un coup existe', () => {
    assert.equal(formatTurns(1), '1 tour');
  });

  it('n’accorde pas zéro au singulier', () => {
    // Le serveur n'en produit pas : un combat compte au moins un tour. La règle de langue
    // reste juste quand même, plutôt que de rendre « 0 tour » par accident d'écriture.
    assert.equal(formatTurns(0), '0 tour');
  });
});

describe('la date d’un combat', () => {
  // `now` est un paramètre, comme partout dans les formateurs de ce dépôt : un test qui dépend
  // de l'heure de son exécution ne prouve rien.
  const now = new Date(2026, 7, 29, 18, 0);

  it('situe le combat du jour à son heure', () => {
    assert.equal(formatFoughtAt(new Date(2026, 7, 29, 15, 25).toISOString(), now), 'Aujourd’hui, 15:25');
  });

  it('nomme hier', () => {
    assert.equal(formatFoughtAt(new Date(2026, 7, 28, 9, 5).toISOString(), now), 'Hier, 09:05');
  });

  it('retombe sur la date seule au-delà', () => {
    assert.equal(formatFoughtAt(new Date(2026, 7, 20, 9, 5).toISOString(), now), '20 août');
  });

  it('rend l’instant brut plutôt que « Invalid Date » sur une date illisible', () => {
    assert.equal(formatFoughtAt('pas-une-date', now), 'pas-une-date');
  });
});
