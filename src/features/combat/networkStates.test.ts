import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, it, mock } from 'node:test';
import { act, createElement, useEffect, type ComponentType } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import createClient from 'openapi-fetch';
import type { paths } from '@/api/schema';
import type { Battle } from './timeline.ts';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const battle = JSON.parse(readFileSync(new URL('../../../fixtures/battle/victoire.json', import.meta.url), 'utf8')) as Battle;
const catalog = { enemies: [{ ...battle.enemy, key: 'SAND_JACKAL', minimumLevel: 1 }], player: battle.player };
const notFound = { type: 'https://grrind.app/problems/not-found', status: 404, title: 'Not found', detail: 'Missing battle' };
let reply: (request: Request) => Promise<Response>;
const requests: Request[] = [];
const api = createClient<paths>({ baseUrl: 'https://api.test', fetch: async input => {
  const request = input as Request;
  requests.push(request);
  return reply(request);
} });
mock.module(new URL('../../api/client.ts', import.meta.url), { namedExports: { api } });
let params: { id?: string; fixture?: string } = {};
let canGoBack = true;
const navigation: string[] = [];
mock.module('expo-router', { namedExports: {
  useLocalSearchParams: () => params,
  router: { canGoBack: () => canGoBack, back: () => navigation.push('back'), replace: (path: string) => navigation.push(path) },
} });
// Seules les frontières de présentation native sont remplacées ; les hooks et effets tournent dans React.
mock.module('react-native', { namedExports: {
  View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles },
} });
mock.module(new URL('./BattleView.tsx', import.meta.url), { namedExports: {
  BattleView: (props: object) => createElement('battle-view', props),
} });
mock.module(new URL('./fixtures.ts', import.meta.url), { namedExports: { BATTLE_FIXTURES: { victoire: battle }, DEMO_DUEL: battle } });
mock.module(new URL('../avatar/useAvatarProfile.ts', import.meta.url), { namedExports: { useAvatarProfile: () => ({}) } });
mock.module(new URL('../inventory/useInventory.ts', import.meta.url), { namedExports: { useInventory: () => ({}) } });
const { useCatalog } = await import('./useCatalog.ts');
const { default: BattleScreen } = await import('../../app/(app)/battle.tsx');
const { Button } = await import('../../components/Button.tsx');
const { ActivityIndicator } = await import('react-native');
const { BattleView } = await import('./BattleView.tsx');
const { handOver, forgetHandOver } = await import('./lastBattle.ts');
const { noteEquipmentChanged } = await import('../inventory/equipmentRevision.ts');
let observed: ReturnType<typeof useCatalog>;
function CatalogProbe() {
  const value = useCatalog();
  useEffect(() => { observed = value; });
  return null;
}
let renderer: ReactTestRenderer | undefined;
async function mount(component: ComponentType = BattleScreen) {
  await act(async () => { renderer = create(createElement(component)); });
  return renderer!;
}
async function settle() { await act(async () => { await new Promise(resolve => setImmediate(resolve)); }); }
async function press(label: string) {
  const button = renderer!.root.findAllByType(Button).find(node => node.props.label === label);
  assert.ok(button, `Le bouton ${label} doit être disponible`);
  await act(async () => { button.props.onPress(); });
}
function labels() { return renderer!.root.findAllByType(Button).map(node => node.props.label); }
function text() { return JSON.stringify(renderer!.toJSON()); }
beforeEach(() => {
  requests.length = 0; navigation.length = 0; params = { id: battle.id }; canGoBack = true;
  reply = async request => Response.json(new URL(request.url).pathname === '/api/enemies' ? catalog : { level: 7 });
});
afterEach(async () => {
  if (renderer) await act(async () => { renderer!.unmount(); });
  renderer = undefined; forgetHandOver();
});

for (const path of ['/api/enemies', '/api/progression']) {
  it(`sort du chargement si ${path} rejette, puis recharge les deux lectures`, async () => {
    const healthy = reply;
    reply = async request => { if (new URL(request.url).pathname === path) throw new TypeError('offline'); return healthy(request); };
    await mount(CatalogProbe);
    assert.deepEqual({ ...observed.catalog }, { step: 'failed', failure: { kind: 'offline' } });
    reply = healthy;
    await act(async () => { observed.reload(); });
    assert.equal(observed.catalog.step, 'ready');
    if (observed.catalog.step === 'ready') {
      assert.equal(observed.catalog.playerLevel, 7);
      assert.deepEqual(observed.catalog.player, battle.player);
    }
    assert.equal(requests.length, 4);
    assert.ok(requests.every(request => request.method === 'GET'));
  });
}

