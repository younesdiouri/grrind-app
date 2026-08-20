import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ToggleRow } from '@/components/ToggleRow';
import { color, notificationCategoryLabel, radius, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import {
  fetchProfile,
  updateNotificationPreference,
  type UserProfile,
} from '@/features/notifications/preferences';
import { useNotificationPermission } from '@/features/notifications/useNotificationPermission';

/**
 * Les réglages de notification — #57. Pas un quatrième onglet : une route poussée depuis
 * l'accueil (`(tabs)/index.tsx`), atteinte par un geste rare, comme `invite-code.tsx`.
 *
 * ————— La map, jamais une liste écrite en dur ——————————————————————————————————————————
 *
 * `notificationPreferences` (`GET /api/me`) est **toutes** les catégories connues du back,
 * jamais seulement celles coupées (#132) : cet écran itère sur `Object.keys(...)`, pas sur
 * l'enum `NotificationCategory` du contrat. Une catégorie ajoutée côté back doit apparaître
 * ici sans qu'on republie le client — c'est aussi pourquoi `notificationCategoryLabel`
 * (`design/tokens.ts`) est un `Partial` : une clé qu'il ne connaît pas encore s'affiche quand
 * même, brute, plutôt que de disparaître.
 *
 * ————— L'autorisation système, avant tout le reste ————————————————————————————————————
 *
 * Si iOS n'a pas accordé les notifications, ces interrupteurs ne veulent rien dire : le
 * serveur ne pousse plus rien vers cet appareil, quoi qu'ils affichent. iOS ne repose jamais
 * la question depuis l'app une fois refusée — le seul recours est Réglages système, donc
 * c'est le seul geste que ce cas propose.
 */
export default function ReglagesScreen() {
  const permission = useNotificationPermission();

  const [state, setState] = useState<
    { step: 'loading' } | { step: 'ready'; profile: UserProfile } | { step: 'failed'; failure: Failure }
  >({ step: 'loading' });

  // `load` ne touche jamais `state` avant l'attente réseau : l'état initial est déjà
  // `'loading'` (voir `useState` ci-dessus), donc rien à écrire de synchrone dans l'effet de
  // montage — seul `retry` (l'appui sur « Réessayer ») a besoin de repasser par `'loading'`.
  const load = () => {
    void fetchProfile().then((outcome) => {
      setState(
        outcome.ok ? { step: 'ready', profile: outcome.profile } : { step: 'failed', failure: outcome.failure },
      );
    });
  };

  useEffect(load, []);

  const retry = () => {
    setState({ step: 'loading' });
    load();
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: 'Réglages' }} />

      {permission === 'denied' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Les notifications sont désactivées</Text>
          <Text style={styles.body}>
            GRRIND n&apos;a pas la permission d&apos;envoyer de notifications sur cet appareil :
            les réglages ci-dessous n&apos;ont aucun effet tant que ça reste ainsi. iOS ne
            repose pas la question depuis l&apos;app — passe par Réglages système pour
            l&apos;autoriser.
          </Text>
          <Button
            label="Ouvrir Réglages"
            onPress={() => void Linking.openSettings()}
            variant="quiet"
          />
        </View>
      ) : null}

      {state.step === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : null}

      {state.step === 'failed' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Les réglages sont indisponibles</Text>
          <Text style={styles.body}>{messageFor(state.failure)}</Text>
          <Button label="Réessayer" onPress={retry} variant="quiet" />
        </View>
      ) : null}

      {state.step === 'ready' ? <Preferences profile={state.profile} onProfile={(profile) => setState({ step: 'ready', profile })} /> : null}
    </ScrollView>
  );
}

/**
 * Une catégorie à la fois : `updateNotificationPreference` n'envoie jamais qu'une entrée dans
 * `notificationPreferences`, et le tableau ne porte que ce qui change — le contrat le dit.
 *
 * Aucun optimisme : l'interrupteur cède la place à un témoin pendant l'appel (`ToggleRow`,
 * prop `busy`) et se recale sur la réponse du serveur, jamais sur ce qu'on vient de demander.
 */
function Preferences({
  profile,
  onProfile,
}: {
  profile: UserProfile;
  onProfile: (profile: UserProfile) => void;
}) {
  const [busyCategory, setBusyCategory] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const categories = Object.keys(profile.notificationPreferences);

  const toggle = async (category: string, enabled: boolean) => {
    setBusyCategory(category);
    setFailure(null);

    const outcome = await updateNotificationPreference(category, enabled);

    if (outcome.ok) {
      onProfile(outcome.profile);
    } else {
      setFailure(outcome.failure);
    }

    setBusyCategory(null);
  };

  if (categories.length === 0) {
    // Le contrat ne le promet pas vide, mais un écran muet vaudrait moins qu'un mot.
    return (
      <View style={styles.card}>
        <Text style={styles.body}>Aucune catégorie de notification n&apos;est encore ouverte.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {categories.map((category) => (
        <ToggleRow
          key={category}
          label={notificationCategoryLabel[category as keyof typeof notificationCategoryLabel] ?? category}
          value={profile.notificationPreferences[category] ?? false}
          onValueChange={(next) => void toggle(category, next)}
          busy={busyCategory === category}
          disabled={busyCategory !== null && busyCategory !== category}
        />
      ))}

      {failure === null ? null : <Text style={styles.failure}>{messageFor(failure)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  centered: { paddingVertical: space.xl, alignItems: 'center' },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  failure: { ...type.body, color: color.danger },
});
