import { Stack } from 'expo-router';
import { View } from 'react-native';

import { color } from '@/design/tokens';
import { useSyncTriggers } from '@/features/health/useSync';
import { markInteracted } from '@/features/reward/launchGate';
import { usePendingReward } from '@/features/reward/usePendingReward';

/**
 * La coquille de l'app, et l'endroit où la synchronisation vit désormais.
 *
 * Elle était montée par l'écran Santé, ce qui voulait dire qu'ouvrir l'app sans y passer ne
 * synchronisait **jamais** : le joueur devait aller chercher sa propre progression. Ici,
 * elle part au lancement et à chaque retour au premier plan, quel que soit l'écran.
 *
 * Le `View` qui enveloppe la pile ne sert qu'à savoir si le joueur a touché l'écran — les
 * événements tactiles remontent, donc un seul point d'écoute suffit pour toute l'app. C'est
 * ce qui empêche une progression arrivée en retard de s'ouvrir sur quelqu'un en pleine
 * lecture.
 */
export default function AppLayout() {
  useSyncTriggers();
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
    </Stack>
    </View>
  );
}
