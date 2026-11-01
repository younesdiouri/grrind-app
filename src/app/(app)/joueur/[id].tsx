import { Stack, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { PlayerProfile } from '@/components/PlayerProfile';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { challenge } from '@/features/combat/fight';
import { usePlayer } from '@/features/community/usePlayer';
import { LeagueMotion } from '@/features/league/LeagueMotion';
import { LeagueSheet } from '@/features/league/LeagueSheet';
import { useLeague } from '@/features/league/useLeague';

/** Identité de ligue et personnage équipé, protégés par le voter serveur. */
export default function JoueurScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const player = usePlayer(id);
  const auth = useAuth();
  const focused = useIsFocused();
  const own = auth.status === 'signedIn' && auth.user.id === id;
  const league = useLeague(auth.status === 'signedIn' ? auth.user.id : undefined, own && focused);
  const [weekOpen, setWeekOpen] = useState(false);

  return (
    <>
      {/* Le titre de la pile suit le nom une fois qu'il est connu ; avant, il reste muet
          plutôt que d'afficher le paramètre de route brut le temps du chargement. */}
      <Stack.Screen options={{ title: player.data?.displayName ?? '' }} />

      {player.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : player.isError ? (
        <ScrollView contentContainerStyle={styles.screen}>
          <Text style={styles.title}>Ce joueur est introuvable</Text>
          <Text style={styles.body}>{messageFor(player.error)}</Text>
          <Button label="Réessayer" onPress={() => void player.refetch()} variant="quiet" />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.screen}>
          <PlayerProfile player={{ ...player.data, league: own && league.data ? league.data.league : player.data.league }}
            equipment={player.data.inventory.equipment} action={<Challenge id={id} name={player.data.displayName} />}
            onLeaguePress={own ? () => { setWeekOpen(true); void league.refetch(); } : undefined}
            motion={<LeagueMotion tier={own && league.data ? league.data.league.tier : player.data.league.tier} />} />
        </ScrollView>
      )}
      {own && <LeagueSheet visible={weekOpen && focused} onClose={() => setWeekOpen(false)} query={league} />}
    </>
  );
}

/**
 * Le défi (younesdiouri/grrind-back#283) : un bouton, et l'écran de combat derrière.
 *
 * ————— Pourquoi il disparaît au lieu de se griser —————————————————————————————————————
 *
 * Cet écran sert aussi à **se regarder soi-même** — première clause du voter serveur — et le
 * serveur refuse l'auto-défi. Un bouton grisé sur son propre profil poserait une question sans
 * réponse (« qu'est-ce qui me manque ? ») ; l'absence n'en pose aucune.
 *
 * ————— Pourquoi rien n'est rechargé au retour ————————————————————————————————————————
 *
 * Le combat est déjà **en main** quand le verdict tombe : le back rend la timeline entière sur
 * le `POST`, et `/battle` la reprend sans second appel. Cet écran n'a donc rien à faire du
 * `Battle` qu'il vient de recevoir, sinon en passer l'identifiant.
 *
 * Un seul défi en vol : le bouton devient occupé et l'appui ne passe plus. Deux défis lancés
 * en parallèle seraient deux intentions, donc deux clés, donc deux combats écrits pour une
 * seule animation regardée — même raisonnement que l'onglet Combat.
 */
function Challenge({ id, name }: { id: string; name: string }) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<Failure | null>(null);

  if (auth.status !== 'signedIn' || auth.user.id === id) {
    return null;
  }

  const launch = async () => {
    setBusy(true);
    setRefusal(null);

    const outcome = await challenge(id);
    setBusy(false);

    if (outcome.kind === 'fought') {
      router.push({ pathname: '/battle', params: { id: outcome.battle.id } });
      return;
    }

    setRefusal(outcome.failure);
  };

  return (
    <View style={styles.challenge}>
      <Button
        label="Défier"
        accessibilityLabel={`Défier ${name}`}
        busy={busy}
        onPress={() => {
          void launch();
        }}
      />
      {refusal === null ? null : <Text style={styles.body}>{messageFor(refusal)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  challenge: { gap: space.xs },
});
