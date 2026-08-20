import GrrindHealth from '@/../modules/grrind-health/src/GrrindHealthModule';

import { shouldCommitAnchor } from '@/features/health/anchorPolicy';
import { sync } from '@/features/health/sync';

/**
 * Le réveil HealthKit, câblé jusqu'au réseau. La seule capacité qui ne passe pas par le port
 * `HealthProvider` — voir le docblock en tête de `GrrindHealthModule.swift`, qui l'explique et
 * ne le regrettera pas avant que #15 donne un équivalent Android.
 *
 * Comme `current.ios.ts`, ce fichier n'existe que sur iPhone : la sélection passe par
 * l'extension Metro, pas par un `if (Platform.OS === 'ios')` qui laisserait quand même
 * `requireNativeModule('GrrindHealth')` s'exécuter — et jeter — sur une plateforme où le
 * module natif n'est pas lié.
 */

/**
 * Inscrit l'app auprès d'iOS pour être réveillée. Idempotent côté natif, donc rappelable sans
 * risque à chaque lancement — voir `GrrindHealthModule.enableBackgroundDelivery`.
 *
 * Échoue tant que HealthKit n'a rien accordé, et c'est attendu : l'appelant ne le tente qu'une
 * fois l'autorisation demandée (`useHealthAccess.ts`, `useSync.ts`). L'échec est avalé plutôt
 * que remonté — ce n'est jamais l'utilisateur qui a quelque chose à faire de ce ratage, et le
 * prochain appel, au prochain lancement, retentera de lui-même.
 */
export async function enableBackgroundWakeup(): Promise<void> {
  try {
    await GrrindHealth.enableBackgroundDelivery();
  } catch {
    // Voir le docblock : dégradation silencieuse, pas panne à afficher.
  }
}

/**
 * Écoute le réveil, du premier événement natif jusqu'à l'ancre commise.
 *
 * Rend une fonction de désinscription plutôt qu'un module qui s'auto-abonne pour toujours :
 * `useSync.ts` la monte et la démonte avec l'état de connexion, comme les trois autres
 * déclencheurs.
 */
export function startBackgroundWakeup(): () => void {
  const subscription = GrrindHealth.addListener('onWorkoutsChanged', (event) => {
    void handleWakeup(event.anchor);
  });

  return () => subscription.remove();
}

/**
 * Un réveil, du premier événement natif jusqu'à l'ancre commise — ou pas.
 *
 * Emprunte exactement le chemin des trois autres déclencheurs (`sync('background')`), et
 * s'arrête là : aucune mise en scène ne part d'ici, voir le docblock de `sync.ts`. Ce qui suit
 * ne décide qu'une chose, faut-il faire avancer l'ancre — voir `anchorPolicy.ts` pour la règle,
 * et `GrrindHealthModule.commitAnchor` pour ce qu'elle protège.
 */
async function handleWakeup(anchor: string): Promise<void> {
  const outcome = await sync('background');

  // `throttled` : une autre synchronisation vient de répondre, à moins de trente secondes.
  // Rien n'est parti pour ce réveil précis, donc rien n'est tranché sur *cette* différence —
  // le prochain réveil la retrouvera, et elle se sera peut-être déjà réglée d'elle-même.
  if (outcome.status === 'throttled') {
    return;
  }

  if (!shouldCommitAnchor(outcome.result)) {
    return;
  }

  try {
    await GrrindHealth.commitAnchor(anchor);
  } catch {
    // Une ancre illisible ou une écriture qui échoue : rien à faire ici, personne ne regarde.
    // Ne pas avancer laisse relire la même différence au prochain réveil — sans conséquence,
    // voir `anchorPolicy.ts`.
  }
}
