import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerIdentity } from '@/components/PlayerIdentity.tsx';
import { LeagueWeek } from '@/components/LeagueWeek.tsx';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar.ts';
import { LEAGUE_FIXTURE } from './leagueFixtures.ts';

test('l’identité garde la ligue indépendante du niveau et un repli propre au joueur', () => {
  for (const body of ['male', 'female'] as const) {
    for (const level of [1, 80]) {
      const markup = renderToStaticMarkup(createElement(PlayerIdentity, { player: {
        displayName: 'Alexandra au très long pseudonyme', title: null, level,
        avatar: { ...DEFAULT_AVATAR, body }, league: { tier: 'SILVER', tierOrder: 1, lootLuckPercent: 5 },
      } }));
      assert.match(markup, /Ligue Argent/);
      assert.match(markup, new RegExp(`Niveau ${level}`));
      assert.match(markup, /Portrait de Alexandra au très long pseudonyme/);
      assert.match(markup, /role="img"/);
      assert.doesNotMatch(markup, /Ma semaine|Titre inconnu|numberOfLines/);
    }
  }
});

test('le titre se lit intégralement et seule l’identité personnelle ouvre Ma semaine', () => {
  const markup = renderToStaticMarkup(createElement(PlayerIdentity, { onLeaguePress() {}, player: {
    displayName: 'Nora', title: { id: 'long', name: 'Celle qui court au-delà de toutes les montagnes', hint: '',
      unlocked: true, unlockedAt: null, progress: { current: 1, target: 1, unit: 'LEVELS' } },
    level: 12, avatar: DEFAULT_AVATAR, league: LEAGUE_FIXTURE.league,
  } }));
  assert.match(markup, /Celle qui court au-delà de toutes les montagnes/);
  assert.match(markup, /aria-label="Ligue Or · Ma semaine"/);
});

test('une échéance passée n’annonce pas une promotion et le dernier résultat reste stable au remontage', () => {
  const props = { state: LEAGUE_FIXTURE, now: Date.parse(LEAGUE_FIXTURE.weekEndsAt) };
  const render = () => renderToStaticMarkup(createElement(LeagueWeek, props));
  const markup = render();
  assert.match(markup, /Clôture en cours/);
  assert.doesNotMatch(markup, /Promotion provisoire|Félicitations/);
  assert.match(markup, /Promotion · Argent → Or/);
  assert.match(markup, /Chance de butin : \+10 points/);
  assert.match(markup, /Paris/);
  assert.equal(render(), markup);
});

test('promotion, maintien et relégation affichent la projection explicite', () => {
  for (const [movement, label] of [['PROMOTED', 'Promotion'], ['MAINTAINED', 'Maintien'], ['RELEGATED', 'Relégation']] as const) {
    const markup = renderToStaticMarkup(createElement(LeagueWeek, {
      state: { ...LEAGUE_FIXTURE, projectedMovement: movement, lastResult: null }, now: Date.parse(LEAGUE_FIXTURE.weekStartsAt),
    }));
    assert.match(markup, new RegExp(`${label} provisoire`));
    assert.doesNotMatch(markup, /DERNIER RÉSULTAT/);
  }
});
