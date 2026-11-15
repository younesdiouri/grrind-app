import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar.ts';
import { PerformanceRadar } from '@/features/progression/PerformanceRadar.tsx';

let data: unknown;
let pending = false;
let error: Failure | undefined;
mock.module('expo-router', { namedExports: {
  Stack: { Screen: () => null }, useLocalSearchParams: () => ({ id: 'target' }), useIsFocused: () => true,
  router: { navigate() {}, push() {} },
} });
// Le vrai écran et son radar statique ; lectures, actions et animation native sont simulées.
mock.module(new URL('./usePlayer.ts', import.meta.url), { namedExports: { usePlayer: () => ({
  data, isPending: pending, isError: error !== undefined, error, refetch() {},
}) } });
mock.module(new URL('../auth/useAuth.ts', import.meta.url), { namedExports: {
  useAuth: () => ({ status: 'signedIn', user: { id: 'reader' } }),
} });
mock.module(new URL('../league/useLeague.ts', import.meta.url), { namedExports: { useLeague: () => ({}) } });
mock.module(new URL('../league/LeagueSheet.tsx', import.meta.url), { namedExports: { LeagueSheet: () => null } });
mock.module(new URL('../combat/fight.ts', import.meta.url), { namedExports: { challenge() {} } });
mock.module(new URL('../progression/PlayerHomeView.tsx', import.meta.url), { namedExports: { LivePerformanceRadar: PerformanceRadar } });
const { default: JoueurScreen } = await import('../../app/(app)/joueur/[id].tsx');

const totals = { xp: 0, sessions: 0, attributes: { strength: 0, endurance: 0, mobility: 0, dexterity: 0 } };
const profile = {
  id: 'target', displayName: 'Cible serveur', title: null, level: 3, avatar: DEFAULT_AVATAR,
  league: { tier: 'BRONZE', tierOrder: 0, lootLuckPercent: 0 }, guild: { id: 'guild', name: 'Guilde serveur',
    emblem: { symbol: 'HEART', backgroundColor: 'COPPER', symbolColor: 'NIGHT' } },
  inventory: { items: [], equipment: { HEAD: null, CHEST: null, LEGS: null, FEET: null, ACCESSORY: null, WEAPON: null } },
  week: { startsAt: '2026-11-08T19:00:00Z', resetsAt: '2026-11-15T19:00:00Z', current: totals, previous: null },
} satisfies Pick<components['schemas']['PlayerDetail'], 'id' | 'displayName' | 'title' | 'level' | 'avatar' | 'league' | 'guild' | 'inventory' | 'week'>;
const render = () => renderToStaticMarkup(createElement(JoueurScreen));
beforeEach(() => { data = profile; pending = false; error = undefined; });

for (const missing of ['week', 'guild', 'both'] as const) {
  test(`une réponse sans ${missing} propose de réessayer sans affirmer Sans guilde ni afficher un profil partiel`, () => {
    const legacy: Partial<typeof profile> = { ...profile };
    if (missing !== 'guild') delete legacy.week;
    if (missing !== 'week') delete legacy.guild;
    data = legacy;
    const markup = render();
    assert.ok(markup.includes('Profil indisponible'), 'Le profil incomplet doit être signalé');
    assert.ok(markup.includes('Réessayer'));
    assert.ok(!markup.includes('Sans guilde'));
    assert.ok(!markup.includes('Portrait de Cible serveur'));
  });
}

test('guild null et previous null restent des absences explicites valides', () => {
  data = { ...profile, guild: null };
  const markup = render();
  assert.ok(markup.includes('Sans guilde'));
  assert.ok(markup.includes('Radar de performance'));
  assert.ok(markup.includes('Référence indisponible'));
  assert.ok(!markup.includes('Profil indisponible'));
});

test('une identité de guilde incomplète propose de réessayer au lieu d’inventer un emblème', () => {
  data = { ...profile, guild: { id: 'guild', name: 'Guilde serveur' } };
  const markup = render();
  assert.match(markup, /Profil indisponible/);
  assert.match(markup, /Réessayer/);
  assert.doesNotMatch(markup, /Sans guilde|Emblème|Ouvrir la guilde/);
});

test('les données complètes conservent le radar de la cible, la guilde et le défi', () => {
  const markup = render();
  for (const expected of ['Radar de performance', 'Ouvrir la guilde Guilde serveur', 'Emblème · Cardio · Nuit sur Cuivre', 'Défier Cible serveur']) {
    assert.ok(markup.includes(expected), expected);
  }
});

test('chargement et refus existants ne présentent aucun profil incomplet', () => {
  data = undefined; pending = true;
  assert.ok(!render().includes('Sans guilde'));
  pending = false; error = { kind: 'offline' };
  const markup = render();
  assert.ok(markup.includes('Impossible de joindre GRRIND'));
  assert.ok(markup.includes('Réessayer'));
});
