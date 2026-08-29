import { Link } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BattleRow } from '@/components/BattleRow';
import { Button } from '@/components/Button';
import { EnemyCard } from '@/components/EnemyCard';
import { color, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import { formatFoughtAt, formatTurns } from '@/features/combat/format';
import { useBattleHistory } from '@/features/combat/useBattleHistory';
import { useCatalog } from '@/features/combat/useCatalog';

/**
 * L'onglet Combat : les adversaires, puis l'archive.
 *
 * Même ordre que partout ailleurs dans l'app — ce qui se fait en haut, ce qui s'est fait en
 * bas. Le catalogue est ce qu'on vient chercher ; l'historique est ce qu'on consulte après.
 *
 * ————— Une seule vue défilante, et c'est pour ça que le catalogue est un en-tête ————————
 *
 * L'historique pagine au curseur : il lui faut une `FlatList` et son `onEndReached`. Un
 * catalogue posé **au-dessus** d'elle, dans un `ScrollView` parent, donnerait deux surfaces
 * défilantes imbriquées — le geste deviendrait imprévisible et `onEndReached` ne partirait
 * jamais. Il est donc `ListHeaderComponent`, ce qui n'est pas un détour : c'est ce qui fait
 * de l'écran une seule colonne qui se lit d'un bout à l'autre.
 *
 * ————— Ce qui n'est pas encore là ————————————————————————————————————————————————————
 *
 * Une ligne d'historique se rejoue depuis #114 ; le catalogue, lui, ne propose encore rien.
 * Le bouton qui lance un combat arrive au ticket suivant — dans cet ordre, parce qu'un
 * « Combattre » qui n'aurait nulle part où mener ne serait pas une demi-fonctionnalité mais
 * un cul-de-sac.
 */
export default function CombatScreen() {
  const { catalog, reload: reloadCatalog } = useCatalog();
  const { history, loadMore } = useBattleHistory();

  // L'horloge est prise **une fois** par rendu, et non par ligne : vingt lignes qui
  // appelleraient chacune `new Date()` daterait la première et la dernière à des instants
  // différents, et la liste changerait de phrase sous les doigts au fil du défilement.
  const now = useMemo(() => new Date(), []);

  return (
    <FlatList
      data={history.step === 'ready' ? history.history.battles : []}
      // `id`, jamais l'instant : deux combats livrés à la même seconde sont un cas normal —
      // c'est même le cas que le départage par identifiant existe pour couvrir côté serveur.
      keyExtractor={(battle) => battle.id}
      contentContainerStyle={styles.content}
      onEndReached={loadMore}
      // Assez tôt pour que la page suivante arrive avant qu'on ait fini de lire la courante,
      // assez tard pour ne pas charger l'historique entier au premier effleurement.
      onEndReachedThreshold={0.4}
      renderItem={({ item }) => (
        // L'historique porte des résumés, jamais des timelines : `GET /api/battles` ne rend
        // que cinq champs par ligne, et l'écran de rejeu va chercher le combat entier par son
        // identifiant. C'est un aller-retour de plus au moment où le joueur choisit, contre
        // une liste qui reste légère à chaque chargement (younesdiouri/grrind-back#220).
        <Link href={{ pathname: '/battle', params: { id: item.id } }} asChild>
          {/* `asChild` clone l'enfant avec `onPress` : même idiome que le roster de guilde. */}
          <Pressable>
            <BattleRow
              result={item.result}
              enemyName={item.enemy.name}
              turns={formatTurns(item.turns)}
              when={formatFoughtAt(item.foughtAt, now)}
            />
          </Pressable>
        </Link>
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Adversaires</Text>

          {catalog.step === 'loading' && <ActivityIndicator color={color.accent} />}

          {catalog.step === 'failed' && (
            <View style={styles.retry}>
              <Text style={styles.body}>{messageFor(catalog.failure)}</Text>
              <Button label="Réessayer" onPress={reloadCatalog} variant="quiet" />
            </View>
          )}

          {catalog.step === 'ready' && (
            <View style={styles.catalog}>
              {catalog.entries.map(({ enemy, locked }) => (
                <EnemyCard key={enemy.key} enemy={enemy} locked={locked} />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Combats</Text>

          {history.step === 'loading' && <ActivityIndicator color={color.accent} />}

          {history.step === 'failed' && <Text style={styles.body}>{messageFor(history.failure)}</Text>}
        </View>
      }
      ListEmptyComponent={
        // Seulement quand la lecture a abouti : un historique vide pendant le chargement
        // annoncerait « aucun combat » à quelqu'un qui en a trente.
        history.step === 'ready' ? (
          <Text style={styles.body}>
            Aucun combat livré pour l’instant. Le premier t’attend là-haut.
          </Text>
        ) : null
      }
      ListFooterComponent={
        history.step === 'ready' && history.loadingMore ? (
          <ActivityIndicator color={color.accent} style={styles.footer} />
        ) : null
      }
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.background },
  content: { padding: space.lg, gap: space.sm },
  header: { gap: space.md, paddingBottom: space.sm },
  sectionTitle: { ...type.label, color: color.textMuted },
  catalog: { gap: space.sm },
  retry: { gap: space.sm, alignItems: 'flex-start' },
  body: { ...type.body, color: color.textMuted },
  footer: { paddingVertical: space.md },
});
