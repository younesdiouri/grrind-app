import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  inviteCodeIssued,
  inviteCodeRevoked,
  NO_INVITE_CODE,
  UNKNOWN_INVITE_CODE,
  type GuildInviteCode,
  type InviteCodeState,
} from './inviteCodeState.ts';

function code(overrides: Partial<GuildInviteCode> = {}): GuildInviteCode {
  return { code: 'K7QM3XPB', expiresAt: '2026-08-18T18:00:00Z', ...overrides };
}

/**
 * La table des quatre états, prouvée plutôt que relue à l'œil — le contrat n'offre aucun
 * `GET` pour la vérifier autrement : voir `inviteCodeState.ts`.
 */
describe('la table du code d’invitation', () => {
  it('un code émis depuis l’état d’entrée devient « actif », pas « régénéré » — rien de connu n’a été coupé', () => {
    const state = inviteCodeIssued(UNKNOWN_INVITE_CODE, code());

    assert.deepEqual(state, { kind: 'active', code: code() });
  });

  it('un code émis depuis « aucun code actif » (après une révocation) devient « actif », pas « régénéré »', () => {
    const state = inviteCodeIssued(NO_INVITE_CODE, code());

    assert.deepEqual(state, { kind: 'active', code: code() });
  });

  it('émettre depuis un code déjà actif rend un code régénéré', () => {
    const previous: InviteCodeState = { kind: 'active', code: code({ code: 'ANCIEN01' }) };
    const next = code({ code: 'NOUVEAU1' });

    assert.deepEqual(inviteCodeIssued(previous, next), { kind: 'regenerated', code: next });
  });

  it('émettre depuis un code déjà régénéré reste régénéré — le geste est le même', () => {
    const previous: InviteCodeState = { kind: 'regenerated', code: code({ code: 'ANCIEN01' }) };
    const next = code({ code: 'NOUVEAU2' });

    assert.deepEqual(inviteCodeIssued(previous, next), { kind: 'regenerated', code: next });
  });

  it('révoquer depuis l’état d’entrée ramène à « aucun code actif », le geste restant sûr sans rien savoir', () => {
    assert.deepEqual(inviteCodeRevoked(), { kind: 'none' });
  });

  it('révoquer ramène à « aucun code actif », qu’il y ait eu ou non un code à couper', () => {
    // La fonction ne prend même pas l'état de départ en paramètre : révoquer un code actif ou
    // révoquer deux fois de suite rendent le même résultat, sans distinction — exactement ce
    // que le contrat garantit côté serveur avec un même 204 dans les deux cas.
    assert.deepEqual(inviteCodeRevoked(), { kind: 'none' });
  });
});
