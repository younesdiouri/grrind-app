import type { Failure } from '@/features/auth/problems';

/**
 * La guilde qu'on regardait a disparu — le fondateur l'a dissoute pendant le
 * tirer-pour-rafraîchir de `GET /api/guilds/{id}` (voir `refreshGuild` dans
 * `guildActions.ts`). Ce n'est pas une panne parmi d'autres : c'est le seul refus qui doit
 * ramener l'écran à l'invitation plutôt que de simplement se plaindre.
 *
 * Pure, sans `@/api/client` : c'est ce qui permet de la prouver dans `guildRefresh.test.ts`
 * sous `node --test`, qui ne sait pas résoudre les modules natifs qu'importe le client HTTP.
 */
export function isGuildGone(failure: Failure): boolean {
  return (
    failure.kind === 'problem' && failure.problem.type === 'https://grrind.app/problems/guild-not-found'
  );
}
