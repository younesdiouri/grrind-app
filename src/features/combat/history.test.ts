import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appendPage, EMPTY_HISTORY, hasMore, type BattlePage, type BattleSummary } from './history.ts';

function battle(id: string, foughtAt: string): BattleSummary {
  return {
    id,
    result: 'VICTORY',
    enemy: { key: 'SAND_JACKAL', name: 'Chacal des sables' },
    turns: 16,
    foughtAt,
    // Sans intérêt pour l'accumulation de pages testée ici : un gain nul, comme une
    // défaite. `rewards` est requis depuis #124, l'historique ne l'a jamais lu.
    rewards: { loot: [], coins: { gained: 0, before: 0, after: 0 } },
  };
}

function page(battles: BattleSummary[], nextCursor: string | null): BattlePage {
  return { battles, nextCursor };
}

describe('l’accumulation de l’historique des combats', () => {
  it('ne saute ni ne double aucun combat sur trois pages successives', () => {
    const first = page(
      [battle('c1', '2026-08-29T15:00:00+00:00'), battle('c2', '2026-08-29T14:00:00+00:00')],
      'apres-c2',
    );
    const second = page(
      [battle('c3', '2026-08-28T09:00:00+00:00'), battle('c4', '2026-08-27T19:00:00+00:00')],
      'apres-c4',
    );
    const third = page([battle('c5', '2026-08-26T08:00:00+00:00')], null);

    const history = [first, second, third].reduce(appendPage, EMPTY_HISTORY);

    assert.deepEqual(
      history.battles.map((b) => b.id),
      ['c1', 'c2', 'c3', 'c4', 'c5'],
    );
    assert.equal(history.nextCursor, null);
    assert.equal(hasMore(history), false);
  });

  it('encaisse deux combats à la même seconde sans les dédoublonner lui-même', () => {
    // Le cas que le départage par identifiant existe pour couvrir côté serveur : la reprise
    // est `fought_at < :cursorAt OR (fought_at = :cursorAt AND id < :cursorId)`. Le client
    // n'a rien à faire de plus — et surtout pas à indexer par `id`, ce qui rendrait une
    // pagination cassée indiscernable d'une pagination correcte.
    const meme = '2026-08-29T15:25:55+00:00';
    const first = page([battle('b2', meme)], 'apres-b2');
    const second = page([battle('b1', meme)], null);

    const history = [first, second].reduce(appendPage, EMPTY_HISTORY);

    assert.deepEqual(
      history.battles.map((b) => b.id),
      ['b2', 'b1'],
    );
  });

  it('s’arrête quand le curseur est nul, et ne redemande rien', () => {
    const history = appendPage(EMPTY_HISTORY, page([battle('c1', '2026-08-29T15:00:00+00:00')], null));

    assert.equal(hasMore(history), false);
  });

  it('ferme l’historique sur une page vide, même si elle porte un curseur', () => {
    // Le contrat promet qu'un `nextCursor` ne rend jamais le vide, donc ce cas n'arrive pas.
    // S'il arrivait, la conséquence ne serait pas une liste incomplète mais une boucle de
    // requêtes sans fin sur l'appareil d'un joueur — et une liste tronquée se voit, une
    // boucle non.
    const history = appendPage(EMPTY_HISTORY, page([], 'un-curseur-qui-ment'));

    assert.deepEqual(history.battles, []);
    assert.equal(hasMore(history), false);
  });

  it('part d’un historique vide qui ne demande rien', () => {
    assert.deepEqual(EMPTY_HISTORY.battles, []);
    assert.equal(hasMore(EMPTY_HISTORY), false);
  });
});
