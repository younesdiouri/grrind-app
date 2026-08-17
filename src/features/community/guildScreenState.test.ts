import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Failure, ProblemDetails } from '@/features/auth/problems';
import { guildScreenStateFrom, type Guild, type GuildDetail } from './guildScreenState.ts';

function guild(overrides: Partial<Guild> = {}): Guild {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Les Increvables',
    createdAt: '2026-01-01T00:00:00Z',
    memberCount: 1,
    capacity: 30,
    role: 'FOUNDER',
    ...overrides,
  };
}

function detail(overrides: Partial<GuildDetail> = {}): GuildDetail {
  return { ...guild(), members: [], ...overrides };
}

function problem(type: ProblemDetails['type']): Failure {
  return { kind: 'problem', problem: { type, title: 'x', status: 0, detail: 'x' } };
}

/**
 * La table de priorité de `guildScreenStateFrom`, prouvée plutôt que relue à l'œil — c'est
 * précisément la lecture à l'œil qui a laissé passer le bug de revue sur #43 : `justResolved`
 * qui survit à une guilde dissoute et ramène `GuildMilestone` sur ce qui n'existe plus.
 */
describe('l’aiguillage de l’onglet Guilde', () => {
  it('le détail complet gagne toujours, même quand tout le reste est renseigné', () => {
    const state = guildScreenStateFrom({
      guildDetail: detail(),
      justResolved: guild({ id: 'autre' }),
      isPending: true,
      failure: problem('https://grrind.app/problems/guild-not-found'),
    });

    assert.deepEqual(state, { kind: 'roster', guild: detail() });
  });

  it('justResolved tient l’écran tant que le détail complet n’est pas encore arrivé', () => {
    const state = guildScreenStateFrom({
      guildDetail: null,
      justResolved: guild(),
      isPending: true,
      failure: problem('https://grrind.app/problems/internal-error'),
    });

    assert.deepEqual(state, { kind: 'milestone', guild: guild() });
  });

  it('un chargement ne compte que si aucune guilde n’est déjà disponible', () => {
    const state = guildScreenStateFrom({
      guildDetail: null,
      justResolved: null,
      isPending: true,
      failure: problem('https://grrind.app/problems/internal-error'),
    });

    assert.deepEqual(state, { kind: 'loading' });
  });

  it('une erreur porte le refus tel qu’il est arrivé, sans le déformer', () => {
    const failure = problem('https://grrind.app/problems/internal-error');
    const state = guildScreenStateFrom({
      guildDetail: null,
      justResolved: null,
      isPending: false,
      failure,
    });

    assert.deepEqual(state, { kind: 'error', failure });
  });

  it('sans guilde, sans chargement, sans erreur : la porte, pour les formulaires', () => {
    const state = guildScreenStateFrom({
      guildDetail: null,
      justResolved: null,
      isPending: false,
      failure: null,
    });

    assert.deepEqual(state, { kind: 'gate' });
  });

  // Le scénario exact de la revue : le fondateur dissout, le rafraîchissement le constate et
  // efface le cache *et* `justResolved` ensemble — les deux entrées de cette fonction
  // retombent à `null` au même moment, jamais l'une sans l'autre.
  it('une guilde dissoute pendant qu’on la regardait ramène à la porte, pas au jalon', () => {
    const state = guildScreenStateFrom({
      guildDetail: null,
      justResolved: null,
      isPending: false,
      failure: null,
    });

    assert.equal(state.kind, 'gate');
  });
});
