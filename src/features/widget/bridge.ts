import type { WidgetSnapshot } from '@/features/widget/snapshot';

/**
 * Le côté « pas d'iPhone » du pont.
 *
 * **La sélection passe par les extensions de Metro**, pas par un `Platform.OS` à l'exécution —
 * même raison que `health/current.ts` : un `if` laisserait l'`import` du module natif
 * s'exécuter quand même, et `requireNativeModule('GrrindWidget')` jette là où il n'est pas lié.
 *
 * Ne rien faire est ici la réponse **exacte** de la plateforme, pas un bouchon : Android n'a
 * pas de widget GRRIND, et il en aura un le jour où quelqu'un écrira un `AppWidgetProvider`.
 */
export async function writeSnapshot(_snapshot: WidgetSnapshot): Promise<void> {
  return Promise.resolve();
}
