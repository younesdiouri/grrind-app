import type { components } from '@/api/schema';

export type GuildInviteCode = components['schemas']['GuildInviteCode'];

/**
 * Les quatre états de l'écran du code d'invitation (#44).
 *
 * Le contrat ne sert **aucun** moyen de lire le code actif d'une guilde : les deux seules
 * routes sont `POST` (émettre, ce qui révoque le précédent) et `DELETE` (révoquer), jamais un
 * `GET`. L'écran ne connaît donc que ce qui s'est passé pendant cette visite — et c'est
 * exactement pour ça que **l'entrée et l'arrivée post-révocation sont deux états distincts**,
 * pas un seul :
 *
 * - `unknown` est l'état d'ouverture : l'écran n'a encore rien vu, il ne sait ni qu'un code
 *   existe, ni qu'il n'en existe pas. Un fondateur qui a émis un code hier et revient sur cet
 *   écran (l'app tuée, un autre onglet visité) le retrouve ici, avec un code qui tourne peut-
 *   être toujours côté serveur — dire « aucun code n'est actif » depuis cet état inventerait
 *   une fermeture qui n'existe pas.
 * - `none` est un fait acquis : la conséquence d'un `DELETE` réussi *pendant cette visite*.
 *   L'écran sait, cette fois, qu'il n'y a plus rien — il vient de le provoquer.
 *
 * `POST` révoque quoi qu'il en soit ce qui existait, et `DELETE` rend le même `204` qu'il y ait
 * ou non quelque chose à couper — l'écran reste donc correct sans jamais prétendre connaître un
 * état qu'il n'a pas, dans les deux directions.
 */
export type InviteCodeState =
  | { kind: 'unknown' }
  | { kind: 'none' }
  | { kind: 'active'; code: GuildInviteCode }
  | { kind: 'regenerated'; code: GuildInviteCode };

/** L'état d'ouverture de l'écran : rien n'a encore été vu pendant cette visite. */
export const UNKNOWN_INVITE_CODE: InviteCodeState = { kind: 'unknown' };

/** L'état d'arrivée d'une révocation réussie : cette fois, l'absence de code est un fait vu. */
export const NO_INVITE_CODE: InviteCodeState = { kind: 'none' };

/**
 * La table de `POST /api/guilds/{id}/invite-code`.
 *
 * Depuis `unknown` ou `none` — les deux états où l'écran n'a **aucun** code sous les yeux —
 * émettre rend un code *actif* : il n'y a rien de connu à couper, donc rien à annoncer comme
 * révoqué. Ce n'est vrai que depuis `active` ou `regenerated`, où l'écran a réellement affiché
 * le code précédent : là seulement, émettre en coupe un qu'on a vu, et le résultat est
 * *régénéré*. La distinction ne change rien au geste, identique dans tous les cas ; elle sert
 * uniquement l'écran, qui doit dire **avant l'appui** ce qui est en jeu, et confirmer
 * **après** ce qui a été coupé — jamais plus que ce qu'il sait.
 */
export function inviteCodeIssued(previous: InviteCodeState, code: GuildInviteCode): InviteCodeState {
  return previous.kind === 'active' || previous.kind === 'regenerated'
    ? { kind: 'regenerated', code }
    : { kind: 'active', code };
}

/**
 * La table de `DELETE /api/guilds/{id}/invite-code` : un seul état d'arrivée, qu'il y ait eu
 * ou non un code à couper, et quel que soit l'état de départ — `unknown` y compris, révoquer
 * étant le geste sûr quand on ne sait pas. Le `204` idempotent du serveur n'a pas de deuxième
 * forme à distinguer ici.
 */
export function inviteCodeRevoked(): InviteCodeState {
  return NO_INVITE_CODE;
}
