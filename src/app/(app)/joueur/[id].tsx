import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar } from '@/components/XpBar';
import { progressFill } from '@/components/guildProgress';
import { color, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import { formatCalendarDate } from '@/features/community/format';
import { usePlayer } from '@/features/community/usePlayer';

/**
 * Le profil d'un co-équipier — `GET /api/players/{id}`, poussé sur le Stack au-dessus des
 * onglets. Un détail, pas une destination : pas de présentation modale, pas d'en-tête à soi,
 * juste la pile qui s'ouvre d'une ligne de plus.
 *
 * ————— Ce qui n'y figure pas est la moitié du contrat ——————————————————————————————————
 *
 * `displayName`, `registeredAt`, `level`, `xpIntoLevel`, `xpToNextLevel`, `title` : **rien
 * d'autre**. Ni rôle dans la guilde (ce profil n'en connaît même pas — c'est `GuildMember`
 * qui l'étale, pas `Player`), ni séances, ni *prochain* titre visé : ce dernier n'a de sens
 * que sur son propre profil (`GET /api/me`), et personne n'a à savoir ce qu'un co-équipier
 * est en train de viser.
 *
 * `404 player-not-found` couvre indistinctement « inconnu » et « hors de la guilde » — et
 * jamais 403, les UUID v7 du contrat encodant leur instant de création. L'écran ne cherche
 * donc pas à distinguer les deux cas, il affiche le même refus dans les deux cas.
 */
export default function JoueurScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const player = usePlayer(id);

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
          <View style={styles.headLine}>
            <PlayerAvatar name={player.data.displayName} />
            <Text style={styles.name}>{player.data.displayName}</Text>
          </View>

          <View style={styles.progress}>
            <Text style={styles.level}>Niveau {player.data.level}</Text>
            <XpBar size="hero" fill={progressFill(player.data)} />
          </View>

          {player.data.title === null ? null : <TitleBadge name={player.data.title.name} />}

          <Text style={styles.body}>
            Membre GRRIND depuis le {formatCalendarDate(player.data.registeredAt)}.
          </Text>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { ...type.title, color: color.text, flexShrink: 1 },
  progress: { gap: space.xs },
  level: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  title: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
});
