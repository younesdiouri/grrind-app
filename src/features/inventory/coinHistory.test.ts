import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appendPage, EMPTY_HISTORY, hasMore, type CoinHistoryPage, type CoinTransaction } from './coinHistory.ts';

function transaction(id: string, occurredAt: string, amount = 12): CoinTransaction {
  return {
    id,
    sourceId: '00000000-0000-0000-0000-000000000000',
    reason: 'WORKOUT_DROP',
    amount,
    occurredAt,
  };
}

function page(transactions: CoinTransaction[], nextCursor: string | null, balance = 0): CoinHistoryPage {
  return { balance, transactions, nextCursor };
}

describe('l’accumulation de l’historique de la bourse', () => {
  it('ne saute ni ne double aucun mouvement sur trois pages successives', () => {
    const first = page(
      [transaction('t1', '2026-08-29T15:00:00+00:00'), transaction('t2', '2026-08-29T14:00:00+00:00')],
      'apres-t2',
    );
    const second = page(
      [transaction('t3', '2026-08-28T09:00:00+00:00'), transaction('t4', '2026-08-27T19:00:00+00:00')],
      'apres-t4',
    );
    const third = page([transaction('t5', '2026-08-26T08:00:00+00:00')], null);

    const history = [first, second, third].reduce(appendPage, EMPTY_HISTORY);

    assert.deepEqual(
      history.transactions.map((t) => t.id),
      ['t1', 't2', 't3', 't4', 't5'],
    );
    assert.equal(history.nextCursor, null);
    assert.equal(hasMore(history), false);
  });

  it('encaisse deux mouvements au même `occurredAt` sans les dédoublonner lui-même', () => {
    // Le cas que le départage par identifiant existe pour couvrir côté serveur — le client n'a
    // rien à faire de plus, et surtout pas à indexer par `id`, ce qui rendrait une pagination
    // cassée indiscernable d'une pagination correcte.
    const meme = '2026-08-29T15:25:55+00:00';
    const first = page([transaction('m2', meme)], 'apres-m2');
    const second = page([transaction('m1', meme)], null);

    const history = [first, second].reduce(appendPage, EMPTY_HISTORY);

    assert.deepEqual(
      history.transactions.map((t) => t.id),
      ['m2', 'm1'],
    );
  });

  it('s’arrête quand le curseur est nul, et ne redemande rien', () => {
    const history = appendPage(EMPTY_HISTORY, page([transaction('t1', '2026-08-29T15:00:00+00:00')], null));

    assert.equal(hasMore(history), false);
  });

  it('ferme l’historique sur une page vide, même si elle porte un curseur', () => {
    // Le contrat promet qu'un `nextCursor` ne rend jamais le vide, donc ce cas n'arrive pas.
    // S'il arrivait, la conséquence serait une boucle de requêtes sans fin plutôt qu'une liste
    // incomplète, et une liste tronquée se voit là où une boucle vide une batterie en silence.
    const history = appendPage(EMPTY_HISTORY, page([], 'un-curseur-qui-ment'));

    assert.deepEqual(history.transactions, []);
    assert.equal(hasMore(history), false);
  });

  it('part d’un historique vide qui ne demande rien', () => {
    assert.deepEqual(EMPTY_HISTORY.transactions, []);
    assert.equal(hasMore(EMPTY_HISTORY), false);
  });
});
