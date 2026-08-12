import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import createClient from 'openapi-fetch';

import { asProblem, meansSessionOver } from '../features/auth/problems.ts';
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

/**
 * Un serveur qui n'accepte qu'un jeton, et distingue les trois refus comme le vrai.
 *
 * Les `type` et les libellés sont ceux relevés sur le back : un jeton absent donne
 * `access-token-missing`, une chaîne quelconque `access-token-invalid`, et un JWT réel passé
 * `exp` donne `access-token-expired`. Seul le dernier appelle un rafraîchissement.
 */
function makeServer(accepted: () => string, refusal = 'access-token-expired') {
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
          type: `https://grrind.app/problems/${authorization === null ? 'access-token-missing' : refusal}`,
          title: 'Unauthorized',
          status: 401,
          detail: "Le jeton d'accès n'a pas fait son travail.",
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
  let ended: number;

  beforeEach(() => {
    clientToken = 'stale';
    refreshed = 0;
    ended = 0;
  });

  /**
   * Le montage complet : client + coordinateur + middleware, câblés comme en production.
   *
   * Le `refresh` reproduit `session.refresh` — c'est le contrat qui décide si un 401 se
   * rafraîchit ou termine la session, et `meansSessionOver` est ici la vraie fonction, pas
   * une imitation.
   */
  function mount(
    options: { performRefresh?: () => Promise<string | null>; refusal?: string } = {},
  ) {
    const server = makeServer(() => SERVER_TOKEN, options.refusal);
    const client = createClient<paths>({ baseUrl: BASE_URL, fetch: server.fetch });

    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => clientToken,
      performRefresh:
        options.performRefresh ??
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
        refresh: async (staleToken, problem) => {
          if (meansSessionOver(asProblem(problem))) {
            ended += 1;
            return null;
          }
          return coordinator.refresh(staleToken);
        },
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

  it('termine la session sur access-token-invalid, sans brûler de refresh token', async () => {
    const { client, server } = mount({ refusal: 'access-token-invalid' });

    const { response } = await client.GET('/api/me');

    // Le contrat est explicite : invalide veut dire « renvoie le joueur sur la connexion »,
    // pas « rafraîchis ». Renouveler ici dépenserait un jeton pour rien.
    assert.equal(refreshed, 0);
    assert.equal(ended, 1);
    assert.equal(response.status, 401);
    assert.equal(server.calls.length, 1, 'aucun rejeu');
  });

  it('termine la session sur access-token-missing', async () => {
    clientToken = null;
    const { client, server } = mount();

    const { response } = await client.GET('/api/me');

    assert.equal(server.calls[0].authorization, null);
    assert.equal(refreshed, 0);
    assert.equal(ended, 1);
    assert.equal(response.status, 401);
  });

  it('rafraîchit quand le refus est illisible, plutôt que de déconnecter sur un doute', async () => {
    const server = makeServer(() => SERVER_TOKEN);
    const client = createClient<paths>({ baseUrl: BASE_URL, fetch: server.fetch });

    // Un proxy qui renvoie du HTML, une passerelle en 502 : le corps n'est pas un problème
    // RFC 9457. Au pire un rafraîchissement inutile — qui reste sérialisé ; déconnecter sur
    // un doute, non.
    client.use(
      createAuthMiddleware({
        getAccessToken: () => clientToken,
        refresh: async (staleToken, problem) => {
          assert.equal(asProblem(problem), null);
          assert.equal(meansSessionOver(asProblem(problem)), false);
          refreshed += 1;
          clientToken = SERVER_TOKEN;
          return clientToken;
        },
      }),
    );

    // Le serveur de ce test-là refuse en texte brut.
    const original = server.fetch;
    const { data } = await client.GET('/api/me', {
      fetch: (async (input: Request) => {
        const response = await original(input);
        return response.status === 401
          ? new Response('<html>502 Bad Gateway</html>', { status: 401 })
          : response;
      }) as unknown as typeof globalThis.fetch,
    });

    assert.equal(refreshed, 1);
    assert.ok(data, 'le rejeu doit aboutir');
  });

  it("ne rejoue qu'une fois : un 401 sur le rejeu remonte tel quel", async () => {
    // Le rafraîchissement « réussit » mais rend un jeton que le serveur refuse aussi.
    const { client, server } = mount({
      performRefresh: async () => {
        refreshed += 1;
        clientToken = 'toujours-faux';
        return clientToken;
      },
    });

    const { error, response } = await client.GET('/api/me');

    assert.equal(response.status, 401);
    assert.ok(error);
    assert.equal(refreshed, 1);
    assert.equal(server.calls.length, 2, 'un rejeu, pas une boucle');
  });

  it('laisse remonter le 401 sans rejeu quand la session est morte', async () => {
    const { client, server } = mount({
      performRefresh: async () => {
        refreshed += 1;
        return null;
      },
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
