import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import createClient from 'openapi-fetch';

import { createRefreshCoordinator } from '../features/auth/refreshCoordinator.ts';
import { createAuthMiddleware } from './authMiddleware.ts';
import type { paths } from './schema';

/**
 * Le middleware, monté sur un vrai `openapi-fetch` et un faux serveur.
 *
 * Ce n'est pas un test de composant : rien ne monte, rien ne s'affiche. On regarde ce qui
 * part sur le réseau, parce que c'est exactement là que se joue l'invariant — le nombre de
 * requêtes, leur en-tête `Authorization`, et leur corps après rejeu.
 */

const BASE_URL = 'http://api.test';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Call = { url: string; method: string; authorization: string | null; body: string };

/** Un serveur qui n'accepte qu'un jeton, et le dit en 401 `problem+json` comme le vrai. */
function makeServer(accepted: () => string) {
  const calls: Call[] = [];

  const fetch = async (input: Request | string | URL): Promise<Response> => {
    const request = input as Request;
    const authorization = request.headers.get('Authorization');

    calls.push({
      url: request.url,
      method: request.method,
      authorization,
      body: await request.clone().text(),
    });

    if (authorization !== `Bearer ${accepted()}`) {
      return new Response(
        JSON.stringify({
          type: 'https://grrind.app/problems/invalid-refresh-token',
          title: 'Unauthorized',
          status: 401,
          detail: 'Jeton absent, expiré ou invalide.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
      );
    }

    return new Response(JSON.stringify({ id: 'u1', email: 'ada@grrind.app' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return { calls, fetch: fetch as unknown as typeof globalThis.fetch };
}

describe("le middleware d'authentification", () => {
  /** Le serveur a tourné : il n'accepte plus que `fresh`. Le client, lui, a encore `stale`. */
  const SERVER_TOKEN = 'fresh';

  let clientToken: string | null;
  let refreshed: number;

  beforeEach(() => {
    clientToken = 'stale';
    refreshed = 0;
  });

  /** Le montage complet : client + coordinateur + middleware, comme en production. */
  function mount(performRefresh?: () => Promise<string | null>) {
    const server = makeServer(() => SERVER_TOKEN);
    const client = createClient<paths>({ baseUrl: BASE_URL, fetch: server.fetch });

    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => clientToken,
      performRefresh:
        performRefresh ??
        (async () => {
          refreshed += 1;
          // Le vrai rafraîchissement est un aller-retour réseau : sans ce délai, la
          // sérialisation serait « prouvée » par un hasard d'ordonnancement.
          await delay(10);
          clientToken = SERVER_TOKEN;
          return clientToken;
        }),
    });

    client.use(
      createAuthMiddleware({
        getAccessToken: () => clientToken,
        refresh: coordinator.refresh,
      }),
    );

    return { client, server };
  }

  it('pose le Bearer courant sur les routes protégées', async () => {
    clientToken = SERVER_TOKEN;
    const { client, server } = mount();

    const { data } = await client.GET('/api/me');

    assert.ok(data);
    assert.equal(server.calls.length, 1);
    assert.equal(server.calls[0].authorization, `Bearer ${SERVER_TOKEN}`);
    assert.equal(refreshed, 0);
  });

  it("ne lance qu'un seul rafraîchissement quand deux requêtes expirent en même temps", async () => {
    const { client, server } = mount();

    const [first, second] = await Promise.all([client.GET('/api/me'), client.GET('/api/me')]);

    // C'est *la* vérification du ticket. Deux rafraîchissements, et le back révoque la
    // famille entière : l'appareil est déconnecté sans que rien ne l'ait annoncé.
    assert.equal(refreshed, 1);

    assert.ok(first.data, 'la première requête doit aboutir après rejeu');
    assert.ok(second.data, 'la seconde aussi — elle a attendu la même promesse');

    assert.equal(server.calls.length, 4, 'deux refus, puis deux rejeus');
    assert.deepEqual(
      server.calls.map((call) => call.authorization),
      [`Bearer stale`, `Bearer stale`, `Bearer ${SERVER_TOKEN}`, `Bearer ${SERVER_TOKEN}`],
    );
  });

  it('rejoue le corps de la requête, pas une requête vide', async () => {
    const { client, server } = mount();

    const { data } = await client.PATCH('/api/me', {
      body: { displayName: 'Ada', timezone: 'Europe/Paris' },
    });

    assert.ok(data);
    assert.equal(server.calls.length, 2);
    // Le corps d'une `Request` est un flux à usage unique : `fetch` l'a consommé au premier
    // envoi. Sans la copie prise avant l'envoi, le rejeu partirait sans corps — et le
    // serveur écraserait le pseudo avec rien.
    assert.equal(server.calls[1].body, server.calls[0].body);
    assert.equal(JSON.parse(server.calls[1].body).displayName, 'Ada');
  });

  it("ne rejoue qu'une fois : un 401 sur le rejeu remonte tel quel", async () => {
    // Le rafraîchissement « réussit » mais rend un jeton que le serveur refuse aussi.
    const { client, server } = mount(async () => {
      refreshed += 1;
      clientToken = 'toujours-faux';
      return clientToken;
    });

    const { error, response } = await client.GET('/api/me');

    assert.equal(response.status, 401);
    assert.ok(error);
    assert.equal(refreshed, 1);
    assert.equal(server.calls.length, 2, 'un rejeu, pas une boucle');
  });

  it('laisse remonter le 401 sans rejeu quand la session est morte', async () => {
    const { client, server } = mount(async () => {
      refreshed += 1;
      return null;
    });

    const { error, response } = await client.GET('/api/me');

    assert.equal(response.status, 401);
    assert.ok(error);
    assert.equal(server.calls.length, 1, 'rien à rejouer sans jeton');
  });

  it("n'authentifie ni ne rafraîchit les routes que le contrat déclare publiques", async () => {
    const { client, server } = mount();

    // Un 401 sur la connexion, ce sont des identifiants refusés — pas un jeton expiré.
    // Le rafraîchir n'aurait aucun sens, et sur `/api/auth/refresh` ce serait une boucle.
    await client.POST('/api/auth/login', {
      body: { email: 'ada@grrind.app', password: 'motdepasse123' },
    });

    assert.equal(server.calls.length, 1);
    assert.equal(server.calls[0].authorization, null);
    assert.equal(refreshed, 0);
  });
});
