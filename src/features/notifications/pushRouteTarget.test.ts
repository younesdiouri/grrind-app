import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodePushRouteTarget } from './pushRouteTarget.ts';

/**
 * Le banc du décodage de la charge utile — voir le docblock de `pushRouteTarget.ts` pour la
 * dette qu'il assume (#147). Ces fixtures sont les payloads réalistes que le système peut
 * livrer, bons et mauvais : un tap n'a jamais de seconde chance sur celui-ci.
 */
describe('decodePushRouteTarget', () => {
  it('décode le payload tel que le back l’envoie vraiment', () => {
    assert.deepEqual(
      decodePushRouteTarget({
        groupingKey: 'guild-activity:018f1e2a-6b3c-7000-8000-000000000001',
        routeType: 'PLAYER_PROFILE',
        routeId: '018f1e2a-6b3c-7000-8000-000000000002',
      }),
      {
        type: 'PLAYER_PROFILE',
        routeId: '018f1e2a-6b3c-7000-8000-000000000002',
        groupingKey: 'guild-activity:018f1e2a-6b3c-7000-8000-000000000001',
      },
    );
  });

  it('transporte `groupingKey` sans le découper ni l’interpréter', () => {
    const target = decodePushRouteTarget({
      groupingKey: 'guild-activity:autre-chose:encore',
      routeType: 'PLAYER_PROFILE',
      routeId: '018f1e2a-6b3c-7000-8000-000000000002',
    });

    assert.equal(target?.groupingKey, 'guild-activity:autre-chose:encore');
  });

  it('décode `GUILD_RISALAT`, sans consommer `routeId` — voir le docblock de `pushRouting.ts`', () => {
    assert.deepEqual(
      decodePushRouteTarget({
        groupingKey: 'risala-turn:018f1e2a-6b3c-7000-8000-000000000003',
        routeType: 'GUILD_RISALAT',
        routeId: '018f1e2a-6b3c-7000-8000-000000000003',
      }),
      {
        type: 'GUILD_RISALAT',
        routeId: '018f1e2a-6b3c-7000-8000-000000000003',
        groupingKey: 'risala-turn:018f1e2a-6b3c-7000-8000-000000000003',
      },
    );
  });

  it('rend `null` sur un `routeType` inconnu — le cas du jour où le back en ajoute un', () => {
    assert.equal(
      decodePushRouteTarget({
        groupingKey: 'guild-activity:x',
        routeType: 'GUILD_ROSTER',
        routeId: '018f1e2a-6b3c-7000-8000-000000000002',
      }),
      null,
    );
  });

  it('rend `null` quand `routeId` est absent', () => {
    assert.equal(
      decodePushRouteTarget({ groupingKey: 'guild-activity:x', routeType: 'PLAYER_PROFILE' }),
      null,
    );
  });

  it('rend `null` quand `routeId` est vide ou n’est pas une chaîne', () => {
    assert.equal(
      decodePushRouteTarget({ routeType: 'PLAYER_PROFILE', routeId: '' }),
      null,
    );
    assert.equal(
      decodePushRouteTarget({ routeType: 'PLAYER_PROFILE', routeId: 42 }),
      null,
    );
  });

  it('route quand même sur `groupingKey` absent — elle vaut `null`, pas un échec', () => {
    assert.deepEqual(
      decodePushRouteTarget({
        routeType: 'PLAYER_PROFILE',
        routeId: '018f1e2a-6b3c-7000-8000-000000000002',
      }),
      { type: 'PLAYER_PROFILE', routeId: '018f1e2a-6b3c-7000-8000-000000000002', groupingKey: null },
    );
  });

  it('rend `null` sur un `data` vide', () => {
    assert.equal(decodePushRouteTarget({}), null);
  });

  it('rend `null` quand `data` n’est pas un objet', () => {
    assert.equal(decodePushRouteTarget(undefined), null);
    assert.equal(decodePushRouteTarget(null), null);
    assert.equal(decodePushRouteTarget('PLAYER_PROFILE'), null);
    assert.equal(decodePushRouteTarget(['PLAYER_PROFILE']), null);
  });
});
