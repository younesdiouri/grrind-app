import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  BEATS,
  BUDGET,
  buildBattleTimeline,
  TEMPO_CEILING,
  TEMPO_FLOOR,
  tempoFor,
  type Battle,
  type BattleEvent,
  type Ramp,
} from './timeline.ts';

/**
 * Les fixtures se lisent depuis le disque plutôt que par `import`, exactement comme le banc du
 * `SyncSummary` : `node --test` efface les types mais ne résout pas l'alias `@/`, et un import
 * JSON y réclamerait une clause `with { type: 'json' }` que Metro, lui, ne veut pas. Passer par
 * `features/combat/fixtures.ts` ferait entrer les deux contraintes en collision — ce module-là
 * existe pour l'app, ce banc-ci lit les mêmes fichiers directement.
 */
function fixture(name: string): Battle {
  return JSON.parse(
    readFileSync(new URL(`../../../fixtures/battle/${name}.json`, import.meta.url), 'utf8'),
  ) as Battle;
}

const FIXTURES: [string, Battle][] = [
  ['victoire', fixture('victoire')],
  ['defaiteBoss', fixture('defaite-boss')],
  ['combatLong', fixture('combat-long')],
];

const defaiteBoss = FIXTURES[1][1];

/** Les derniers points de vie du joueur d'après les événements, sans une soustraction. */
function timelineHpLeft(battle: Battle): number {
  const taken = battle.events.filter(
    (event) => event.type === 'ATTACK' && event.attacker === 'ENEMY',
  );

  return taken.length === 0 ? battle.player.hp : (taken[taken.length - 1].targetHpRemaining ?? 0);
}

/** La valeur d'une rampe à un instant, par interpolation linéaire — ce que fait `interpolate`. */
function valueAt(ramp: Ramp, t: number): number {
  if (t <= ramp.input[0]) {
    return ramp.output[0];
  }

  for (let i = 1; i < ramp.input.length; i += 1) {
    if (t <= ramp.input[i]) {
      const span = ramp.input[i] - ramp.input[i - 1];
      const progress = span === 0 ? 1 : (t - ramp.input[i - 1]) / span;
      return ramp.output[i - 1] + (ramp.output[i] - ramp.output[i - 1]) * progress;
    }
  }

  return ramp.output[ramp.output.length - 1];
}

/**
 * Un combat fabriqué de toutes pièces, pour les cas que l'équilibrage ne produit pas.
 *
 * Ce n'est **pas** une fixture et ça n'a pas sa place dans `fixtures/battle/` : c'est une
 * entrée de fonction pure, construite pour un test, et elle ne prétend à aucun moment être une
 * réponse du serveur. La distinction est celle que `fixtures.ts` explique.
 */
function fabricated(attacks: number): Battle {
  const events: BattleEvent[] = [{ type: 'BATTLE_STARTED', playerHp: 10_000, enemyHp: 10_000 }];

  for (let i = 0; i < attacks; i += 1) {
    events.push({
      type: 'ATTACK',
      attacker: i % 2 === 0 ? 'PLAYER' : 'ENEMY',
      damage: 1,
      mitigated: 0,
      targetHpRemaining: 10_000 - Math.floor(i / 2) - 1,
    });
  }

  events.push({ type: 'BATTLE_FINISHED', result: 'VICTORY' });

  return {
    id: '00000000-0000-0000-0000-000000000000',
    result: 'VICTORY',
    turns: attacks,
    foughtAt: '2026-08-29T15:00:00+00:00',
    player: { hp: 10_000, damage: 1, mitigationPercent: 0, extraTurnPercent: 0, dodgePercent: 0 },
    enemy: {
      key: 'SAND_JACKAL',
      name: 'Chacal des sables',
      hp: 10_000,
      damage: 1,
      mitigationPercent: 0,
      extraTurnPercent: 0,
      dodgePercent: 0,
    },
    events,
    // Sans intérêt pour la timeline testée ici — elle ne joue que `events` — mais requis
    // depuis #124 : un gain nul, la forme la plus fréquente d'une `BattleReward`.
    rewards: { loot: [], coins: { gained: 0, before: 0, after: 0 } },
  };
}

