import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CoinAmount } from '@/components/CoinAmount';
import { CoinTransactionRow } from '@/components/CoinTransactionRow';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import { formatOccurredAt } from '@/features/inventory/format';
import { useCoinHistory } from '@/features/inventory/useCoinHistory';

/**
 * `/bourse` — le ledger de pièces (younesdiouri/grrind-back#225), poussé depuis le bloc bourse
 * du sac.
 *
 * ————— Le solde en tête, l'historique dessous —————————————————————————————————————————
 *
 * `balance` **est** servi par le serveur, jamais recalculé depuis `transactions` — un lot de
 * pièces plafonné à vingt lignes n'a de toute façon pas de quoi reconstituer un solde qui
 * remonte à la création du compte. Ça ne vaut que si le solde vient d'ailleurs, et c'est
 * exactement ce que `CoinHistoryPage.balance` rend à chaque page.
 *
 * ————— Ce qui n'est pas ici ——————————————————————————————————————————————————————————————
 *
 * Pas de filtre par raison, pas de total par période : le back ne sert rien de tout ça, et un
 * cumul calculé côté client sur une liste paginée au curseur serait faux dès la deuxième page —
 * même piège, même refus, que les filtres de l'historique de combat.
 */
export default function CoinLedgerScreen() {
  const { ledger, loadMore, reload } = useCoinHistory();

  // L'horloge est prise une fois par rendu, et non par ligne — même raison que l'onglet Combat :
  // vingt lignes qui appelleraient chacune `new Date()` daterait la première et la dernière à
  // des instants différents.
  const now = useMemo(() => new Date(), []);

  return (
    <FlatList
      data={ledger.step === 'ready' ? ledger.history.transactions : []}
      // `id`, jamais `occurredAt` : deux mouvements à la même seconde sont un cas normal, que
      // le départage par identifiant côté serveur existe pour couvrir.
      keyExtractor={(transaction) => transaction.id}
      contentContainerStyle={styles.content}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      renderItem={({ item }) => (
        <CoinTransactionRow
          reason={item.reason}
          amount={item.amount}
          when={formatOccurredAt(item.occurredAt, now)}
        />
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <Stack.Screen options={{ title: 'Bourse' }} />

          {ledger.step === 'ready' ? (
            <View style={styles.balance}>
              <Text style={styles.label}>SOLDE</Text>
              <CoinAmount amount={ledger.balance} />
            </View>
          ) : null}

          {ledger.step === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={color.accent} />
            </View>
          ) : null}

          {ledger.step === 'failed' ? (
            <View style={styles.card}>
              <Text style={styles.name}>Historique indisponible</Text>
              <Text style={styles.detail}>{messageFor(ledger.failure)}</Text>
              <Button label="Réessayer" onPress={reload} variant="quiet" />
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        // Seulement quand la lecture a abouti : un historique vide pendant le chargement
        // annoncerait « aucun mouvement » à quelqu'un qui en a trente. Une bourse neuve n'est
        // pas une panne, elle se nomme.
        ledger.step === 'ready' ? (
          <View style={styles.card}>
            <Text style={styles.name}>Aucun mouvement pour l’instant</Text>
            <Text style={styles.detail}>
              Les pièces tombent des séances créditées et des combats gagnés.
            </Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        ledger.step === 'ready' && ledger.loadingMore ? (
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
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  label: { ...type.label, color: color.textMuted },
  loading: { paddingVertical: space.xl, alignItems: 'center' },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  name: { ...type.title, color: color.text },
  detail: { ...type.body, color: color.textMuted },
  footer: { paddingVertical: space.md },
});
