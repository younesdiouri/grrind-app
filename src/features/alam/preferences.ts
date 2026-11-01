import type { Client } from 'openapi-fetch';
import type { components, paths } from '@/api/schema';
import { messageFor, type Failure } from '../auth/problems.ts';
import type { ActionKeys } from '../shop/actionKeys.ts';
import { createConfirmedAction } from './confirmedAction.ts';

type Scope = { playerId: string; guildId: string; membershipJoinedAt: components['schemas']['GuildMember']['joinedAt'] };
type Registration = Scope & components['schemas']['AlamRegistrationRequest'];
type Difficulty = Scope & { runId: string } & components['schemas']['AlamDifficultyRequest'];

export function preferenceIsDefinitive(failure: Failure): boolean {
  return failure.kind === 'problem' && [
    'https://grrind.app/problems/alam-difficulty-closed',
    'https://grrind.app/problems/alam-difficulty-forbidden',
    'https://grrind.app/problems/forbidden',
    'https://grrind.app/problems/guild-not-found',
    'https://grrind.app/problems/idempotency-key-reused',
    'https://grrind.app/problems/validation-failed',
  ].includes(failure.problem.type);
}

export function preferenceMessage(failure: Failure): string {
  if (failure.kind === 'problem') {
    if (failure.problem.type === 'https://grrind.app/problems/idempotency-key-reused')
      return 'Cette modification n’a pas été appliquée. Vérifie l’état actualisé puis recommence.';
    if (failure.problem.type === 'https://grrind.app/problems/idempotency-key-in-flight')
      return 'Cette modification est déjà en cours. Réessaie dans un instant.';
  }
  return messageFor(failure);
}

/** Le corps fait partie de l’intention ; la difficulté reste attachée à son édition. */
export function createAlamPreferences(keys: ActionKeys, client: Pick<Client<paths>, 'PUT'>) {
  return {
    register: createConfirmedAction(keys, (input: Registration, key) => client.PUT('/api/guild/alam/registration', {
      params: { header: { 'Idempotency-Key': key } }, body: { registered: input.registered },
    }), preferenceIsDefinitive, (input) => `alam-registration:${input.playerId}:${input.guildId}:${input.membershipJoinedAt}:${input.registered}`),
    choose: createConfirmedAction(keys, (input: Difficulty, key) => client.PUT('/api/guild/alam/difficulty', {
      params: { header: { 'Idempotency-Key': key } }, body: { difficulty: input.difficulty },
    }), preferenceIsDefinitive, (input) => `alam-difficulty:${input.playerId}:${input.guildId}:${input.membershipJoinedAt}:${input.runId}:${input.difficulty}`),
  };
}
