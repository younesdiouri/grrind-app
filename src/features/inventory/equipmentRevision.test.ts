import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getEquipmentRevision,
  noteEquipmentChanged,
  subscribeToEquipment,
} from './equipmentRevision.ts';

/**
 * Le signal qui empêche l'onglet Combat d'afficher un combattant périmé (#30).
 *
 * Ce qui se teste ici est le **contrat du compteur** : il change à chaque équipement confirmé,
 * il prévient qui écoute, et il oublie qui s'est désabonné. Que `useCatalog` s'y branche
 * relève du typage et du smoke test — mais ce qu'il consomme, lui, est prouvé.
 */
describe("le compteur d'équipement (#30)", () => {
  it('change de valeur à chaque équipement, pour que deux gestes ne se confondent pas', () => {
    const before = getEquipmentRevision();

    noteEquipmentChanged();
    const once = getEquipmentRevision();
    noteEquipmentChanged();

    assert.notEqual(once, before);
    // Un booléen ferait passer le second équipement pour l'absence de changement : deux gestes
    // d'affilée doivent produire deux instantanés distincts.
    assert.notEqual(getEquipmentRevision(), once);
  });

  it('prévient qui écoute, et cesse dès le désabonnement', () => {
    let seen = 0;
    const unsubscribe = subscribeToEquipment(() => {
      seen += 1;
    });

    noteEquipmentChanged();
    assert.equal(seen, 1);

    unsubscribe();
    noteEquipmentChanged();

    // Un écran démonté qui continuerait d'être prévenu ferait relire un catalogue que
    // personne ne regarde.
    assert.equal(seen, 1);
  });
});
