import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCalendarDate } from './format.ts';

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
