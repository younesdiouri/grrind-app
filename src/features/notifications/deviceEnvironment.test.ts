import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deviceEnvironmentFrom, devicePlatformFrom } from './deviceEnvironment.ts';

describe('devicePlatformFrom', () => {
  it("traduit 'ios' en IOS", () => {
    assert.equal(devicePlatformFrom('ios'), 'IOS');
  });

  it("rend null sur 'android' — différé jusqu'au #15", () => {
    assert.equal(devicePlatformFrom('android'), null);
  });

  it('rend null sur toute autre plateforme (web, windows...)', () => {
    assert.equal(devicePlatformFrom('web'), null);
  });
});

describe('deviceEnvironmentFrom', () => {
  it("traduit le canal 'production' en PRODUCTION", () => {
    assert.equal(deviceEnvironmentFrom('production'), 'PRODUCTION');
  });

  it("traduit le canal 'development' en DEVELOPMENT", () => {
    assert.equal(deviceEnvironmentFrom('development'), 'DEVELOPMENT');
  });

  it("traduit null en PRODUCTION — le build de store, dont le profil n'est pas lisible", () => {
    assert.equal(deviceEnvironmentFrom(null), 'PRODUCTION');
  });
});
