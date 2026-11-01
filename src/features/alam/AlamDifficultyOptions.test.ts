import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { components } from '@/api/schema';
import { AlamDifficultyOptions } from './AlamDifficultyOptions.tsx';

const options: components['schemas']['AlamDifficultyOption'][] = [
  { difficulty: 'EASY', label: 'Facile', thresholdPermille: 250, probabilityMillionths: 712345, gauges: [] },
  { difficulty: 'INTERMEDIATE', label: 'Intermédiaire', thresholdPermille: 550, probabilityMillionths: 124500, gauges: [] },
  { difficulty: 'HARD', label: 'Difficile', thresholdPermille: 1000, probabilityMillionths: 1, gauges: [] },
];

it('montre les trois prévisions serveur et n’offre le choix qu’avec la capacité', () => {
  const render = (canChoose: boolean) => renderToStaticMarkup(createElement(AlamDifficultyOptions, {
    run: { difficulty: 'INTERMEDIATE', difficultyOptions: options }, canChoose, busy: false, onChoose: () => {},
  }));
  assert.match(render(true), /71,2345 %/);
  assert.match(render(true), /Cibles : 25/);
  assert.match(render(true), /Intermédiaire · CHOIX ACTUEL/);
  assert.match(render(true), /Choisir Difficile/);
  assert.doesNotMatch(render(false), /role="button"|Choisir/);
});

it('accepte les anciens replays sans inventer de difficulté ou de prévision', () => {
  const markup = renderToStaticMarkup(createElement(AlamDifficultyOptions, {
    run: { difficulty: null, difficultyOptions: [] }, canChoose: false, busy: false, onChoose: () => {},
  }));
  assert.doesNotMatch(markup, /Probabilité|CHOIX ACTUEL|Choisir/);
});
