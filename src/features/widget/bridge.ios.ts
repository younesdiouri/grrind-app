import GrrindWidget from '@/../modules/grrind-widget/src/GrrindWidgetModule';

import type { WidgetSnapshot } from '@/features/widget/snapshot';

/**
 * Dépose l'instantané dans le conteneur partagé de la variante, et prévient WidgetKit.
 *
 * **L'échec est avalé, et c'est délibéré.** Personne n'a rien à faire d'un widget qui n'a pas
 * pu être rafraîchi : il n'est pas à l'écran au moment où ça arrive, il porte sa propre date,
 * et le prochain passage à l'accueil ou le prochain réveil santé réécrira. Remonter l'erreur
 * ferait échouer, chez l'appelant, un import ou un chargement d'écran qui, eux, ont réussi.
 */
export async function writeSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await GrrindWidget.publish(JSON.stringify(snapshot));
  } catch {
    // Voir le docblock : dégradation silencieuse. Le widget garde son dernier état connu,
    // qui est justement ce qu'il est fait pour afficher.
  }
}