describe('la timeline d’un combat, sur les fixtures capturées', () => {
  for (const [name, battle] of FIXTURES) {
    describe(name, () => {
      const timeline = buildBattleTimeline(battle);

      it('joue les battements dans l’ordre exact des événements', () => {
        // Aucun tri, aucun regroupement : l'ordre de la liste est un contrat côté serveur, et
        // le seul moyen de le tenir est de ne rien faire. Ce test tombe si quelqu'un « range ».
        const expected = battle.events.map((event) => {
          switch (event.type) {
            case 'BATTLE_STARTED':
              return 'opening';
            case 'BATTLE_FINISHED':
              return 'verdict';
            case 'ATTACK':
              return 'attack';
            case 'DODGE':
              return 'dodge';
            default:
              return 'extraTurn';
          }
        });

        assert.deepEqual(
          timeline.beats.map((beat) => beat.kind),
          expected,
        );
      });

      it('enchaîne les battements sans trou ni chevauchement', () => {
        let cursor = 0;

        for (const beat of timeline.beats) {
          assert.equal(beat.at, cursor, `${beat.kind} ne reprend pas où le précédent s’arrête`);
          assert.ok(beat.until > beat.at, `${beat.kind} ne dure rien`);
          cursor = beat.until;
        }

        // La durée totale est la somme des battements : c'est elle que le saut fait atteindre,
        // et un écart s'y verrait comme un écran figé à la fin.
        assert.equal(timeline.duration, cursor);
      });

      it('ne fait jamais remonter les points de vie', () => {
        for (const ramp of [timeline.player.hp, timeline.enemy.hp]) {
          for (let i = 1; i < ramp.output.length; i += 1) {
            assert.ok(
              ramp.output[i] <= ramp.output[i - 1],
              `une barre remonte de ${ramp.output[i - 1]} à ${ramp.output[i]}`,
            );
          }
        }
      });

      it('garde des instants strictement croissants — `interpolate` l’exige', () => {
        const ramps = [timeline.player, timeline.enemy].flatMap((side) => [
          side.hp,
          side.damage,
          side.mitigated,
          side.damageFlash,
          side.mitigatedFlash,
          side.dodgeFlash,
          side.extraFlash,
        ]);

        for (const ramp of ramps) {
          for (let i = 1; i < ramp.input.length; i += 1) {
            assert.ok(ramp.input[i] > ramp.input[i - 1], 'deux points au même instant');
          }
        }
      });

      it('part des points de vie de départ et finit sur une issue cohérente', () => {
        assert.equal(valueAt(timeline.player.hp, 0), battle.player.hp);
        assert.equal(valueAt(timeline.enemy.hp, 0), battle.enemy.hp);

        const playerEnd = valueAt(timeline.player.hp, timeline.duration);
        const enemyEnd = valueAt(timeline.enemy.hp, timeline.duration);

        if (battle.result === 'VICTORY') {
          assert.equal(enemyEnd, 0, 'un adversaire vaincu finit à zéro');
          assert.ok(playerEnd > 0, 'le vainqueur reste debout');
        } else {
          assert.equal(playerEnd, 0);
          assert.ok(enemyEnd > 0);
        }
      });

      it('ne bouge aucune barre pendant une esquive', () => {
        const dodges = timeline.beats.filter((beat) => beat.kind === 'dodge');

        for (const dodge of dodges) {
          assert.equal(
            valueAt(timeline.player.hp, dodge.at),
            valueAt(timeline.player.hp, dodge.until),
            'les points de vie du joueur ont bougé pendant une esquive',
          );
          assert.equal(
            valueAt(timeline.enemy.hp, dodge.at),
            valueAt(timeline.enemy.hp, dodge.until),
            'les points de vie de l’adversaire ont bougé pendant une esquive',
          );
        }
      });

      it('joue l’esquive chez la cible, jamais chez l’attaquant', () => {
        for (const beat of timeline.beats) {
          if (beat.kind === 'dodge') {
            assert.notEqual(beat.dodger, beat.attacker);
          }
        }
      });

      it('allume l’éclat du dégât chez celui qui encaisse, jamais chez l’attaquant', () => {
        for (const beat of timeline.beats) {
          if (beat.kind !== 'attack') {
            continue;
          }

          const taking = beat.attacker === 'PLAYER' ? timeline.enemy : timeline.player;
          const striking = beat.attacker === 'PLAYER' ? timeline.player : timeline.enemy;
          const peak = beat.at + Math.round((beat.until - beat.at) / 3);

          assert.equal(valueAt(taking.damageFlash, peak), 1);
          assert.equal(valueAt(striking.damageFlash, peak), 0);
          assert.equal(valueAt(taking.damage, peak), beat.damage);
        }
      });

      it('n’allume la part absorbée que lorsqu’il y a une armure', () => {
        for (const beat of timeline.beats) {
          if (beat.kind !== 'attack') {
            continue;
          }

          const taking = beat.attacker === 'PLAYER' ? timeline.enemy : timeline.player;
          const peak = beat.at + Math.round((beat.until - beat.at) / 3);

          // « dont 0 absorbés » dirait le contraire de ce qui se passe : sans Endurance, il
          // n'y a rien à annoncer. `victoire` n'a aucune mitigation des deux côtés.
          assert.equal(valueAt(taking.mitigatedFlash, peak), beat.mitigated > 0 ? 1 : 0);
        }
      });

      it('allume l’éclat de l’esquive chez l’esquiveur, jamais chez l’attaquant', () => {
        for (const beat of timeline.beats) {
          if (beat.kind !== 'dodge') {
            continue;
          }

          const dodging = beat.dodger === 'PLAYER' ? timeline.player : timeline.enemy;
          const striking = beat.attacker === 'PLAYER' ? timeline.player : timeline.enemy;
          const peak = beat.at + Math.round((beat.until - beat.at) / 3);

          assert.equal(valueAt(dodging.dodgeFlash, peak), 1);
          assert.equal(valueAt(striking.dodgeFlash, peak), 0);
        }
      });

      it('éteint tous les éclats au départ comme à l’arrivée', () => {
        for (const side of [timeline.player, timeline.enemy]) {
          for (const flash of [side.damageFlash, side.mitigatedFlash, side.dodgeFlash, side.extraFlash]) {
            assert.equal(valueAt(flash, 0), 0);
            assert.equal(valueAt(flash, timeline.duration), 0, 'un éclat reste allumé à la fin');
          }
        }
      });

      it('ne fait vibrer que sur les coups qui portent', () => {
        const attacks = timeline.beats.filter((beat) => beat.kind === 'attack');
        assert.equal(timeline.blows.length, attacks.length);
      });

      it('laisse le verdict courir jusqu’au bout, sans rien après lui', () => {
        const last = timeline.beats[timeline.beats.length - 1];

        assert.equal(last.kind, 'verdict');
        assert.equal(last.until, timeline.duration);
        assert.equal(last.kind === 'verdict' ? last.result : null, battle.result);
      });
    });
  }
});

