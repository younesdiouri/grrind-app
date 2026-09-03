import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { registrationRequest } from './registrationRequest.ts';

describe("la requête d'inscription", () => {
  it("déclare le français comme langue persistée du nouveau joueur", () => {
    assert.deepEqual(
      registrationRequest({
        email: 'ada@grrind.app',
        password: 'motdepasse123',
        displayName: 'Ada',
        timezone: 'Europe/Paris',
      }),
      {
        email: 'ada@grrind.app',
        password: 'motdepasse123',
        displayName: 'Ada',
        timezone: 'Europe/Paris',
        locale: 'fr',
      },
    );
  });
});
