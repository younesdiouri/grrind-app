import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TogetherBonusReceipt } from '@/features/health/TogetherBonusReceipt';
import { TOGETHER_BONUS_FIXTURE } from '@/features/health/togetherFixtures';

test('le reçu montre le delta et les paliers serveur, jamais un SyncSummary recalculé', () => {
  const markup = renderToStaticMarkup(createElement(TogetherBonusReceipt, { bonus: TOGETHER_BONUS_FIXTURE }));
  assert.match(markup, /\+17 XP/);
  assert.match(markup, /999 XP de groupe cumulées · 1099 XP/);
  assert.match(markup, /Multiplicateur ×2 → ×3/);
  assert.doesNotMatch(markup, /BUTIN|SÉRIE|\+200 XP|\+300 XP/);
});
