/**
 * `react-native-web` n'expose pas de types TypeScript — il est écrit en Flow, et le paquet
 * `@types/react-native-web` publié est resté deux mineures en arrière. On déclare donc
 * exactement ce que la construction des previews utilise, et rien de plus.
 *
 * Ce n'est pas une dette : l'app n'importe jamais `react-native-web` (Metro fait l'alias
 * lui-même côté web). Le seul appelant est `scripts/build-previews.ts`.
 */
declare module 'react-native-web' {
  import type { ComponentType, ReactElement } from 'react';

  export const AppRegistry: {
    registerComponent(key: string, provider: () => ComponentType): void;
    /** Le rendu serveur : l'arbre, et la feuille de style **globale** qu'il a produite. */
    getApplication(key: string): { element: ReactElement; getStyleElement(): ReactElement };
  };
}
