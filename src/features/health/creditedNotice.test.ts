import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import type { SyncSummary } from '@/features/reward/timeline';

import { creditedNotice } from './creditedNotice.ts';

/**
 * Le texte de la notification, éprouvé sur les **réponses réelles** du back — comme la
 * timeline, et pour une raison plus forte encore : une notification fausse demande une vraie
 * séance, une vraie montre et un vrai réveil système pour se reproduire. Elle ne se débogue
 * pas à la demande.
 *
 * Les fixtures se lisent depuis le disque plutôt que par `import` : `node --test` efface les
 * types mais ne résout pas l'alias `@/`.
 */
function fixture(name: string): SyncSummary {
  return JSON.parse(
    readFileSync(new URL(`../../../fixtures/sync-summary/${name}.json`, import.meta.url), 'utf8'),
  ) as SyncSummary;
}

describe('la notification de séance comptée', () => {
  it('ne dit rien quand rien n’a été crédité', () => {
    // `tout-ecarte` : cinq séances lues, aucune créditée, `totals` à `null`. Notifier ici
    // transformerait le cas nominal — tout était déjà compté — en événement.
    assert.equal(creditedNotice(fixture('tout-ecarte')), null);
  });

  it('nomme la séance et son gain quand il n’y en a qu’une', () => {
    const notice = creditedNotice(fixture('un-workout'));
    assert.ok(notice !== null);

    const summary = fixture('un-workout');
    assert.match(notice.body, new RegExp(`${summary.totals?.xpAwarded} XP`));
    assert.ok(notice.body.includes('séance de'), 'la discipline est nommée, pas son enum');
  });

  it('annonce le palier franchi, parce que c’est ce qui fait ouvrir l’app', () => {
    const summary = fixture('trois-workouts');
    const notice = creditedNotice(summary);
    assert.ok(notice !== null);

    assert.ok(summary.totals !== null && summary.totals.levelAfter > summary.totals.levelBefore);
    assert.match(notice.body, new RegExp(`Niveau ${summary.totals?.levelAfter}`));
  });

  it('compte le lot sans le détailler', () => {
    const summary = fixture('quinze-workouts');
    const notice = creditedNotice(summary);
    assert.ok(notice !== null);

    assert.equal(notice.title, `${summary.totals?.workoutCount} séances comptées`);
    assert.match(notice.body, new RegExp(`\\+${summary.totals?.xpAwarded} XP`));
  });

  it('n’écrit jamais « +0 XP » : une séance sans XP n’est pas une panne', () => {
    // La marche ne rapporte pas d'expérience et n'alimente que Vitality
    // (`grrind-back#167`) : elle est bien créditée, `totals` existe, `xpAwarded` vaut zéro.
    const base = fixture('un-workout');
    const summary: SyncSummary = {
      ...base,
      totals: { ...base.totals!, xpAwarded: 0, levelBefore: 3, levelAfter: 3, workoutCount: 1 },
    };

    const notice = creditedNotice(summary);
    assert.ok(notice !== null);
    // Pas de chiffre d'expérience du tout — ni « 0 XP », ni « +0 ». La durée de la séance,
    // elle, garde ses chiffres : c'est l'XP qu'on refuse d'annoncer à zéro, pas les nombres.
    assert.ok(!notice.body.includes('XP'), `« ${notice.body} » ne doit pas parler d’XP`);
  });
});
