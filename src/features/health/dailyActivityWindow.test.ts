import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DailyActivityData } from '@/features/health/provider';

import { batchOfDays, WINDOW_DAYS } from './dailyActivityWindow.ts';

/**
 * Les deux bornes du contrat sur `PUT /api/daily-activity` — `minItems: 1`, `maxItems: 90`.
 *
 * Aucune des deux ne se voit en développement. Un lot vide part dès qu'un appareil n'a aucune
 * donnée d'énergie — un iPhone jamais porté, un simulateur — et repart en 422 sur le téléphone
 * de quelqu'un d'autre, sans que rien ne s'affiche puisque l'envoi est un meilleur effort
 * silencieux. C'est exactement le genre de panne que ce banc existe pour empêcher.
 */
function day(index: number): DailyActivityData {
  return {
    day: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
    activeEnergyKcal: 400,
    source: 'APPLE_HEALTH',
  };
}

describe('le lot de journées envoyé au serveur', () => {
  it('n’envoie rien plutôt qu’un lot vide, que le contrat refuse', () => {
    assert.equal(batchOfDays([]), null);
  });

  it('laisse passer une fenêtre ordinaire telle quelle', () => {
    const entries = Array.from({ length: WINDOW_DAYS }, (_, index) => day(index));
    assert.deepEqual(batchOfDays(entries), entries);
  });

  it('garde les journées les plus récentes s’il y en a trop', () => {
    // La fenêtre du serveur est glissante et regarde vers aujourd'hui : ce sont les vieilles
    // journées qui ne servent plus, pas les neuves.
    const entries = Array.from({ length: 120 }, (_, index) => day(index));
    const batch = batchOfDays(entries);

    assert.ok(batch !== null);
    assert.equal(batch.length, 90);
    assert.deepEqual(batch[batch.length - 1], entries[entries.length - 1]);
  });

  it('couvre largement la fenêtre de sept jours du serveur', () => {
    // Une app restée fermée une semaine est un cas ordinaire, pas un cas limite.
    assert.ok(WINDOW_DAYS > 7, 'la fenêtre lue doit dépasser celle que le serveur regarde');
  });
});
