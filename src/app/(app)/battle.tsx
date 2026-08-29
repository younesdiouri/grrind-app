import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { color, space, type } from '@/design/tokens';
import { failureFrom, messageFor, type Failure } from '@/features/auth/problems';
import { BattleView } from '@/features/combat/BattleView';
import { BATTLE_FIXTURES, type BattleFixtureName } from '@/features/combat/fixtures';
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

  router.replace('/combat');
}

export default function BattleScreen() {
  const { id, fixture } = useLocalSearchParams<{ id?: string; fixture?: BattleFixtureName }>();

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

  return <RealBattle id={id} />;
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

  useEffect(() => {
    if (battle !== null) {
      return;
    }

    let alive = true;

    void api.GET('/api/battles/{id}', { params: { path: { id } } }).then((reply) => {
      if (!alive) {
        return;
      }

      if (reply.data === undefined) {
        setFailure(failureFrom(reply.error));
        return;
      }

      setBattle(reply.data);
    });

    return () => {
      alive = false;
    };
    // `battle` n'est pas une dépendance : l'effet ne doit partir qu'une fois, et le poser
    // relancerait un appel à chaque fois que le combat arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (failure !== null) {
    return <Empty>{messageFor(failure)}</Empty>;
  }

  if (battle === null) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return <BattleView battle={battle} onDismiss={leave} />;
}

function Empty({ children }: { children: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    backgroundColor: color.background,
  },
  body: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
