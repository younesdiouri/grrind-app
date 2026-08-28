import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCalendarDate, formatTurnDeadline, risalaTimeLeft } from './format.ts';

describe('une date civile de guilde ou de profil', () => {
  it("s'écrit en toutes lettres, année comprise", () => {
    // Midi UTC, pas minuit : la conversion vers un fuseau local ne doit pas faire
    // basculer le test sur la veille ou le lendemain selon la machine qui l'exécute.
    assert.equal(formatCalendarDate('2025-11-02T12:00:00Z'), '2 novembre 2025');
  });

  it("ne casse pas sur une date que le serveur n'aurait pas dû envoyer", () => {
    assert.equal(formatCalendarDate('pas une date'), 'pas une date');
  });
});

/**
 * Le temps restant d'une Risāla — #105. Les trois cas limites cités par le ticket : l'échéance
 * du jour, celle de l'heure qui vient, et celle qui vient de passer pendant qu'une réponse
 * était en vol (la bascule du dimanche 20 h).
 */
describe('le temps restant d’une Risāla', () => {
  it('compte les jours pleins en régime établi', () => {
    const now = new Date(2026, 7, 13, 8, 0);
    assert.equal(risalaTimeLeft(new Date(2026, 7, 20, 20, 0).toISOString(), now), 'expire dans 7 jours');
  });

  it('dit « demain » un jour avant, comme le tour', () => {
    const now = new Date(2026, 7, 13, 8, 0);
    assert.equal(risalaTimeLeft(new Date(2026, 7, 14, 20, 0).toISOString(), now), 'expire demain');
  });

  it('expire aujourd’hui : la comparaison porte sur le jour civil, pas sur un écart de 24 heures', () => {
    const now = new Date(2026, 7, 13, 8, 0);
    // Dix heures d'écart, mais toujours aujourd'hui.
    assert.equal(risalaTimeLeft(new Date(2026, 7, 13, 18, 0).toISOString(), now), 'expire aujourd’hui');
  });

  it('expire dans moins d’une heure : prioritaire sur le jour civil', () => {
    const now = new Date(2026, 7, 13, 19, 45);
    assert.equal(risalaTimeLeft(new Date(2026, 7, 13, 20, 0).toISOString(), now), 'expire dans moins d’une heure');
  });

  it('déjà expirée : une réponse en vol pendant la bascule du dimanche 20 h', () => {
    const now = new Date(2026, 7, 16, 20, 0, 5);
    assert.equal(risalaTimeLeft(new Date(2026, 7, 16, 20, 0, 0).toISOString(), now), 'expirée');
  });

  it("ne casse pas sur une date que le serveur n'aurait pas dû envoyer", () => {
    assert.equal(risalaTimeLeft('pas une date', new Date()), 'pas une date');
  });
});

describe('l’échéance d’un tour de Risāla', () => {
  it('porte le jour et l’heure, jamais un compte à rebours', () => {
    assert.equal(formatTurnDeadline(new Date(2026, 7, 16, 20, 0).toISOString()), '16 août, 20 h');
  });

  it('rejoint la minute quand l’heure ronde ne suffit pas à la désigner', () => {
    assert.equal(formatTurnDeadline(new Date(2026, 7, 16, 20, 5).toISOString()), '16 août, 20 h 05');
  });

  it("ne casse pas sur une date que le serveur n'aurait pas dû envoyer", () => {
    assert.equal(formatTurnDeadline('pas une date'), 'pas une date');
  });
});
