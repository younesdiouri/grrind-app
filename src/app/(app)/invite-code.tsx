import { Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { InviteCodeBlock } from '@/components/InviteCodeBlock';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { issueInviteCode, revokeInviteCode } from '@/features/community/inviteCodeActions';
import {
  inviteCodeIssued,
  inviteCodeRevoked,
  NO_INVITE_CODE,
  type InviteCodeState,
} from '@/features/community/inviteCodeState';
import { formatInviteExpiry } from '@/features/progression/format';

/**
 * Le code d'invitation d'une guilde — #44. Poussé depuis `Roster` (`(tabs)/guilde.tsx`), et
 * seulement quand `role === 'FOUNDER'` : cet écran ne le revérifie pas lui-même, le rappel du
 * projet étant que `role` ne fait que décider quoi dessiner, jamais ce qui est permis — un
 * appel direct d'un membre recevrait un `forbidden` du serveur, affiché comme n'importe quel
 * refus.
 *
 * ————— Pas de `GET`, donc pas de mémoire entre deux visites ——————————————————————————————
 *
 * Le contrat ne sert que `POST` (émettre, ce qui révoque le précédent) et `DELETE` (révoquer) :
 * aucune route ne rend le code actif d'une guilde. L'écran s'ouvre donc toujours sur `none`,
 * même si un code tourne déjà côté serveur — ce n'est pas un manque à combler ici, voir
 * `inviteCodeState.ts`. C'est aussi pourquoi **Révoquer reste affiché dans les trois états** :
 * c'est le seul geste qui reste sûr sans connaître l'état réel, et le contrat le rend
 * idempotent pour ça (même `204`, code à couper ou non).
 *
 * ————— Aucun optimisme —————————————————————————————————————————————————————————————————
 *
 * `state` ne bouge que sur la réponse d'`issueInviteCode` ou `revokeInviteCode` — jamais à
 * l'appui du bouton. Afficher un code mort le temps d'un aller-retour réseau serait pire que
 * de faire attendre.
 */
export default function InviteCodeScreen() {
  const { guildId } = useLocalSearchParams<{ guildId: string }>();

  const [state, setState] = useState<InviteCodeState>(NO_INVITE_CODE);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busyAction, setBusyAction] = useState<'issue' | 'revoke' | null>(null);
  // Le code copié, pas un booléen : un « Copié » qui survivrait à une régénération
  // afficherait un retour vrai pour un geste qui ne l'est plus.
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const issue = async () => {
    setBusyAction('issue');
    setFailure(null);

    const outcome = await issueInviteCode(guildId);

    if (outcome.ok) {
      setState((previous) => inviteCodeIssued(previous, outcome.code));
    } else {
      setFailure(outcome.failure);
    }

    setBusyAction(null);
  };

  const revoke = async () => {
    setBusyAction('revoke');
    setFailure(null);

    const outcome = await revokeInviteCode(guildId);

    if (outcome.ok) {
      setState(inviteCodeRevoked());
    } else {
      setFailure(outcome.failure);
    }

    setBusyAction(null);
  };

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    // Le seul aller-retour vers JS de cet écran, comme dans la récompense : un retour qui se
    // sent, pour un geste qui ne change rien à l'écran.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const share = (code: string) => {
    // La feuille de partage native de React Native, pas `expo-sharing` : ce module-là ne
    // partage que des fichiers locaux (SDK 57), jamais du texte. Le message se suffit à
    // lui-même — le destinataire n'a peut-être pas l'app installée.
    void Share.share({
      message: `Rejoins ma guilde sur GRRIND avec le code ${code}. Ouvre l'app, onglet Guilde, puis « Rejoindre avec un code ».`,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: "Code d'invitation" }} />

      <Text style={styles.body}>
        C&apos;est le seul moyen d&apos;entrer dans cette guilde : il se partage hors de l&apos;app, et
        seul un joueur déjà inscrit peut le consommer.
      </Text>

      {state.kind === 'none' ? (
        <>
          <Text style={styles.body}>Aucun code n&apos;est actif : personne ne peut rejoindre pour l&apos;instant.</Text>
          <Button
            label="Générer un code"
            onPress={() => void issue()}
            busy={busyAction === 'issue'}
            disabled={busyAction === 'revoke'}
          />
        </>
      ) : (
        <>
          {state.kind === 'regenerated' ? (
            <Text style={styles.confirm}>Nouveau code généré : l&apos;ancien ne fonctionne plus.</Text>
          ) : null}

          <InviteCodeBlock
            code={state.code.code}
            expiresAt={formatInviteExpiry(state.code.expiresAt, new Date())}
          />

          <Button
            label={copiedCode === state.code.code ? 'Copié' : 'Copier'}
            onPress={() => void copy(state.code.code)}
            variant="quiet"
          />
          <Button label="Partager" onPress={() => share(state.code.code)} />

          <Text style={styles.warning}>
            Régénérer révoque ce code immédiatement : quiconque ne l&apos;a pas encore utilisé ne
            pourra plus entrer.
          </Text>
          <Button
            label="Régénérer"
            onPress={() => void issue()}
            busy={busyAction === 'issue'}
            disabled={busyAction === 'revoke'}
            variant="quiet"
          />
        </>
      )}

      {failure !== null ? <Text style={styles.failure}>{messageFor(failure)}</Text> : null}

      <Text style={styles.warning}>
        Révoquer ferme la guilde à l&apos;entrée, sans en proposer un autre.
      </Text>
      <Button
        label="Révoquer le code"
        onPress={() => void revoke()}
        busy={busyAction === 'revoke'}
        disabled={busyAction === 'issue'}
        variant="quiet"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  body: { ...type.body, color: color.textMuted },
  // `color.gain` est réservé à une ligne d'XP positive (voir tokens.ts) : cette confirmation
  // ne parle pas de jeu, elle reste sur `text`, juste au-dessus du corps atténué qui l'entoure.
  confirm: { ...type.body, color: color.text },
  warning: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  failure: { ...type.body, color: color.danger },
});
