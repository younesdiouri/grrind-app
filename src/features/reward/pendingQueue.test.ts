import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dequeuePending, enqueuePending, parsePendingQueue } from './pendingQueue.ts';
import type { SyncSummary } from './timeline.ts';

/**
 * Le banc de la file des progressions non jouées.
 *
 * Il prouve ce qui coûterait une animation entière si ça se trompait : deux réveils qui
 * n'effacent pas l'un l'autre, et aucune fusion de deux `SyncSummary` — ni le calcul de jeu
 * que ce serait, ni le bug plus discret d'un `totals` qui redevient faux.
 */

function summary(id: string): SyncSummary {
  // Une forme minimale, juste ce que `parsePendingQueue` regarde. Le contenu réel n'importe
  // pas ici : c'est l'identité de l'objet — jamais mêlée à une autre — que ces tests vérifient.
  return { imported: [{ id }], skipped: [], totals: null } as unknown as SyncSummary;
}

describe('la file des progressions non jouées', () => {
  it('met en file dans l\'ordre d\'arrivée, sans rien fusionner', () => {
    const first = summary('premier');
    const second = summary('second');

    let queue: SyncSummary[] = [];
    queue = enqueuePending(queue, first);
    queue = enqueuePending(queue, second);

    assert.deepEqual(queue, [first, second]);
    // Deux objets distincts, pas un troisième né d'une fusion.
    assert.equal(queue[0], first);
    assert.equal(queue[1], second);
  });

  it("n'efface que la tête, jamais le reste", () => {
    const first = summary('premier');
    const second = summary('second');
    const third = summary('troisième');

    const queue = [first, second, third];
    const after = dequeuePending(queue);

    assert.deepEqual(after, [second, third]);
    // La file d'origine n'a pas bougé : ces fonctions ne mutent rien.
    assert.deepEqual(queue, [first, second, third]);
  });

  it('ne casse pas sur une file déjà vide', () => {
    assert.deepEqual(dequeuePending([]), []);
  });

  it('relit une file bien formée telle quelle', () => {
    const raw = [summary('un'), summary('deux')];
    assert.deepEqual(parsePendingQueue(raw), raw);
  });

  it("enveloppe l'ancien format — un seul résumé — plutôt que de le jeter", () => {
    const legacy = summary('avant la file');
    assert.deepEqual(parsePendingQueue(legacy), [legacy]);
  });

  it('rend une file vide sur une forme illisible, sans jeter', () => {
    assert.deepEqual(parsePendingQueue(null), []);
    assert.deepEqual(parsePendingQueue('un texte'), []);
    assert.deepEqual(parsePendingQueue({ imported: 'pas un tableau' }), []);
    assert.deepEqual(parsePendingQueue([summary('bonne'), { rien: true }]), []);
  });
});
