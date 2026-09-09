import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AttributeLegend, AttributeRing } from '@/components/AttributeRing';
import { CharacterInventory } from '@/components/CharacterInventory';
import { Button } from '@/components/Button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar } from '@/components/XpBar';
import { progressFill } from '@/components/guildProgress';
import { color, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import { formatCalendarDate } from '@/features/community/format';
import { usePlayer, type Player } from '@/features/community/usePlayer';
import { VitalityNote } from '@/features/progression/PlayerHomeView';

/** Profil public : cercles, équipement, sac et statistiques, protégé par le voter serveur. */
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

          <PlayerAttributes player={player.data} />
          <CharacterInventory inventory={player.data.inventory} statistics={player.data.statistics} />

          <Text style={styles.body}>
            Membre GRRIND depuis le {formatCalendarDate(player.data.registeredAt)}.
          </Text>
        </ScrollView>
      )}
    </>
  );
}

/**
 * Le cercle de vie (#69) d'un co-équipier, sous sa barre d'XP.
 *
 * `Player.attributes` est un **état**, jamais un passage — à la différence de
 * `RewardSummary.attributes`, il ne porte ni `gained` ni avant/après (#70). Rien ici ne
 * s'anime donc au montage, à la différence de la même donnée sur son propre accueil : ce
 * profil affiche ce qui est, pas ce qui vient de se passer.
 *
 * `vitalityBreakdown` est rendu ici aussi (#77), et pour la même raison que sur son propre
 * accueil : la moitié « santé de fond » de Vitality bouge sans qu'aucune séance ne l'explique.
 * Un chiffre au centre d'un cercle, sans sa cause, ne récompense rien — et il en dit encore
 * moins sur le profil de quelqu'un d'autre, où on n'a pas la mémoire de ce qu'il a fait.
 */
function PlayerAttributes({ player }: { player: Player }) {
  const { vitality, ...attributes } = player.attributes;
  const empty = vitality <= 0 && Object.values(attributes).every((value) => value <= 0);

  return (
    <>
      <View style={styles.attributesRow}>
        <AttributeRing attributes={attributes} vitality={vitality} size="hero" />
        <View style={styles.legendWrap}>
          <AttributeLegend attributes={attributes} />
        </View>
      </View>

      {empty ? <Text style={styles.body}>Rien à répartir pour l&apos;instant.</Text> : null}

      <VitalityNote breakdown={player.vitalityBreakdown} />
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
  attributesRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  legendWrap: { flex: 1 },
});
