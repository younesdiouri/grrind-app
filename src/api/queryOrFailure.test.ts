import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { queryOrFailure } from './queryOrFailure.ts';

/**
 * Le banc du trou que #48 a laissé passer : un réseau injoignable relançait un `TypeError`
 * brut jusqu'à `messageFor`, qui n'accepte qu'une `Failure` et jetait à son tour au rendu.
 * `openapi-fetch` attrape le `fetch` dans son propre try/catch mais **relance** l'exception
 * d'origine faute de middleware `onError` pour l'absorber — le nôtre en rend `undefined`
 * exprès sur ce cas, pour laisser passer.
 */
describe('queryOrFailure', () => {
  it('rend la donnée telle quelle quand l’appel réussit', async () => {
    const result = await queryOrFailure(async () => ({ data: { ok: true } }));
    assert.deepEqual(result, { ok: true });
  });

  it('convertit un problème nommé par le serveur en `Failure`', async () => {
    const problem = { type: 'https://grrind.app/problems/not-found', title: 'x', status: 404, detail: 'x' };

    await assert.rejects(
      () => queryOrFailure(async () => ({ error: problem })),
      (failure: unknown) => {
        assert.deepEqual(failure, { kind: 'problem', problem });
        return true;
      },
    );
  });

  it('convertit une exception réseau (back injoignable) en `Failure` hors ligne, pas en TypeError brut', async () => {
    await assert.rejects(
      () =>
        queryOrFailure(async () => {
          throw new TypeError('Network request failed');
        }),
      (failure: unknown) => {
        assert.deepEqual(failure, { kind: 'offline' });
        return true;
      },
    );
  });
});