describe('le bilan que l’écran de fin raconte', () => {
  for (const [name, battle] of FIXTURES) {
    describe(name, () => {
      const { tally } = buildBattleTimeline(battle);

      it('prend le nombre de tours du serveur, sans le recompter', () => {
        // Un tour n'est pas un événement — un tour supplémentaire en produit deux — et le
        // recompter ici serait réimplémenter une règle du jeu.
        assert.equal(tally.turns, battle.turns);
      });

      it('compte chaque coup une fois et une seule, du bon côté', () => {
        const attacks = battle.events.filter((event) => event.type === 'ATTACK');
        const byPlayer = attacks.filter((event) => event.attacker === 'PLAYER');

        assert.equal(tally.blowsLanded, byPlayer.length);
        assert.equal(tally.blowsTaken, attacks.length - byPlayer.length);
      });

      it('somme les dégâts portés et encaissés séparément', () => {
        const sum = (side: 'PLAYER' | 'ENEMY') =>
          battle.events
            .filter((event) => event.type === 'ATTACK' && event.attacker === side)
            .reduce((total, event) => total + (event.damage ?? 0), 0);

        assert.equal(tally.damageDealt, sum('PLAYER'));
        assert.equal(tally.damageTaken, sum('ENEMY'));
      });

      it('finit sur les points de vie que le serveur a écrits, jamais sur une soustraction', () => {
        assert.equal(tally.hpLeft, timelineHpLeft(battle));

        if (battle.result === 'DEFEAT') {
          assert.equal(tally.hpLeft, 0, 'un joueur vaincu ne garde rien');
        } else {
          assert.ok(tally.hpLeft > 0);
        }
      });

      it('retient le dernier coup porté, celui qui a conclu', () => {
        const attacks = battle.events.filter((event) => event.type === 'ATTACK');
        const last = attacks[attacks.length - 1];

        assert.deepEqual(tally.lastBlow, { by: last.attacker, damage: last.damage });
      });

      it('range les esquives et les relances du côté de qui en a bénéficié', () => {
        const dodges = battle.events.filter((event) => event.type === 'DODGE');
        const extras = battle.events.filter((event) => event.type === 'EXTRA_TURN');

        // Une esquive est portée par l'attaquant dans le contrat : l'esquiveur est l'autre.
        assert.equal(tally.dodges, dodges.filter((event) => event.attacker === 'ENEMY').length);
        assert.equal(tally.dodgesConceded, dodges.filter((event) => event.attacker === 'PLAYER').length);

        assert.equal(tally.extraTurns, extras.filter((event) => event.actor === 'PLAYER').length);
        assert.equal(tally.extraTurnsConceded, extras.filter((event) => event.actor === 'ENEMY').length);
        assert.equal(tally.dodges + tally.dodgesConceded, dodges.length);
        assert.equal(tally.extraTurns + tally.extraTurnsConceded, extras.length);
      });
    });
  }

  it('n’a rien à raconter d’un combat sans le moindre coup', () => {
    // Le serveur n'en produit pas, mais la fonction est pure et doit tenir sur son entrée
    // vide plutôt que de rendre un `lastBlow` inventé.
    const { tally } = buildBattleTimeline(fabricated(0));

    assert.equal(tally.lastBlow, null);
    assert.equal(tally.damageDealt, 0);
    assert.equal(tally.blowsLanded, 0);
  });
});

