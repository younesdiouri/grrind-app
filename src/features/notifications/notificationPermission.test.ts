import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PermissionStatus } from 'expo-notifications';

import { notificationPermissionFrom } from './notificationPermission.ts';

/**
 * Trois états, pas deux — voir le docblock de `notificationPermission.ts`.
 *
 * Ce banc ne prouve pas grand-chose de la traduction elle-même, qui est une table. Ce qu'il
 * prouve, et c'est le sujet du #81, c'est que **« jamais demandé » ressort distinct d'un
 * refus** : c'était le repli silencieux qui rendait Réglages menteur.
 *
 * L'import de `PermissionStatus` est de type seulement, comme dans le module : `node --test`
 * ne peut pas charger `expo-notifications`.
 */
const status = (value: string): PermissionStatus => value as PermissionStatus;

describe("l'autorisation de notification, lue en trois états", () => {
  it("distingue « jamais demandé » d'un refus", () => {
    assert.notEqual(
      notificationPermissionFrom(status('undetermined')),
      notificationPermissionFrom(status('denied')),
    );
  });

  it('rend les trois valeurs telles quelles', () => {
    assert.equal(notificationPermissionFrom(status('granted')), 'granted');
    assert.equal(notificationPermissionFrom(status('denied')), 'denied');
    assert.equal(notificationPermissionFrom(status('undetermined')), 'undetermined');
  });
});
