import { router, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { color, disciplineLabel, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { formatTurnDeadline } from '@/features/community/format';
import { chooseRisalaTurn } from '@/features/community/risalaTurnActions';
import { turnRefusalFrom } from '@/features/community/turnRefusal';
import { MY_GUILD_QUERY_KEY } from '@/features/community/useMyGuild';
import { RISALAT_QUERY_KEY, useRisalat, type Risalat } from '@/features/community/useRisalat';

type Discipline = components['schemas']['Discipline'];

/**
 * Choisir la Risāla de la semaine — #106, poussé depuis `RisalatBlock` quand `turn.mine`, sur
 * le modèle de `invite-code.tsx` : une pile, pas un onglet.
 *
 * ————— Le choix est aveugle, et se remplace jusqu'à l'échéance ———————————————————————————
 *
 * `PUT` est idempotent par nature — pas de `POST`, pas de 409 « déjà choisi » — donc cet
 * écran ne se referme jamais sur un accusé de réception : tant qu'il est ouvert avant
 * l'échéance, taper une autre discipline remplace le choix précédent. `turn.discipline` porte
 * le choix courant, renseigné pour son auteur seul, et vient de `useRisalat` — le même cache
 * que `RisalatBlock` — plutôt que d'un paramètre de route qui pourrait être périmé au moment
 * où l'écran s'ouvre réellement.
 *
 * ————— `choosable` n'est pas une suggestion ——————————————————————————————————————————————
 *
 * La liste vient telle quelle du serveur, jamais reconstruite depuis `Discipline` : ce serait
 * recopier une règle de jeu qui divergerait au premier réglage d'équilibrage. Vide, elle est
 * un état à dessiner — improbable à douze membres, pas impossible à trois.
 */
export default function RisalaTurnScreen() {
  const risalat = useRisalat();
  const queryClient = useQueryClient();
  // La discipline en cours d'envoi, pas un simple booléen : elle sert à la fois à désarmer
  // tous les boutons (double envoi impossible) et à montrer le témoin sur celui qu'on vient
  // de taper, pas sur un autre.
  const [submitting, setSubmitting] = useState<Discipline | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  // La guilde a disparu pendant qu'on choisissait : le même geste que `forgetGuild` dans
  // l'onglet (`guilde.tsx`) — les deux caches où elle survivrait à l'écran s'effacent
  // ensemble — puis on recule, pour ne pas laisser un écran mort derrière soi.
  const forgetGuildAndGoBack = () => {
    queryClient.setQueryData(MY_GUILD_QUERY_KEY, null);
    queryClient.removeQueries({ queryKey: RISALAT_QUERY_KEY });
    router.back();
  };

  const submit = async (discipline: Discipline) => {
    setSubmitting(discipline);
    setFailure(null);

    const outcome = await chooseRisalaTurn(discipline);

    if (outcome.ok) {
      // La réponse est le bloc complet — « rien à recharger », dit le contrat — elle
      // remplace donc directement le cache de `useRisalat`, sans second `GET` qui gagnerait
      // la course contre l'écran qu'il est censé mettre à jour. Le geste se termine là où il
      // a commencé : de retour sur le bloc, avec la Risāla à venir déjà visible.
      queryClient.setQueryData<Risalat>(RISALAT_QUERY_KEY, outcome.risalat);
      router.back();
      return;
    }

    const refusal = turnRefusalFrom(outcome.failure);

    switch (refusal.kind) {
      // L'échéance est passée pendant qu'on hésitait : ça ne se réessaie pas, on recule et on
      // le dit — aucun bouton « réessayer ».
      case 'turn-closed':
        Alert.alert(messageFor(outcome.failure), undefined, [
          { text: 'OK', onPress: () => router.back() },
        ]);
        setSubmitting(null);
        return;

      // Il n'y a plus de tour à répondre — mort de sa belle mort, ou plus le sien : les deux
      // reculent vers le bloc, qui dira la bonne phrase à l'ouverture suivante.
      case 'turn-gone':
        Alert.alert(messageFor(outcome.failure), undefined, [
          { text: 'OK', onPress: () => router.back() },
        ]);
        setSubmitting(null);
        return;

      case 'guild-gone':
        forgetGuildAndGoBack();
        return;

      // `choosable` a changé sous nos pieds : on la rafraîchit et on laisse rechoisir, sans
      // quitter l'écran — c'est le seul refus qui se corrige ici même.
      case 'choosable-stale':
        setFailure(outcome.failure);
        setSubmitting(null);
        void risalat.refetch();
        return;

      case 'other':
        setFailure(outcome.failure);
        setSubmitting(null);
        return;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: 'Choisir la discipline de la semaine' }} />

      {risalat.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : risalat.isError ? (
        <>
          <Text style={styles.body}>{messageFor(risalat.error)}</Text>
          <Button label="Réessayer" onPress={() => void risalat.refetch()} variant="quiet" />
        </>
      ) : risalat.data.turn === null || !risalat.data.turn.mine ? (
        // Le tour a disparu — ou n'est plus le sien — pendant que l'écran s'ouvrait : pas un
        // écran mort, une phrase et le chemin du retour.
        <>
          <Text style={styles.body}>Il n&apos;y a plus de tour à répondre.</Text>
          <Button label="Retour" onPress={() => router.back()} variant="quiet" />
        </>
      ) : (
        <TurnPicker
          turn={risalat.data.turn}
          submitting={submitting}
          failure={failure}
          onChoose={(discipline) => void submit(discipline)}
        />
      )}
    </ScrollView>
  );
}

function TurnPicker({
  turn,
  submitting,
  failure,
  onChoose,
}: {
  turn: NonNullable<Risalat['turn']>;
  submitting: Discipline | null;
  failure: Failure | null;
  onChoose: (discipline: Discipline) => void;
}) {
  const busy = submitting !== null;

  return (
    <>
      <Text style={styles.title}>C&apos;est ton tour.</Text>
      <Text style={styles.body}>
        {formatTurnDeadline(turn.deadline)}, ta Risāla part — personne ne verra ce que tu as
        choisi avant que la guilde entière ne le découvre.
      </Text>

      {turn.discipline !== null ? (
        <Text style={styles.current}>
          Choix actuel : {disciplineLabel[turn.discipline]}. Tu peux encore le changer.
        </Text>
      ) : null}

      {failure !== null ? <Text style={styles.failure}>{messageFor(failure)}</Text> : null}

      {turn.choosable.length === 0 ? (
        // Toutes les disciplines créditantes sont déjà portées par une Risāla vivante :
        // improbable à douze, pas impossible à trois. Un vide dessiné, pas un écran muet.
        <Text style={styles.body}>
          Tous les sports qui rapportent de l&apos;XP sont déjà portés par une Risāla en cours.
          Reviens plus tard.
        </Text>
      ) : (
        <View style={styles.options}>
          {turn.choosable.map((discipline) => (
            <Button
              key={discipline}
              label={disciplineLabel[discipline]}
              onPress={() => onChoose(discipline)}
              busy={submitting === discipline}
              disabled={busy && submitting !== discipline}
              variant={turn.discipline === discipline ? 'solid' : 'quiet'}
            />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  current: { ...type.body, color: color.text },
  failure: { ...type.body, color: color.danger },
  options: { gap: space.sm },
});