it('garde le catalogue vide et les refus serveur dans leurs états existants', async () => {
  reply = async request => Response.json(new URL(request.url).pathname === '/api/enemies' ? { ...catalog, enemies: [] } : { level: 7 });
  await mount(CatalogProbe);
  assert.equal(observed.catalog.step, 'ready');
  if (observed.catalog.step === 'ready') assert.deepEqual(observed.catalog.entries, []);
  reply = async () => Response.json(notFound, { status: 404 });
  await act(async () => { observed.reload(); });
  assert.deepEqual(observed.catalog, { step: 'failed', failure: { kind: 'problem', problem: notFound } });
});

it('ignore une ancienne lecture du catalogue après retry, revalidation et démontage', async () => {
  const hold = Promise.withResolvers<Response>();
  reply = () => hold.promise.then(response => response.clone());
  await mount(CatalogProbe);
  const oldRequests = [...requests];
  reply = async request => Response.json(new URL(request.url).pathname === '/api/enemies' ? catalog : { level: 9 });
  await act(async () => { observed.reload(); });
  assert.equal(observed.catalog.step, 'ready');
  assert.ok(oldRequests.every(request => request.signal.aborted));
  hold.resolve(Response.json({ level: 1, ...catalog }));
  await settle();
  if (observed.catalog.step === 'ready') assert.equal(observed.catalog.playerLevel, 9);
  const late = Promise.withResolvers<Response>();
  reply = () => late.promise;
  await act(async () => { noteEquipmentChanged(); });
  const lastRequests = requests.slice(-2);
  await act(async () => { renderer!.unmount(); }); renderer = undefined;
  assert.ok(lastRequests.every(request => request.signal.aborted));
  late.reject(new TypeError('offline after unmount'));
  await settle();
});

for (const failure of ['rejet', '404', 'vide'] as const) {
  it(`propose réessai et fermeture sur ${failure}, puis relit uniquement le même combat`, async () => {
    reply = async () => {
      if (failure === 'rejet') throw new TypeError('offline');
      return failure === '404' ? Response.json(notFound, { status: 404 }) : new Response(null, { status: 204 });
    };
    await mount();
    assert.deepEqual(labels(), ['Réessayer', 'Fermer']);
    assert.equal(renderer!.root.findAllByType(ActivityIndicator).length, 0);
    assert.match(text(), failure === '404' ? /Cette ressource/ : /Impossible de joindre/);
    reply = async () => Response.json(battle);
    await press('Réessayer');
    assert.deepEqual(renderer!.root.findByType(BattleView).props.battle, battle);
    assert.deepEqual(requests.map(request => [request.method, new URL(request.url).pathname]), [
      ['GET', `/api/battles/${battle.id}`], ['GET', `/api/battles/${battle.id}`],
    ]);
    await act(async () => { renderer!.root.findByType(BattleView).props.onDismiss(); });
    assert.deepEqual(navigation, ['back']);
  });
}

it('permet de fermer un rejeu en erreur sans pile et une route sans identifiant sans lancer de combat', async () => {
  canGoBack = false;
  reply = async () => Response.json(notFound, { status: 404 });
  await mount();
  await press('Fermer');
  assert.deepEqual(navigation, ['/arene']);
  await act(async () => { renderer!.unmount(); }); renderer = undefined;
  params = {};
  await mount();
  assert.match(text(), /Aucun combat à jouer/);
  assert.deepEqual(labels(), ['Fermer']);
  await press('Fermer');
  assert.deepEqual(navigation, ['/arene', '/arene']);
  assert.equal(requests.length, 1);
});

it('offre une sortie pendant la lecture et ignore sa réponse tardive après fermeture', async () => {
  const hold = Promise.withResolvers<Response>();
  reply = () => hold.promise;
  await mount();
  assert.equal(renderer!.root.findAllByType(ActivityIndicator).length, 1);
  await press('Fermer');
  assert.deepEqual(navigation, ['back']);
  await act(async () => { renderer!.unmount(); }); renderer = undefined;
  assert.equal(requests[0].signal.aborted, true);
  hold.resolve(Response.json(battle));
  await settle();
  assert.deepEqual(navigation, ['back']);
});

it('préserve le passe-plat et la sortie nominale sans lecture supplémentaire', async () => {
  handOver(battle);
  await mount();
  assert.deepEqual(renderer!.root.findByType(BattleView).props.battle, battle);
  assert.equal(requests.length, 0);
  await act(async () => { renderer!.root.findByType(BattleView).props.onDismiss(); });
  assert.deepEqual(navigation, ['back']);
});
