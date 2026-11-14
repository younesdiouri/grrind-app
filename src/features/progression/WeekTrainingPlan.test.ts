import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@/components/Button';
import { WeekTrainingAdvice, WeekTrainingPlansView } from './WeekTrainingPlan.tsx';
import { TRAINING_NOW, TRAINING_PLAN, TRAINING_WEEK } from './weekTrainingFixtures.ts';

const render = (props: Partial<Parameters<typeof WeekTrainingPlansView>[0]> = {}) => renderToStaticMarkup(createElement(WeekTrainingPlansView, {
  week: TRAINING_WEEK, now: TRAINING_NOW, loading: false, onRetry() {}, onGuide() {}, onBack() {}, ...props,
}));

it('garde un conseil d’entrée court et réserve les séances à la vue des sports', () => {
  const html = renderToStaticMarkup(createElement(WeekTrainingAdvice, { onOpen() {} }));
  assert.ok(html.includes('Des sports pour compléter tes jauges.'));
  assert.ok(html.includes('Voir les sports'));
  assert.ok(!html.includes('Escalade'));
});

it('présente les trois alternatives dans l’ordre serveur avec leurs valeurs exactes', () => {
  const html = render({ week: { ...TRAINING_WEEK, trainingPlans: TRAINING_WEEK.trainingPlans.map((plan, index) => index === 1 ? {
    ...plan, sessions: [{ ...plan.sessions[0], estimatedXp: 79, estimatedGains: { strength: 11, endurance: 13, mobility: 17, dexterity: 38 } }],
  } : plan) } });
  for (const text of ['Choisis une option', 'ne se cumulent pas', 'Option 1', 'Option 2', 'Option 3', '20 min', '30 min', '35 min',
    '79 XP', 'Force +11', 'Endurance +13', 'Mobilité +17', 'Dextérité +38', '12 pts dextérité', '6 pts mobilité',
    'Ce plan devrait remplir tes quatre jauges.', 'solo', 'bonus actuels', 'plafonds du jour', 'Guide des sports']) assert.ok(html.includes(text), text);
  assert.ok(html.indexOf('Escalade') < html.indexOf('Sports de raquette'));
  assert.ok(html.indexOf('Sports de raquette') < html.indexOf('Natation'));
});

it('respecte un choix unique ou aucun choix sans réutiliser le principal de compatibilité', () => {
  const single = render({ week: { ...TRAINING_WEEK, trainingPlans: [TRAINING_PLAN] } });
  assert.ok(single.includes('Option 1'));
  assert.ok(!single.includes('Option 2'));
  const empty = render({ week: { ...TRAINING_WEEK, trainingPlans: [] } });
  assert.ok(empty.includes('Aucune suggestion disponible pour aujourd’hui.'));
  assert.ok(empty.includes('Guide des sports'));
  assert.ok(!empty.includes('Escalade'));
});

it('distingue attente, panne avec retry, expiration, absence de référence et semaine remplie', () => {
  const loading = render({ week: undefined, loading: true });
  assert.ok(loading.includes('Chargement des suggestions…'));
  assert.ok(!loading.includes('Aucune suggestion'));
  const failure = render({ failure: { kind: 'offline' } });
  assert.ok(failure.includes('Impossible de joindre GRRIND'));
  assert.ok(failure.includes('Réessayer'));
  assert.ok(!failure.includes('47 XP'));
  const expired = render({ now: new Date(TRAINING_PLAN.expiresAt) });
  assert.ok(expired.includes('Ces estimations ont expiré. Actualise-les avant de choisir.'));
  assert.ok(!expired.includes('47 XP'));
  assert.ok(expired.includes('Actualiser'));
  assert.ok(render({ week: { ...TRAINING_WEEK, previous: null, trainingPlans: [] } }).includes('Ta semaine de référence se construit.'));
  const complete = render({ week: { ...TRAINING_WEEK, trainingPlans: [], current: TRAINING_WEEK.previous! } });
  assert.ok(complete.includes('Tes quatre jauges sont déjà remplies.'));
  assert.ok(!complete.includes('Aucune suggestion'));
});

function buttons(node: ReactNode): ReactElement<{ label: string; onPress(): void }>[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (child.type === Button) return [child as ReactElement<{ label: string; onPress(): void }>];
    return buttons((child.props as { children?: ReactNode }).children);
  });
}

it('relie les actions de la vraie vue à l’ouverture, au guide, au retour et au retry', () => {
  const actions: string[] = [];
  buttons(WeekTrainingAdvice({ onOpen: () => actions.push('open') }))[0].props.onPress();
  const view = WeekTrainingPlansView({ now: TRAINING_NOW, loading: false, failure: { kind: 'offline' },
    onRetry: () => actions.push('retry'), onGuide: () => actions.push('guide'), onBack: () => actions.push('back') });
  const renderedButtons = buttons(view);
  for (const label of ['Réessayer', 'Guide des sports', 'Retour']) renderedButtons.find(button => button.props.label === label)!.props.onPress();
  assert.deepEqual(actions, ['open', 'retry', 'guide', 'back']);
});
