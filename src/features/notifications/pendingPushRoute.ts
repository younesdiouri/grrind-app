import type { PushRouteTarget } from '@/features/notifications/pushRouteTarget';

/**
 * La cible d'un tap qui n'a pas encore de session pour s'ouvrir.
 *
 * Un singleton de module, comme `interacted` dans `launchGate.ts` : un tap n'est pas un état
 * de rendu, et le remonter dans l'arbre ferait dépendre sa survie du composant qui l'a lu en
 * premier. Une seule place, un seul slot — un second tap avant que le premier soit consommé
 * remplace la cible plutôt que d'en garder deux : rouvrir l'app ne doit jamais rejouer une
 * navigation obsolète, et il n'y a jamais qu'un seul écran à ouvrir à la fois.
 *
 * `takePendingPushRoute` **efface en lisant** : c'est ce qui garantit la consommation unique
 * que le ticket #57 demande — un lancement plus tard ne doit pas rejouer un vieux tap.
 */
let pending: PushRouteTarget | null = null;

export function setPendingPushRoute(target: PushRouteTarget): void {
  pending = target;
}

export function takePendingPushRoute(): PushRouteTarget | null {
  const target = pending;
  pending = null;
  return target;
}
