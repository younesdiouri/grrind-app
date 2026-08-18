import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { API_PORT, hostFrom, resolveApiBaseUrl } from './baseUrl.ts';

/**
 * La doc du SDK 57 type `hostUri` en `string` sans en décrire la forme. Ces cas ne
 * documentent donc pas ce qu'Expo *fait* — ils fixent ce que le parseur *accepte*, pour que
 * la forme du jour n'ait pas à être devinée juste.
 */
describe('l’hôte tiré d’un hostUri', () => {
  it('lit la forme la plus courante — hôte et port, sans schéma', () => {
    assert.equal(hostFrom('192.168.68.109:8081'), '192.168.68.109');
  });

  it('accepte un hôte seul, sans port', () => {
    assert.equal(hostFrom('192.168.68.109'), '192.168.68.109');
  });

  it('retire le schéma, quel qu’il soit', () => {
    assert.equal(hostFrom('http://192.168.68.109:8081'), '192.168.68.109');
    assert.equal(hostFrom('exp://192.168.68.109:8081'), '192.168.68.109');
  });

  it('retire le chemin et la requête', () => {
    assert.equal(hostFrom('exp://192.168.68.109:8081/--/chemin'), '192.168.68.109');
    assert.equal(hostFrom('192.168.68.109:8081?runtime=1'), '192.168.68.109');
  });

  it('garde les crochets d’une IPv6 littérale — ses deux-points ne sont pas ceux du port', () => {
    assert.equal(hostFrom('[::1]:8081'), '[::1]');
    assert.equal(hostFrom('http://[fe80::1]:8081'), '[fe80::1]');
  });

  it('rend null quand il n’y a pas d’hôte à en tirer', () => {
    assert.equal(hostFrom(''), null);
    assert.equal(hostFrom('   '), null);
    assert.equal(hostFrom('http://'), null);
    assert.equal(hostFrom(':8081'), null);
  });
});

describe('l’adresse de l’API', () => {
  it('suit le serveur de développement quand rien n’est configuré — c’est tout l’objet du module', () => {
    const url = resolveApiBaseUrl({
      configured: undefined,
      hostUri: '192.168.68.109:8081',
      scriptURL: undefined,
      isDev: true,
    });

    assert.equal(url, `http://192.168.68.109:${API_PORT}`);
  });

  it('retombe sur scriptURL quand hostUri est absent — le cas d’un dev client, qui ne passe jamais par le manifeste', () => {
    const url = resolveApiBaseUrl({
      configured: undefined,
      hostUri: undefined,
      scriptURL: 'http://192.168.68.109:8081/index.bundle?platform=ios&dev=true',
      isDev: true,
    });

    assert.equal(url, `http://192.168.68.109:${API_PORT}`);
  });

  it('préfère hostUri à scriptURL quand les deux sont là', () => {
    const url = resolveApiBaseUrl({
      configured: undefined,
      hostUri: '192.168.68.109:8081',
      scriptURL: 'http://10.0.0.1:8081/index.bundle',
      isDev: true,
    });

    assert.equal(url, `http://192.168.68.109:${API_PORT}`);
  });

  it('laisse toujours gagner une configuration explicite — sinon on ne pourrait plus viser une préproduction', () => {
    const url = resolveApiBaseUrl({
      configured: 'https://api.grrind.app',
      hostUri: '192.168.68.109:8081',
      scriptURL: undefined,
      isDev: true,
    });

    assert.equal(url, 'https://api.grrind.app');
  });

  it('retire la barre finale d’une adresse configurée — les chemins du contrat commencent déjà par /', () => {
    const url = resolveApiBaseUrl({
      configured: 'https://api.grrind.app/',
      hostUri: undefined,
      scriptURL: undefined,
      isDev: false,
    });

    assert.equal(url, 'https://api.grrind.app');
  });

  it('ignore une variable vide ou blanche, qu’un .env commenté à moitié laisse traîner', () => {
    const url = resolveApiBaseUrl({
      configured: '   ',
      hostUri: '192.168.68.109:8081',
      scriptURL: undefined,
      isDev: true,
    });

    assert.equal(url, `http://192.168.68.109:${API_PORT}`);
  });

  it('ne déduit jamais rien hors développement : un build de production sans adresse échoue sur place', () => {
    const url = resolveApiBaseUrl({
      configured: undefined,
      hostUri: '192.168.68.109:8081',
      scriptURL: undefined,
      isDev: false,
    });

    assert.equal(url, `http://localhost:${API_PORT}`);
  });

  it('retombe sur localhost sans serveur de développement — le cas du simulateur', () => {
    const url = resolveApiBaseUrl({
      configured: undefined,
      hostUri: undefined,
      scriptURL: undefined,
      isDev: true,
    });

    assert.equal(url, `http://localhost:${API_PORT}`);
  });
});
