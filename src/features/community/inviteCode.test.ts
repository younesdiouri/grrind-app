import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { INVITE_CODE_LENGTH, isCompleteInviteCode, sanitizeInviteCode } from './inviteCode.ts';

/**
 * Le banc du champ de code d'invitation.
 *
 * Ce qu'il prouve n'est pas que le code est valide — seul le serveur le sait, un 404
 * `invite-code-not-usable` couvrant aussi bien l'inconnu que l'expiré. Ce qu'il prouve, c'est
 * que le champ ne **refuse** jamais un collage sale : il nettoie casse et espaces, exactement
 * ce que le serveur normalise de son côté, et rien de plus — en particulier pas l'alphabet
 * amputé du serveur (`O`, `0`, `I`, `L`, `1`), qui dit ce qu'il *génère*, pas ce que le champ
 * doit *accepter*.
 */
describe("le code d'invitation", () => {
  it('majuscule un code saisi en minuscules', () => {
    assert.equal(sanitizeInviteCode('k7qm3xpb'), 'K7QM3XPB');
  });

  it('retire les espaces internes, comme un code collé depuis un message', () => {
    assert.equal(sanitizeInviteCode('k7qm 3xpb'), 'K7QM3XPB');
  });

  it('retire les espaces en tête et en fin de collage', () => {
    assert.equal(sanitizeInviteCode('  K7QM3XPB  '), 'K7QM3XPB');
  });

  it('laisse passer un caractère hors alphabet serveur : ce n’est pas au champ de le refuser', () => {
    // `O`, `0`, `I`, `L`, `1` ne sortent jamais du générateur du serveur, mais le champ ne les
    // filtre pas pour autant — un 404 `invite-code-not-usable` tranchera, pas une règle
    // silencieuse ici.
    assert.equal(sanitizeInviteCode('k7om3xpb'), 'K7OM3XPB');
  });

  it('reconnaît un code complet une fois nettoyé', () => {
    assert.equal(INVITE_CODE_LENGTH, 8);
    assert.equal(isCompleteInviteCode(sanitizeInviteCode('k7qm 3xpb')), true);
    assert.equal(isCompleteInviteCode(sanitizeInviteCode('k7qm3x')), false);
  });
});
