import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

// Les types viennent directement du schéma, pas de `guildActions.ts` ni de `useMyGuild.ts` :
// ces deux modules importent `@/api/client` au niveau du module, ce que ce fichier doit
// éviter pour rester prouvable sous `node --test` (voir `guildScreenState.test.ts`).
export type Guild = components['schemas']['Guild'];
export type GuildDetail = components['schemas']['GuildDetail'];

export type GuildScreenState =
  | { kind: 'roster'; guild: GuildDetail }
  | { kind: 'milestone'; guild: Guild }
  | { kind: 'loading' }
  | { kind: 'error'; failure: Failure }
  | { kind: 'gate' };

/**
 * L'aiguillage complet de l'onglet Guilde — une seule fonction, un seul ordre de priorité,
 * plutôt qu'une chaîne de `if` répartie dans le composant qu'on ne relit pas correctement à
 * l'œil. C'est exactement ce qui a laissé passer un bug en revue de #43 : `justResolved`
 * n'était jamais effacé par la disparition de la guilde, et une guilde dissoute pendant
 * qu'on la regardait ramenait indéfiniment `GuildMilestone` sur une guilde qui n'existait
 * plus. La correction n'est pas ici — elle est dans le composant, qui doit nettoyer les deux
 * sources ensemble — mais que la priorité soit prouvée sur une table plutôt que relue à l'œil
 * est ce qui doit empêcher que ça se reproduise.
 *
 * L'ordre est délibéré :
 *
 * 1. `guildDetail` gagne toujours : c'est la seule source qui porte `members`, donc la seule
 *    sur laquelle l'écran des membres peut se monter.
 * 2. `justResolved` ensuite : la réponse immédiate d'une fondation ou d'un ralliement, le
 *    temps très court que le cache de `/api/guilds/mine` converge vers le détail complet.
 * 3. `isPending`, puis `failure`, ne comptent que si ni l'un ni l'autre n'a de guilde à
 *    montrer — un chargement ou une erreur n'a de sens que pour la requête d'ouverture, pas
 *    pendant qu'un résultat déjà obtenu tient l'écran.
 * 4. Sinon, `gate` : pas de guilde, place aux formulaires de fondation et de ralliement.
 */
export function guildScreenStateFrom(params: {
  guildDetail: GuildDetail | null;
  justResolved: Guild | null;
  isPending: boolean;
  failure: Failure | null;
}): GuildScreenState {
  if (params.guildDetail !== null) {
    return { kind: 'roster', guild: params.guildDetail };
  }

  if (params.justResolved !== null) {
    return { kind: 'milestone', guild: params.justResolved };
  }

  if (params.isPending) {
    return { kind: 'loading' };
  }

  if (params.failure !== null) {
    return { kind: 'error', failure: params.failure };
  }

  return { kind: 'gate' };
}
