import { NativeModule, requireNativeModule } from 'expo';

/**
 * La surface native, brute — même règle que `GrrindHealthModule.ts` : ce fichier **déclare**,
 * il n'habille pas. Le choix de ce qu'on publie et le moment où on le publie vivent dans
 * `src/features/widget/`, où ils se testent sans appareil.
 *
 * Une chaîne et pas un objet : la charge utile traverse le pont telle quelle, et c'est le
 * widget — un autre processus, dans un autre langage — qui la relit. Un objet sérialisé par
 * le pont puis re-sérialisé pour `UserDefaults` donnerait deux formes à garder d'accord pour
 * la même donnée. La forme, unique, est décrite dans `snapshot.ts`.
 */
declare class GrrindWidgetNativeModule extends NativeModule {
  /**
   * Dépose l'instantané dans le conteneur partagé et prévient WidgetKit.
   *
   * Ne jette pas quand l'App Group manque : voir le docblock côté Swift — c'est un défaut de
   * signature, pas une condition d'exécution que l'appelant puisse rattraper.
   */
  publish(payload: string): Promise<void>;
}

export default requireNativeModule<GrrindWidgetNativeModule>('GrrindWidget');
