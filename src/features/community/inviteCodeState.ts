import type { components } from '@/api/schema';

export type GuildInviteCode = components['schemas']['GuildInviteCode'];

/**
 * Les trois états de l'écran du code d'invitation (#44).
 *
 * Le contrat ne sert **aucun** moyen de lire le code actif d'une guilde : les deux seules
 * routes sont `POST` (émettre, ce qui révoque le précédent) et `DELETE` (révoquer), jamais un
 * `GET`. L'écran ne connaît donc que ce qui s'est passé pendant cette visite — un fondateur
 * qui revient après avoir quitté l'écran (l'app tuée, un autre onglet visité) le retrouve sur
 * `none`, même si un code tourne encore côté serveur. Ce n'est pas une lacune à combler ici :
 * `POST` révoque quoi qu'il en soit ce qui existait, et `DELETE` rend le même `204` qu'il y
 * ait ou non quelque chose à couper — l'écran reste donc correct sans jamais prétendre
 * connaître un état qu'il n'a pas.
 */
export type InviteCodeState =
  | { kind: 'none' }
  | { kind: 'active'; code: GuildInviteCode }
  | { kind: 'regenerated'; code: GuildInviteCode };

export const NO_INVITE_CODE: InviteCodeState = { kind: 'none' };

/**
 * La table de `POST /api/guilds/{id}/invite-code` : émettre depuis `none` rend un code
 * *actif*, l'émettre alors qu'un code était déjà connu — actif ou déjà régénéré — rend un
 * code *régénéré*. La distinction ne change rien au geste, identique dans les deux cas ; elle
 * sert uniquement l'écran, qui doit dire **avant l'appui** que régénérer coupe le précédent,
 * et confirmer **après** qu'il ne mène plus nulle part — un premier code, lui, n'a rien
 * révoqué.
 */
export function inviteCodeIssued(previous: InviteCodeState, code: GuildInviteCode): InviteCodeState {
  return previous.kind === 'none' ? { kind: 'active', code } : { kind: 'regenerated', code };
}

/**
 * La table de `DELETE /api/guilds/{id}/invite-code` : un seul état d'arrivée, qu'il y ait eu
 * ou non un code à couper. Le `204` idempotent du serveur n'a pas de deuxième forme à
 * distinguer ici.
 */
export function inviteCodeRevoked(): InviteCodeState {
  return NO_INVITE_CODE;
}
