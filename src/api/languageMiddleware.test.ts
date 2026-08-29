import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import createClient from 'openapi-fetch';

import { createAuthMiddleware } from './authMiddleware.ts';
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

  it("survit au rejeu qui suit un rafraîchissement — l'ordre de montage protège le clone", async () => {
    // `authMiddleware` clone la requête pour son rejeu (`request.clone()`, avant l'envoi) sur le
    // `Request` qu'il reçoit. Monté avant le langage, le clone partirait sans `Accept-Language` —
    // ce test reproduit le montage réel de `client.ts` : le langage d'abord, l'auth ensuite.
    const calls: { authorization: string | null; acceptLanguage: string | null }[] = [];

    const fetch = async (input: Request | string | URL): Promise<Response> => {
      const request = input as Request;
      const authorization = request.headers.get('Authorization');
      calls.push({ authorization, acceptLanguage: request.headers.get('Accept-Language') });

      if (authorization !== 'Bearer fresh') {
        return new Response(
          JSON.stringify({
            type: 'https://grrind.app/problems/access-token-expired',
            title: 'Unauthorized',
            status: 401,
            detail: "Le jeton d'accès a expiré.",
          }),
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }

      return new Response(JSON.stringify({ id: 'u1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = createClient<paths>({
      baseUrl: BASE_URL,
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    client.use(createLanguageMiddleware());
    client.use(
      createAuthMiddleware({
        getAccessToken: () => 'stale',
        refresh: async () => 'fresh',
      }),
    );

    const { data } = await client.GET('/api/me');

    assert.ok(data, 'le rejeu doit aboutir');
    assert.equal(calls.length, 2, 'un refus, puis un rejeu');
    assert.deepEqual(
      calls.map((call) => call.acceptLanguage),
      [ACCEPT_LANGUAGE, ACCEPT_LANGUAGE],
      "la requête rejouée doit porter l'en-tête, pas seulement la première",
    );
  });
});
