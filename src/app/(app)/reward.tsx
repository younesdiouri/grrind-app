import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { queryClient } from '@/api/queryClient';
import { color, space, type } from '@/design/tokens';
import { refreshInventoryAfterReward } from '@/features/inventory/inventoryCache';
import { getPending, markPlayed } from '@/features/reward/pending';
import { FIXTURES, type FixtureName } from '@/features/reward/fixtures';
import { SyncSummaryView } from '@/features/reward/SyncSummaryView';

/**
 * L'écran qui joue une synchronisation.
 *
 * Deux entrées, et la seconde n'est pas du décor : avec un paramètre `fixture`, il joue une
 * réponse capturée — c'est le banc d'essai, qui tourne sans réseau et sans montre. Sans
 * paramètre, il joue **la vraie**, celle que la dernière synchronisation a rapportée.
 *
 * Le résumé se lit dans le magasin plutôt que de traverser la navigation : un `SyncSummary` de
 * quinze workouts ne passe pas par un paramètre de route, et il vit déjà hors de l'arbre.
 * C'est le magasin des progressions **non jouées** — celui qui survit à la mort de l'app —
 * et non le résultat de la dernière synchronisation, qui disparaît avec le processus.
 *
 * C'est **ici** que « sortir » prend un sens. L'écran de récompense est plein cadre et sans
 * en-tête — voulu : c'est l'écran signature, un en-tête l'abîmerait — donc la sortie ne peut
 * venir que du contenu. Le composant dit quand le joueur veut partir, la route sait où.
 */

/**
 * `back()` quand il y a une pile, l'accueil sinon.
 *
 * Le garde n'est pas théorique : cet écran s'atteint depuis l'accueil comme depuis Santé,
 * et rien n'interdit qu'il devienne un jour la première vue d'un lancement à froid — auquel
 * cas `back()` ne mènerait nulle part.
 */
function leave(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/');
}

/**
 * Sortir d'une **vraie** progression : elle est jouée, elle peut s'effacer du disque.
 *
 * C'est ici et pas au montage. Une app tuée pendant l'animation n'a rien montré au joueur,
 * et il doit la retrouver au lancement suivant — c'est tout l'objet du magasin.
 *
 * Les fixtures, elles, n'effacent rien : ce sont des réponses capturées, pas la progression
 * de quelqu'un.
 */
function leavePlayed(summary: Parameters<typeof refreshInventoryAfterReward>[1]): void {
  // Le solde du résumé est déjà le verdict serveur : l'écrire avant de revenir évite une
  // image d'accueil périmée, puis l'invalidation relit aussi les éventuels objets tombés.
  void refreshInventoryAfterReward(queryClient, summary);
  markPlayed();
  leave();
}
export default function RewardScreen() {
  const { fixture } = useLocalSearchParams<{ fixture?: FixtureName }>();

  if (fixture !== undefined) {
    // `key` force un remontage à chaque fixture : la séquence se rejoue depuis le début
    // plutôt que de reprendre l'horloge de la précédente.
    return (
      <SyncSummaryView
        key={fixture}
        summary={FIXTURES[fixture] ?? FIXTURES.unWorkout}
        onDismiss={leave}
      />
    );
  }

  // Le magasin des progressions non jouées, et non le résultat de la dernière
  // synchronisation : c'est lui qui survit à la mort de l'app, donc lui qui fait foi.
  const summary = getPending();

  if (summary === null) {
    return (
      <View style={styles.empty}>
        <Text style={styles.body}>Rien à jouer pour le moment.</Text>
      </View>
    );
  }

  return <SyncSummaryView summary={summary} onDismiss={() => leavePlayed(summary)} />;
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    backgroundColor: color.background,
  },
  body: { ...type.body, color: color.textMuted },
});
