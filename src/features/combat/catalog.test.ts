import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogFor, type Enemy } from './catalog.ts';

function enemy(overrides: Partial<Enemy>): Enemy {
  return {
    key: 'SAND_JACKAL',
    name: 'Chacal des sables',
    minimumLevel: 1,
    hp: 120,
    damage: 12,
    mitigationPercent: 5,
    extraTurnPercent: 4,
    dodgePercent: 3,
    ...overrides,
  };
}

/**
 * Le catalogue réellement servi par le back sous l'équilibrage `config/game/v1/`, dans son
 * ordre — six ennemis ordinaires puis quatre boss. Il n'est pas là pour faire joli : c'est
 * lui qui porte le doublon de `minimumLevel: 10` entre `IRON_JACKAL` et `DUNE_SOVEREIGN`,
 * celui sur lequel on serait tenté de deviner qui est un boss.
 */
const SHIPPED: Enemy[] = [
  enemy({ key: 'SAND_JACKAL', minimumLevel: 1 }),
  enemy({ key: 'DUNE_RAIDER', minimumLevel: 5 }),
  enemy({ key: 'IRON_JACKAL', minimumLevel: 10 }),
  enemy({ key: 'STORM_HYENA', minimumLevel: 20 }),
  enemy({ key: 'OBSIDIAN_WOLF', minimumLevel: 30 }),
  enemy({ key: 'ASH_TITAN', minimumLevel: 50 }),
  enemy({ key: 'DUNE_SOVEREIGN', minimumLevel: 10 }),
  enemy({ key: 'STORM_MATRIARCH', minimumLevel: 20 }),
  enemy({ key: 'OBSIDIAN_WARLORD', minimumLevel: 30 }),
  enemy({ key: 'CINDER_SOVEREIGN', minimumLevel: 50 }),
];

describe('le catalogue des adversaires', () => {
  it('verrouille au-dessus du niveau du joueur, et pas à son niveau', () => {
    const entries = catalogFor(
      [enemy({ key: 'A', minimumLevel: 9 }), enemy({ key: 'B', minimumLevel: 10 }), enemy({ key: 'C', minimumLevel: 11 })],
      10,
    );

    assert.deepEqual(
      entries.map((entry) => entry.locked),
      [false, false, true],
      'le niveau requis atteint suffit — c’est aussi la borne que le serveur applique',
    );
  });

  it('garde l’ordre servi, sans jamais remonter les accessibles', () => {
    const entries = catalogFor(SHIPPED, 10);

    assert.deepEqual(
      entries.map((entry) => entry.enemy.key),
      SHIPPED.map((e) => e.key),
      'l’ordre est la seule information de structure que le contrat donne',
    );
  });

  it('laisse visible ce qui est hors de portée — un joueur de niveau 1 voit les dix', () => {
    const entries = catalogFor(SHIPPED, 1);

    assert.equal(entries.length, 10);
    assert.equal(entries.filter((entry) => entry.locked).length, 9);
  });

  it('n’invente aucune distinction entre un boss et un ennemi ordinaire', () => {
    const entries = catalogFor(SHIPPED, 10);

    // `IRON_JACKAL` et `DUNE_SOVEREIGN` partagent `minimumLevel: 10`, et c'est exactement le
    // doublon qui rendrait l'heuristique tentante. Les deux entrées se ressemblent en tout
    // point après passage : même forme, même verrou, aucun drapeau. Le jour où quelqu'un
    // ajoute un `boss: true` déduit du doublon, ce test tombe.
    const [iron] = entries.filter((entry) => entry.enemy.key === 'IRON_JACKAL');
    const [sovereign] = entries.filter((entry) => entry.enemy.key === 'DUNE_SOVEREIGN');

    assert.deepEqual(Object.keys(iron).sort(), ['enemy', 'locked']);
    assert.deepEqual(Object.keys(sovereign).sort(), ['enemy', 'locked']);
    assert.equal(iron.locked, sovereign.locked);
  });

  it('rend une liste vide sur un catalogue vide, sans inventer de repli', () => {
    assert.deepEqual(catalogFor([], 12), []);
  });
});
