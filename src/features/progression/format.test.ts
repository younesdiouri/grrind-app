import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatAgo,
  formatCalories,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatInviteExpiry,
  formatWhen,
} from './format.ts';

/**
 * Le contrat dit que `null` veut dire « non mesuré, **jamais zéro** ». Ces tests sont là
 * pour que ça reste vrai jusqu'à l'écran : c'est la règle qu'on casse en écrivant
 * `?? 0` sans y penser, et la seule dont l'erreur affiche une donnée fausse plutôt qu'une
 * donnée absente.
 */
describe('une mesure absente ne devient jamais zéro', () => {
  it('rend null plutôt qu’une chaîne, pour chaque mesure', () => {
    assert.equal(formatDistance(null), null);
    assert.equal(formatElevation(null), null);
    assert.equal(formatCalories(null), null);
    assert.equal(formatHeartRate(null), null);
  });

  it('distingue une mesure nulle d’une mesure à zéro', () => {
    // Un tour de piste plat a bien un dénivelé de zéro, et il s'affiche.
    assert.equal(formatElevation(0), '0 m D+');
    assert.equal(formatDistance(0), '0 m');
  });
});

describe('les distances', () => {
  it('restent en mètres sous le kilomètre', () => {
    assert.equal(formatDistance(754), '754 m');
    assert.equal(formatDistance(999), '999 m');
  });

  it('passent au kilomètre au-delà, avec la virgule française', () => {
    assert.equal(formatDistance(1000), '1,00 km');
    assert.equal(formatDistance(3046), '3,05 km');
  });
});

describe('les durées', () => {
  it('ne rendent pas « 0 min » pour une séance très courte', () => {
    assert.equal(formatDuration(40), 'moins d’une minute');
  });

  it('s’expriment en minutes sous l’heure', () => {
    // 42 min 54 s, une vraie séance : on tronque plutôt que d'arrondir à 43, parce
    // qu'une durée affichée ne doit jamais dépasser la durée mesurée.
    assert.equal(formatDuration(2574), '42 min');
    assert.equal(formatDuration(3599), '59 min');
  });

  it('passent en heures au-delà, et taisent les minutes rondes', () => {
    assert.equal(formatDuration(3600), '1 h');
    assert.equal(formatDuration(3900), '1 h 05');
    assert.equal(formatDuration(7500), '2 h 05');
  });
});

describe('les dates', () => {
  it('comparent des jours civils, pas des écarts de 24 heures', () => {
    const now = new Date(2026, 7, 13, 8, 0);

    // Hier 20 h est à douze heures d'ici, et reste hier.
    assert.match(formatWhen(new Date(2026, 7, 12, 20, 0).toISOString(), now), /^Hier, 20:00$/);
    // Ce matin 7 h est à une heure d'ici, et reste aujourd'hui.
    assert.match(
      formatWhen(new Date(2026, 7, 13, 7, 0).toISOString(), now),
      /^Aujourd’hui, 07:00$/,
    );
  });

  it('passent à la date absolue au-delà d’hier', () => {
    const now = new Date(2026, 7, 13, 8, 0);

    assert.equal(formatWhen(new Date(2026, 7, 4, 15, 29).toISOString(), now), '4 août');
  });

  it('ne cassent pas sur une date que le serveur n’aurait pas dû envoyer', () => {
    assert.equal(formatWhen('pas une date', new Date()), 'pas une date');
  });
});

/**
 * L'expiration d'un code d'invitation — voir #44. Le contrat le dit : une date, pas un
 * compte à rebours, l'exemple du ticket est repris tel quel (« valable jusqu'à demain
 * 18 h ») pour que le test et la spécification ne divergent jamais en silence.
 */
describe('l’expiration d’un code d’invitation', () => {
  it('tait l’heure ronde, et rejoint la minute sinon', () => {
    const now = new Date(2026, 7, 13, 8, 0);

    assert.equal(formatInviteExpiry(new Date(2026, 7, 13, 18, 0).toISOString(), now), 'valable jusqu’à 18 h');
    assert.equal(
      formatInviteExpiry(new Date(2026, 7, 13, 18, 5).toISOString(), now),
      'valable jusqu’à 18 h 05',
    );
  });

  it('dit « demain » le jour suivant, comme le ticket l’écrit', () => {
    const now = new Date(2026, 7, 13, 8, 0);

    assert.equal(
      formatInviteExpiry(new Date(2026, 7, 14, 18, 0).toISOString(), now),
      'valable jusqu’à demain 18 h',
    );
  });

  it('passe à la date absolue au-delà de demain : personne ne compte un code à l’heure près huit jours plus tard', () => {
    const now = new Date(2026, 7, 13, 8, 0);

    assert.equal(
      formatInviteExpiry(new Date(2026, 7, 21, 18, 0).toISOString(), now),
      'valable jusqu’au 21 août',
    );
  });

  it('ne casse pas sur une date que le serveur n’aurait pas dû envoyer', () => {
    assert.equal(formatInviteExpiry('pas une date', new Date()), 'pas une date');
  });
});

describe('formatAgo', () => {
  const now = new Date('2026-08-27T14:00:00');

  it('dit « à l’instant » sous la minute : c’est la réponse qu’on cherche', () => {
    assert.equal(formatAgo('2026-08-27T13:59:30', now), 'à l’instant');
  });

  it('compte en minutes dans l’heure', () => {
    assert.equal(formatAgo('2026-08-27T13:56:00', now), 'il y a 4 min');
  });

  it('compte en heures dans la journée', () => {
    assert.equal(formatAgo('2026-08-27T09:00:00', now), 'il y a 5 h');
  });

  // Au-delà, « il y a 73 h » ne se lit pas : la question redevient « quand », pas « depuis
  // combien de temps », et c'est `formatWhen` qui y répond.
  it('repasse la main à formatWhen au-delà d’une journée', () => {
    assert.equal(
      formatAgo('2026-08-24T09:00:00', now),
      formatWhen('2026-08-24T09:00:00', now),
    );
  });

  it('rend l’entrée telle quelle si elle n’est pas une date', () => {
    assert.equal(formatAgo('pas une date', now), 'pas une date');
  });
});
