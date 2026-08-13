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
      {/* « Spike SyncSummary » nommait le banc de fixtures, du temps où l'accueil n'était
          que ça. L'écran montre maintenant le niveau et les séances du joueur, et le vieux
          titre le faisait passer pour un écran de débogage — au point qu'on y cherchait un
          bouton retour. */}
      <Stack.Screen name="index" options={{ title: 'GRRIND' }} />
      <Stack.Screen name="sante" options={{ title: 'Santé' }} />
      <Stack.Screen name="reward" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
    </View>
  );
}
