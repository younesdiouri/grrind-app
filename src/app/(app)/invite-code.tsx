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
  UNKNOWN_INVITE_CODE,
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
 * aucune route ne rend le code actif d'une guilde. L'écran s'ouvre donc toujours sur `unknown`
 * — pas sur « aucun code actif » — même si un code tourne déjà côté serveur : dire le
 * contraire inventerait une fermeture qui n'existe pas. Voir `inviteCodeState.ts` pour la
 * distinction entre cet état d'ouverture et `none`, qui lui est un fait acquis après un
 * `DELETE` réussi pendant cette visite. C'est aussi pourquoi **Révoquer reste affiché depuis
 * `unknown` comme depuis un code connu** : c'est le seul geste qui reste sûr sans connaître
 * l'état réel, et le contrat le rend idempotent pour ça (même `204`, code à couper ou non) — il
 * disparaît en revanche une fois qu'une révocation a réussi, le reproposer serait un bouton
 * mort.
 *
 * ————— Aucun optimisme —————————————————————————————————————————————————————————————————
 *
 * `state` ne bouge que sur la réponse d'`issueInviteCode` ou `revokeInviteCode` — jamais à
 * l'appui du bouton. Afficher un code mort le temps d'un aller-retour réseau serait pire que
 * de faire attendre.
 */
export default function InviteCodeScreen() {
  const { guildId } = useLocalSearchParams<{ guildId: string }>();

  const [state, setState] = useState<InviteCodeState>(UNKNOWN_INVITE_CODE);
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

      {state.kind === 'unknown' ? (
        <>
          {/* Ni « un code existe » ni « aucun code n'existe » : l'écran vient de s'ouvrir, il
              n'a encore rien vu (voir inviteCodeState.ts). L'avertissement précède l'appui,
              comme depuis un code connu — un fondateur qui a émis un code hier ne doit pas
              apprendre après coup qu'il vient de le couper. */}
          <Text style={styles.warning}>
            S&apos;il existe déjà un code actif, en générer un nouveau le coupe aussitôt.
          </Text>
          <Button
            label="Générer un code"
            onPress={() => void issue()}
            busy={busyAction === 'issue'}
            disabled={busyAction === 'revoke'}
          />
        </>
      ) : null}

      {state.kind === 'none' ? (
        <>
          {/* Ici, à la différence de `unknown`, l'écran sait vraiment : c'est lui qui vient de
              révoquer. Rien à couper en émettre un nouveau, donc aucun avertissement. */}
          <Text style={styles.body}>Code révoqué : personne ne peut plus rejoindre avec l&apos;ancien.</Text>
          <Button
            label="Générer un code"
            onPress={() => void issue()}
            busy={busyAction === 'issue'}
            disabled={busyAction === 'revoke'}
          />
        </>
      ) : null}

      {state.kind === 'active' || state.kind === 'regenerated' ? (
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
      ) : null}

      {failure !== null ? <Text style={styles.failure}>{messageFor(failure)}</Text> : null}

      {/* `none` est le seul état où révoquer est un bouton mort : l'écran vient déjà de le
          faire, le reproposer n'offrirait rien à couper. Dans les trois autres, y compris
          `unknown`, c'est le geste sûr quand on ne sait pas. */}
      {state.kind !== 'none' ? (
        <>
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
        </>
      ) : null}
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
