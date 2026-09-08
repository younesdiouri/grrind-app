import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatFoughtAt, formatBattleCounts } from './format.ts';

describe('les compteurs et la fin v2', () => {
  it('distingue les actions et toutes les tentatives', () => {
    assert.equal(formatBattleCounts({ actionCount: 3, attackCount: 6, endReason: 'KO' }), '3 actions · 6 tentatives · KO');
  });
  it('nomme la limite même quand le serveur déclare une victoire', () => {
    assert.equal(formatBattleCounts({ actionCount: 1, attackCount: 1, endReason: 'ATTACK_LIMIT' }), '1 action · 1 tentative · Limite atteinte');
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