describe('l’ordre de cause à effet du tour supplémentaire', () => {
  it('tombe entre le coup qui l’a déclenché et celui qu’il accorde', () => {
    // Le serveur émet `EXTRA_TURN` **après** l'attaque qui l'a déclenché et **avant** celle
    // qu'il accorde : le client anime la cause puis l'effet, et l'inverse ferait apparaître un
    // tour bonus venu de nulle part. `defaiteBoss` en porte trois.
    const timeline = buildBattleTimeline(defaiteBoss);
    const extras = timeline.beats.filter((beat) => beat.kind === 'extraTurn');

    assert.ok(extras.length > 0, 'la fixture doit porter au moins un tour supplémentaire');

    for (const extra of extras) {
      const position = timeline.beats.indexOf(extra);
      const before = timeline.beats[position - 1];
      const after = timeline.beats[position + 1];

      assert.ok(
        before.kind === 'attack' || before.kind === 'dodge',
        'un tour supplémentaire suit toujours un tour joué',
      );
      assert.ok(after !== undefined, 'un tour supplémentaire n’est jamais le dernier battement');
      assert.ok(extra.at >= before.until && after.at >= extra.until);
    }
  });
});

describe('le tempo', () => {
  it('reste au plafond sur un combat court — il ne traîne pas', () => {
    assert.equal(tempoFor(6), TEMPO_CEILING);
  });

  it('descend au plancher sur un combat de deux cents tours — il ne stroboscope pas', () => {
    assert.equal(tempoFor(400), TEMPO_FLOOR);
  });

  it('écoule le budget entre les deux bornes', () => {
    // 45 échanges : 9000 / 45 = 200 ms, entre le plancher et le plafond. C'est la zone où le
    // budget décide réellement, et elle commence juste au-delà du plus long combat capturable.
    assert.equal(tempoFor(45), Math.round(BUDGET / 45));
    assert.ok(tempoFor(45) > TEMPO_FLOOR && tempoFor(45) < TEMPO_CEILING);
  });

  it('assume de dépasser le budget plutôt que de devenir illisible', () => {
    // Au plancher, un combat de deux cents tours dure une minute — c'est écrit dans le ticket
    // et ce test le fige : le rattrapage est le saut, pas un condensé.
    const timeline = buildBattleTimeline(fabricated(400));

    assert.ok(
      timeline.duration > BUDGET,
      'un combat au plancher dépasse le budget, et c’est la décision',
    );
    assert.equal(timeline.tempo, TEMPO_FLOOR);
  });

  it('garde son temps plein au dernier échange, quel que soit le tempo', () => {
    for (const attacks of [6, 400]) {
      const timeline = buildBattleTimeline(fabricated(attacks));
      const exchanges = timeline.beats.filter((beat) => beat.kind === 'attack');
      const last = exchanges[exchanges.length - 1];

      assert.equal(
        last.until - last.at,
        Math.max(timeline.tempo, BEATS.finalBlow),
        'le coup qui conclut ne se joue pas à la vitesse du reste',
      );
    }
  });

  it('donne son temps propre à l’ouverture, hors tempo', () => {
    const timeline = buildBattleTimeline(fabricated(400));
    const opening = timeline.beats[0];

    assert.equal(opening.kind, 'opening');
    assert.equal(opening.until - opening.at, BEATS.opening);
  });
});
