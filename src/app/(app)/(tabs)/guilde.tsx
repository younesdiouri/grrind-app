import { Link } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { CapacityGauge } from '@/components/CapacityGauge';
import { Field } from '@/components/Field';
import { GuildMemberRow } from '@/components/GuildMemberRow';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor, violationsByField, type Failure } from '@/features/auth/problems';
import { formatCalendarDate } from '@/features/community/format';
import { GuildMilestone } from '@/features/community/GuildMilestone';
import { foundGuild, joinGuild, refreshGuild, type Guild } from '@/features/community/guildActions';
import { isGuildGone } from '@/features/community/guildRefresh';
import { isCompleteInviteCode, sanitizeInviteCode } from '@/features/community/inviteCode';
import { joinRefusalFrom, type JoinRefusal } from '@/features/community/joinRefusal';
import {
  MY_GUILD_QUERY_KEY,
  useMyGuild,
  type GuildDetail,
} from '@/features/community/useMyGuild';

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
 * ————— La guilde, une fois qu'on en a une ——————————————————————————————————————————————
 *
 * `GuildMilestone` ne tient plus l'écran qu'un instant : celui, très court, entre une
 * fondation ou un ralliement (`justResolved`, une `Guild` sans `members`) et la convergence
 * du cache de `/api/guilds/mine` vers le `GuildDetail` complet. Dès qu'il arrive, `Roster`
 * prend le relais avec la liste ordonnée par le serveur (#43).
 */
export default function GuildeScreen() {
  const myGuild = useMyGuild();
  const queryClient = useQueryClient();

  // Le résultat d'une fondation ou d'un ralliement réussis. La réponse du serveur est une
  // `Guild` complète : la rejouer par un second `GET /api/guilds/mine` **avant** d'afficher le
  // jalon serait une requête pour rien, et gagnerait la course contre la mise en scène qu'elle
  // est censée précéder. `justResolved` porte donc ce résultat immédiat.
  const [justResolved, setJustResolved] = useState<Guild | null>(null);
  const [mode, setMode] = useState<'empty' | 'found' | 'join'>('empty');

  // Le cache de `guilds/mine`, lui, reste sur `null` tant qu'on ne le corrige pas : un
  // démontage de cet écran (l'app quittée puis rouverte, par exemple) perdrait `justResolved`
  // et reservirait la guilde absente d'avant. On invalide donc en tâche de fond après un
  // succès — pas d'optimisme, pas de `GuildDetail` inventé avec une liste de membres vide —
  // et on laisse la vraie réponse converger pendant que `justResolved` tient l'écran.
  const resolve = (guild: Guild) => {
    setJustResolved(guild);
    void queryClient.invalidateQueries({ queryKey: MY_GUILD_QUERY_KEY });
  };

  const guildDetail = myGuild.data ?? null;

  // Le détail complet gagne dès qu'il est là : c'est lui qui porte `members`, que
  // `justResolved` ne peut pas avoir. Tant qu'il n'est pas encore arrivé, `justResolved` tient
  // seul l'écran, avec le jalon minimal.
  if (guildDetail !== null) {
    return <Roster guild={guildDetail} />;
  }

  if (justResolved !== null) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <GuildMilestone guild={justResolved} />
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
        onFounded={resolve}
        onCancel={() => setMode('empty')}
        onAlreadyInAGuild={goToMyGuild}
      />
    );
  }

  if (mode === 'join') {
    return (
      <JoinForm
        onJoined={resolve}
        onCancel={() => setMode('empty')}
        onAlreadyInAGuild={goToMyGuild}
      />
    );
  }

  return <EmptyState onFound={() => setMode('found')} onJoin={() => setMode('join')} />;
}

/**
 * La guilde et ses membres — l'écran du ticket #43.
 *
 * **L'ordre de `guild.members` n'est jamais retouché.** Le serveur l'a déjà décidé — le
 * fondateur d'abord, puis par date d'entrée croissante — et rien ici ne trie, ne filtre, ni
 * ne propose de le faire : une liste qui se réordonnerait seule entre deux ouvertures serait
 * un bug qu'on ne saurait pas reproduire.
 *
 * Le tirer-pour-rafraîchir n'appelle **pas** `/api/guilds/mine` : cette route ne peut que
 * dire « tu n'as plus de guilde », jamais laquelle a disparu. `refreshGuild` interroge
 * `GET /api/guilds/{id}`, scopée à celle-ci, ce qui rend le vrai `404 guild-not-found` quand
 * le fondateur vient de la dissoudre — et c'est ce cas-là qui ramène proprement à l'écran
 * d'invitation, en vidant le cache de `/mine` plutôt que d'attendre sa reconvergence.
 */
function Roster({ guild }: { guild: GuildDetail }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailure, setRefreshFailure] = useState<Failure | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshFailure(null);

    const outcome = await refreshGuild(guild.id);

    if (outcome.ok) {
      queryClient.setQueryData(MY_GUILD_QUERY_KEY, outcome.guild);
    } else if (isGuildGone(outcome.failure)) {
      queryClient.setQueryData(MY_GUILD_QUERY_KEY, null);
    } else {
      setRefreshFailure(outcome.failure);
    }

    setRefreshing(false);
  };

  return (
    <FlatList
      data={guild.members}
      // `id`, jamais `displayName` : deux membres homonymes sont un cas normal, et une clé
      // de liste qui collisionnerait romprait le rendu, pas seulement l'affichage.
      keyExtractor={(member) => member.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.rosterContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={color.accent}
        />
      }
      ListHeaderComponent={
        <View style={styles.rosterHeader}>
          <Text style={styles.title}>{guild.name}</Text>
          <CapacityGauge memberCount={guild.memberCount} capacity={guild.capacity} />
          <Text style={styles.body}>Fondée le {formatCalendarDate(guild.createdAt)}.</Text>
          {refreshFailure === null ? null : (
            <Text style={styles.failure}>{messageFor(refreshFailure)}</Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/joueur/[id]', params: { id: item.id } }} asChild>
          {/* `asChild` clone l'enfant avec `onPress` : voir index.tsx pour la même règle. */}
          <Pressable>
            <GuildMemberRow member={item} />
          </Pressable>
        </Link>
      )}
    />
  );
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
          //
          // `refused` s'efface à la première frappe : sans ça, un joueur qui corrige son code
          // après un refus continuerait de lire « ce code n'est plus utilisable » sur le
          // nouveau code, pas encore soumis.
          onChangeText={(text) => {
            setCode(sanitizeInviteCode(text));
            setRefused(null);
          }}
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
  rosterContent: { padding: space.lg },
  rosterHeader: { gap: space.sm, marginBottom: space.md },
  separator: { height: space.md },
});
