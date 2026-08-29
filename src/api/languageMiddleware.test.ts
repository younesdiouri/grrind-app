import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import createClient from 'openapi-fetch';

import { ACCEPT_LANGUAGE, createLanguageMiddleware } from './languageMiddleware.ts';
import type { paths } from './schema';

/**
 * Le middleware, monté sur un vrai `openapi-fetch` et un faux serveur — même modèle que
 * `authMiddleware.test.ts` : on regarde ce qui part sur le réseau, pas ce qu'un mock affirme.
 */

const BASE_URL = 'http://api.test';

function makeServer() {
  const acceptLanguages: (string | null)[] = [];

  const fetch = async (input: Request | string | URL): Promise<Response> => {
    const request = input as Request;
    acceptLanguages.push(request.headers.get('Accept-Language'));

    return new Response(JSON.stringify({ id: 'u1', email: 'ada@grrind.app' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return { acceptLanguages, fetch: fetch as unknown as typeof globalThis.fetch };
}

describe('le middleware de langue', () => {
  it('pose la constante sur une route authentifiée', async () => {
    const server = makeServer();
    const client = createClient<paths>({ baseUrl: BASE_URL, fetch: server.fetch });
    client.use(createLanguageMiddleware());

    await client.GET('/api/me');

    assert.deepEqual(server.acceptLanguages, [ACCEPT_LANGUAGE]);
  });

  it('pose la constante sur une route publique — un refus se lit aussi', async () => {
    const server = makeServer();
    const client = createClient<paths>({ baseUrl: BASE_URL, fetch: server.fetch });
    client.use(createLanguageMiddleware());

    await client.POST('/api/auth/login', {
      body: { email: 'ada@grrind.app', password: 'motdepasse123' },
    });

    assert.deepEqual(server.acceptLanguages, [ACCEPT_LANGUAGE]);
  });

  it("ne remplace pas un Accept-Language déjà posé sur l'appel", async () => {
    const server = makeServer();
    const client = createClient<paths>({ baseUrl: BASE_URL, fetch: server.fetch });
    client.use(createLanguageMiddleware());

    await client.GET('/api/me', { headers: { 'Accept-Language': 'de-DE' } });

    assert.deepEqual(server.acceptLanguages, ['de-DE']);
  });
});
