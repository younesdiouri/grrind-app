import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor, violationsByField, type Failure } from '@/features/auth/problems';
import { GuildMilestone } from '@/features/community/GuildMilestone';
import { foundGuild, joinGuild, type Guild } from '@/features/community/guildActions';
import { isCompleteInviteCode, sanitizeInviteCode } from '@/features/community/inviteCode';
import { joinRefusalFrom, type JoinRefusal } from '@/features/community/joinRefusal';
import { useMyGuild } from '@/features/community/useMyGuild';

/**
 * L'onglet Guilde.
 *
 * ————— La porte du module ——————————————————————————————————————————————————————————————
 *
 * `GET /api/guilds/mine` rend `{ "guild": null }` avec un **200** quand le joueur n'a pas de
 * guilde : c'est un état normal, pas une panne, et l'écran invite au lieu de s'excuser. Deux
 * chemins en sortent, d'égale importance — fonder, rejoindre — parce qu'aucun des deux n'est
 * le parcours principal : on fonde quand on est le premier, on rejoint quand on est invité.
 *
 * ————— Ce qui n'est pas ici ——————————————————————————————————————————————————————————————
 *
 * `guild !== null` n'ouvre qu'un **jalon minimal** (`GuildMilestone`) : l'écran des membres,
 * ses six briques (#40) et son ordre fondateur-d'abord (#43), viennent après ce ticket.
 */
export default function GuildeScreen() {
  const myGuild = useMyGuild();

  // Le résultat d'une fondation ou d'un ralliement réussis. La réponse du serveur est une
  // `Guild` complète : la rejouer par un second `GET /api/guilds/mine` serait une requête
  // pour rien, et gagnerait la course contre la mise en scène qu'elle est censée précéder.
  // `/api/guilds/mine` reprend la main tout seul à la prochaine ouverture de l'onglet.
  const [justResolved, setJustResolved] = useState<Guild | null>(null);
  const [mode, setMode] = useState<'empty' | 'found' | 'join'>('empty');

  const guild = justResolved ?? myGuild.data ?? null;

  if (guild !== null) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <GuildMilestone guild={guild} />
      </ScrollView>
    );
  }

  if (myGuild.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  if (myGuild.isError) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.title}>La guilde est indisponible</Text>
        <Text style={styles.body}>{messageFor(myGuild.error)}</Text>
        <Button label="Réessayer" onPress={() => void myGuild.refetch()} variant="quiet" />
      </ScrollView>
    );
  }

  // Un joueur qui apprend en plein formulaire qu'il a déjà une guilde — fondée ou rejointe
  // depuis un autre appareil pendant qu'il remplissait celui-ci — n'a pas de second appel à
  // faire lui-même : `refetch` va chercher la vraie guilde, et ce même écran bascule sur
  // `GuildMilestone` dès qu'elle arrive.
  const goToMyGuild = () => void myGuild.refetch();

  if (mode === 'found') {
    return (
      <FoundForm
        onFounded={setJustResolved}
        onCancel={() => setMode('empty')}
        onAlreadyInAGuild={goToMyGuild}
      />
    );
  }

  if (mode === 'join') {
    return (
      <JoinForm
        onJoined={setJustResolved}
        onCancel={() => setMode('empty')}
        onAlreadyInAGuild={goToMyGuild}
      />
    );
  }

  return <EmptyState onFound={() => setMode('found')} onJoin={() => setMode('join')} />;
}

/**
 * L'état vide. **Il dit à quoi sert une guilde, pas qu'il n'y en a pas** — le titre porte la
 * référence du ticket telle quelle, et rien avant elle ne parle d'absence ou d'excuse.
 */
function EmptyState({ onFound, onJoin }: { onFound: () => void; onJoin: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>
        Une guilde, c&apos;est voir où en sont les gens avec qui tu t&apos;entraînes.
      </Text>
      <Text style={styles.body}>Fonde la tienne, ou rejoins-en une avec un code reçu.</Text>

      {/* Les deux chemins au même niveau : ni l'un ni l'autre n'est le parcours principal. */}
      <Button label="Fonder une guilde" onPress={onFound} />
      <Button label="Rejoindre avec un code" onPress={onJoin} variant="quiet" />
    </ScrollView>
  );
}

