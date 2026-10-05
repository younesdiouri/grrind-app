import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { SystemHeader } from '@/components/SystemHeader';
import { ambient, color } from '@/design/tokens';
import { useSyncTriggers } from '@/features/health/useSync';
import { useDeviceRegistration } from '@/features/notifications/useDeviceRegistration';
import { usePendingPushRoute } from '@/features/notifications/usePendingPushRoute';
import { markInteracted } from '@/features/reward/launchGate';
import { usePendingReward } from '@/features/reward/usePendingReward';

// Expo Router 57 exporte directement le thème de navigation. Son fond transparent laisse le
// champ fixe du shell traverser Tabs et Stack sans poser un calque au-dessus de l'accessibilité.
const connectedTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: color.accent,
    background: 'transparent',
    card: color.background,
    text: color.text,
    border: color.border,
    notification: color.danger,
  },
};

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
    <ThemeProvider value={connectedTheme}>
      <AmbientBackdropProvider>
        <View style={styles.shell} onTouchStart={markInteracted}>
          <View style={styles.navigation}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: color.background },
              headerTintColor: color.text,
              contentStyle: styles.transparent,
              headerBackVisible: false,
        // Le chevron seul, jamais le titre de l'écran précédent : celui des onglets n'en a
        // pas, et iOS repliait alors sur le **nom de la route** — un bouton « ‹ (tabs) » en
        // haut de chaque écran poussé, découvert sur une capture du sac (#30). Les trois
        // écrans poussés le portaient déjà.
        header: ({ back, options, route }) => (
          <SystemHeader title={options.title ?? route.name} canGoBack={back !== undefined} />
        ),
            }}
          >
      {/* La barre d'onglets porte désormais ses propres en-têtes (#41) : sans
          `headerShown: false` ici, celui de la pile se superposerait à celui des onglets. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sante" options={{ title: 'Santé' }} />
      <Stack.Screen name="reward" options={{ headerShown: false, presentation: 'modal' }} />
      {/* L'arène prend tout l'écran en paysage. Le combat rétablit le portrait au retour,
          et la modale empêche un geste de navigation de couper la séquence automatique. */}
      <Stack.Screen name="battle" options={{ headerShown: false, presentation: 'fullScreenModal',
        statusBarHidden: true, gestureEnabled: false }} />
          </Stack>
          </View>
        </View>
      </AmbientBackdropProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: color.background,
    overflow: 'hidden',
    borderLeftColor: color.border,
    borderRightColor: color.border,
    borderLeftWidth: ambient.gridLine,
    borderRightWidth: ambient.gridLine,
  },
  navigation: { flex: 1, zIndex: 1 },
  transparent: { backgroundColor: 'transparent' },
});
