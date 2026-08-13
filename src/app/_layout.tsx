import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';

import { color } from '@/design/tokens';
import { restore } from '@/features/auth/session';
import { useAuth } from '@/features/auth/useAuth';
import { beginLaunch, isLaunchSettled, subscribeToLaunch } from '@/features/reward/launch';

// L'écran de démarrage tient jusqu'à ce que le trousseau ait répondu. Sans ça, l'app
// afficherait l'écran de connexion une fraction de seconde avant de le remplacer par
// l'accueil — un clignotement à chaque ouverture, pour une session parfaitement valide.
//
// Il tient aussi, **borné**, le temps de savoir s'il y a une progression à jouer : c'est ce
// qui fait de l'animation le premier écran plutôt qu'un plein écran qui surgit une seconde
// après l'accueil. L'attente se glisse dans un écran déjà affiché au lieu de s'ajouter après.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const auth = useAuth();

  useEffect(() => {
    // En développement, React monte deux fois : le coordinateur de rafraîchissement partage
    // sa promesse, donc il ne part quand même qu'un seul appel.
    void restore();
  }, []);

  // Un magasin externe plutôt qu'un `useState` : l'état du lancement est un fait du
  // processus, pas d'un composant, et l'écrire depuis un effet ferait rendre en cascade au
  // montage — ce que `react-hooks/set-state-in-effect` refuse à juste titre.
  const settled = useSyncExternalStore(subscribeToLaunch, isLaunchSettled);

  useEffect(() => {
    if (auth.status === 'restoring') {
      return;
    }

    // La pile connectée est rendue sous l'écran de démarrage, donc la synchronisation de
    // lancement est déjà partie quand on arrive ici. `beginLaunch` est idempotent.
    beginLaunch(auth.status === 'signedIn');
  }, [auth.status]);

  useEffect(() => {
    if (settled) {
      void SplashScreen.hideAsync();
    }
  }, [settled]);

  if (auth.status === 'restoring') {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: color.background },
          headerTintColor: color.text,
          contentStyle: { backgroundColor: color.background },
        }}
      >
        {/* Le garde ne protège pas les données — le serveur s'en charge — mais la
            navigation : un lien profond vers un écran connecté retombe sur la connexion,
            et la bascule de `status` déplace l'app toute seule, sans `router.replace`
            dispersé dans les écrans. */}
        <Stack.Protected guard={auth.status === 'signedIn'}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={auth.status === 'signedOut'}>
          <Stack.Screen name="login" options={{ title: 'Connexion' }} />
          <Stack.Screen name="register" options={{ title: 'Créer un compte' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