/** Le nom vient du contrat (1 à 40 caractères) : ce compteur ne fait qu'annoncer la règle, le serveur reste seul à la faire respecter. */
const GUILD_NAME_MAX_LENGTH = 40;

function FoundForm({
  onFounded,
  onCancel,
  onAlreadyInAGuild,
}: {
  onFounded: (guild: Guild) => void;
  onCancel: () => void;
  onAlreadyInAGuild: () => void;
}) {
  const [name, setName] = useState('');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  const violations = failure === null ? {} : violationsByField(failure);
  const alreadyInAGuild =
    failure?.kind === 'problem' &&
    failure.problem.type === 'https://grrind.app/problems/player-already-in-a-guild';

  const submit = async () => {
    setBusy(true);
    setFailure(null);

    const outcome = await foundGuild(name.trim());

    if (outcome.ok) {
      onFounded(outcome.guild);
      return;
    }

    setFailure(outcome.failure);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Fonder une guilde</Text>
        <Text style={styles.body}>
          Le nom se lit, il ne désigne pas : on n&apos;entre dans une guilde que par un code
          d&apos;invitation.
        </Text>

        <Field
          label="Nom de la guilde"
          value={name}
          onChangeText={setName}
          maxLength={GUILD_NAME_MAX_LENGTH}
          autoCapitalize="words"
          returnKeyType="done"
          editable={!busy}
          error={violations.name}
        />
        <Text style={styles.counter}>
          {name.length} / {GUILD_NAME_MAX_LENGTH}
        </Text>

        {failure !== null ? <Text style={styles.failure}>{messageFor(failure)}</Text> : null}
        {alreadyInAGuild ? (
          <Button label="Voir ma guilde" onPress={onAlreadyInAGuild} variant="quiet" />
        ) : null}

        <Button
          label="Fonder"
          onPress={() => void submit()}
          busy={busy}
          disabled={name.trim().length === 0}
        />
        <Button label="Retour" onPress={onCancel} variant="quiet" disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function JoinForm({
  onJoined,
  onCancel,
  onAlreadyInAGuild,
}: {
  onJoined: (guild: Guild) => void;
  onCancel: () => void;
  onAlreadyInAGuild: () => void;
}) {
  const [code, setCode] = useState('');
  const [refused, setRefused] = useState<{ failure: Failure; refusal: JoinRefusal } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setRefused(null);

    const outcome = await joinGuild(code);

    if (outcome.ok) {
      onJoined(outcome.guild);
      return;
    }

    setRefused({ failure: outcome.failure, refusal: joinRefusalFrom(outcome.failure) });
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Rejoindre une guilde</Text>
        <Text style={styles.body}>Le code t&apos;a été partagé par quelqu&apos;un qui y est déjà.</Text>

        <Field
          label="Code d'invitation"
          value={code}
          // Le serveur normalise casse et espaces : un collage sale doit passer. Ce champ ne
          // filtre donc pas sur l'alphabet du serveur, il nettoie seulement ce qui ne se voit
          // pas — espaces, casse — sans jamais refuser un caractère.
          onChangeText={(text) => setCode(sanitizeInviteCode(text))}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          editable={!busy}
        />

        {refused !== null ? (
          <View style={styles.card}>
            <Text style={styles.failure}>{messageFor(refused.failure)}</Text>

            {refused.refusal.kind === 'guild-is-full' && refused.refusal.capacity !== null ? (
              <Text style={styles.body}>
                {refused.refusal.capacity} / {refused.refusal.capacity} places.
              </Text>
            ) : null}

            {refused.refusal.kind === 'player-already-in-a-guild' ? (
              <Button label="Voir ma guilde" onPress={onAlreadyInAGuild} variant="quiet" />
            ) : null}
          </View>
        ) : null}

        <Button
          label="Rejoindre"
          onPress={() => void submit()}
          busy={busy}
          disabled={!isCompleteInviteCode(code)}
        />
        <Button label="Retour" onPress={onCancel} variant="quiet" disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: space.lg, gap: space.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  counter: { ...type.label, color: color.textMuted, letterSpacing: 0, marginTop: -space.sm },
  failure: { ...type.body, color: color.danger },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
});
