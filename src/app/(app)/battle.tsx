import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { failureFrom, messageFor, type Failure } from '@/features/auth/problems';
import { BattleView } from '@/features/combat/BattleView';
import { BATTLE_FIXTURES, DEMO_DUEL, type BattleFixtureName } from '@/features/combat/fixtures';
import { useAvatarProfile } from '@/features/avatar/useAvatarProfile';
import { useInventory } from '@/features/inventory/useInventory';
import { serverAvatar } from '@/features/combat/serverAvatar';
import { takeHandOver } from '@/features/combat/lastBattle';
import type { Battle } from '@/features/combat/timeline';

/**
 * L'écran qui joue un combat.
 *
 * Deux entrées, comme `reward.tsx`, et la seconde n'est pas du décor. Avec un paramètre
 * `fixture`, il joue une réponse capturée — c'est le banc d'essai, qui tourne sans réseau et
 * sans montre. Avec un `id`, il joue un vrai combat : celui qu'on vient de livrer s'il est
 * encore en main, sinon celui que `GET /api/battles/{id}` rend.
 *
 * C'est **ici** que « sortir » prend un sens. L'écran est plein cadre et sans en-tête — voulu,
 * comme celui de la récompense : un en-tête abîmerait la mise en scène — donc la sortie ne
 * peut venir que du contenu. Le composant dit quand le joueur veut partir, la route sait où.
 */

/**
 * `back()` quand il y a une pile, l'onglet Combat sinon.
 *
 * Le garde n'est pas théorique : cet écran s'atteindra depuis l'historique comme depuis le
 * lancement d'un combat, et rien n'interdit qu'une notification l'ouvre un jour à froid — dans
 * ce cas `back()` ne mènerait nulle part.
 */
function leave(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/arene');
}

export default function BattleScreen() {
  const { id, fixture, demo } = useLocalSearchParams<{ id?: string; fixture?: BattleFixtureName; demo?: string }>();

  if (fixture === 'duel' && demo === '1') return <DemoDuel />;

  if (fixture !== undefined) {
    // `key` force un remontage à chaque fixture : la séquence se rejoue depuis le début plutôt
    // que de reprendre l'horloge de la précédente.
    return (
      <BattleView
        key={fixture}
        battle={BATTLE_FIXTURES[fixture] ?? BATTLE_FIXTURES.victoire}
        onDismiss={leave}
      />
    );
  }

  if (id === undefined) {
    return <Empty>Aucun combat à jouer.</Empty>;
  }

  return <RealBattle key={id} id={id} />;
}

/** Aucun POST de défi : la fiche montre une démonstration sans modifier la progression. */
function DemoDuel() {
  const profile = useAvatarProfile();
  const inventory = useInventory();
  return <BattleView battle={DEMO_DUEL} demo onDismiss={leave}
    unityPlayer={profile.data && inventory.data ? serverAvatar(profile.data.avatar, inventory.data.equipment) : undefined} />;
}

/**
 * Un combat réel : celui qu'on a en main, ou celui qu'on va chercher.
 *
 * La reprise en main se fait **avant** le premier rendu et non dans un effet : le combat qu'on
 * vient de livrer est déjà là, et passer par un état de chargement pour l'afficher ferait
 * clignoter l'écran entre le bouton et l'animation.
 */
function RealBattle({ id }: { id: string }) {
  const [battle, setBattle] = useState<Battle | null>(() => takeHandOver(id));
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setFailure(null);
    setAttempt(value => value + 1);
  };

  useEffect(() => {
    if (battle !== null) {
      return;
    }

    let alive = true;
    const controller = new AbortController();

    void api.GET('/api/battles/{id}', { params: { path: { id } }, signal: controller.signal }).then((reply) => {
      if (!alive) {
        return;
      }

      if (reply.data === undefined) {
        setFailure(failureFrom(reply.error));
        return;
      }

      setBattle(reply.data);
    }, (error: unknown) => {
      if (alive) setFailure(failureFrom(error));
    });

    return () => {
      alive = false;
      controller.abort();
    };
    // `battle` n'est pas une dépendance : seules l'entrée et une nouvelle tentative relisent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, attempt]);

  if (failure !== null) {
    return <Empty onRetry={retry}>{messageFor(failure)}</Empty>;
  }

  if (battle === null) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={color.accent} />
        <Button label="Fermer" variant="quiet" onPress={leave} />
      </View>
    );
  }

  return <BattleView battle={battle} onDismiss={leave} />;
}

function Empty({ children, onRetry }: { children: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.body}>{children}</Text>
      {onRetry && <Button label="Réessayer" onPress={onRetry} />}
      <Button label="Fermer" variant="quiet" onPress={leave} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
    backgroundColor: color.background,
  },
  body: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
