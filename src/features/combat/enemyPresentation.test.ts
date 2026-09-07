import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enemyArtworkOf } from './enemyPresentation.ts';

describe('présentation de l’adversaire fournie par le serveur', () => {
  it('utilise les trois URLs du combat, indépendamment du nom ou de la clé', () => {
    const imageUrls = { idle: 'https://game.test/rest.png', attack: 'https://game.test/strike.png', hit: 'https://game.test/hurt.png' };
    assert.deepEqual(enemyArtworkOf({ name: 'Un autre adversaire', imageUrls }), {
      name: 'Un autre adversaire',
      poses: { idle: { uri: imageUrls.idle }, attack: { uri: imageUrls.attack }, hit: { uri: imageUrls.hit } },
    });
  });
  it('laisse les anciennes réponses et les packs absents sans illustration', () => {
    assert.equal(enemyArtworkOf({ name: 'Ancien ennemi' }), undefined);
    assert.equal(enemyArtworkOf({ name: 'Sans images', imageUrls: null }), undefined);
  });
  it('ne lance pas un pack incomplet ou une URI inutilisable', () => {
    assert.equal(enemyArtworkOf({ name: 'Incomplet', imageUrls: { idle: 'https://game.test/idle.png', attack: '', hit: 'https://game.test/hit.png' } }), undefined);
    assert.equal(enemyArtworkOf({ name: 'Local', imageUrls: { idle: 'file:///private/image.png', attack: 'https://game.test/a.png', hit: 'https://game.test/h.png' } }), undefined);
  });
});
