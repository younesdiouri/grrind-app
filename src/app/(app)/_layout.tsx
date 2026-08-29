import { Stack } from 'expo-router';
import { View } from 'react-native';

import { color } from '@/design/tokens';
import { useSyncTriggers } from '@/features/health/useSync';
import { useDeviceRegistration } from '@/features/notifications/useDeviceRegistration';
import { usePendingPushRoute } from '@/features/notifications/usePendingPushRoute';
import { markInteracted } from '@/features/reward/launchGate';
import { usePendingReward } from '@/features/reward/usePendingReward';

/**
 * La coquille de l'app, et l'endroit où la synchronisation vit désormais.
 *
 * Elle était montée par l'écran Santé, ce qui voulait dire qu'ouvrir l'app sans y passer ne
 * synchronisait **jamais** : le joueur devait aller chercher sa propre progression. Ici,
 * elle part au lancement et à chaque retour au premier plan, quel que soit l'écran.
 *
 * `useDeviceRegistration` (#56) suit la même règle pour une raison différente : le jeton de
 * push change parfois sans qu'on l'apprenne autrement qu'en le renvoyant, donc il se
 * réenregistre à chaque démarrage — sans jamais demander l'autorisation, qui se pose ailleurs,
 * après avoir fondé ou rejoint une guilde.
 *
 * Le `View` qui enveloppe la pile ne sert qu'à savoir si le joueur a touché l'écran — les
 * événements tactiles remontent, donc un seul point d'écoute suffit pour toute l'app. C'est
 * ce qui empêche une progression arrivée en retard de s'ouvrir sur quelqu'un en pleine
 * lecture.
 *
 * `usePendingPushRoute` (#57) consomme le tap qui attendait une session : c'est ici, une fois
 * `signedIn`, que `/joueur/{id}` existe sur cette pile et que le router a quelque chose à
 * atteindre.
 */
export default function AppLayout() {
  useSyncTriggers();
  useDeviceRegistration();
  usePendingPushRoute();
  usePendingReward();

  return (
    <View style={{ flex: 1 }} onTouchStart={markInteracted}>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.background },
        headerTintColor: color.text,
        contentStyle: { backgroundColor: color.background },
      }}
    >
      {/* La barre d'onglets porte désormais ses propres en-têtes (#41) : sans
          `headerShown: false` ici, celui de la pile se superposerait à celui des onglets. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reward" options={{ headerShown: false, presentation: 'modal' }} />
      {/* Exactement la récompense, et pour les mêmes deux raisons. L'en-tête d'abord : l'écran
          de combat est plein cadre, et un « battle » surmonté d'un bouton retour abîmerait la
          mise en scène en plus de proposer une sortie pendant la séquence, là où le seul geste
          est le saut. La présentation en modale ensuite : elle place le contenu **sous** la
          barre d'état sans qu'aucun écran de ce dépôt ait à connaître les marges sûres — sans
          elle, le nom de l'adversaire passait derrière l'encoche. */}
      <Stack.Screen name="battle" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
    </View>
  );
}
