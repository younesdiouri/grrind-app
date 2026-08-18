import { Link, router } from 'expo-router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { DangerRow } from '@/components/DangerRow';
import { Field } from '@/components/Field';
import { GuildMemberRow } from '@/components/GuildMemberRow';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor, violationsByField, type Failure } from '@/features/auth/problems';
import { formatCalendarDate } from '@/features/community/format';
import { GuildMilestone } from '@/features/community/GuildMilestone';
import {
  dissolveGuild,
  excludeMember,
  foundGuild,
  joinGuild,
  leaveGuild,
  refreshGuild,
  renameGuild,
  type Guild,
} from '@/features/community/guildActions';
import { isGuildGone } from '@/features/community/guildRefresh';
import { guildScreenStateFrom, type GuildDetail } from '@/features/community/guildScreenState';
import { isCompleteInviteCode, sanitizeInviteCode } from '@/features/community/inviteCode';
import { joinRefusalFrom, type JoinRefusal } from '@/features/community/joinRefusal';
import { leaveAnnouncementFor } from '@/features/community/leaveAnnouncement';
import { MY_GUILD_QUERY_KEY, useMyGuild } from '@/features/community/useMyGuild';

type GuildMemberEntry = GuildDetail['members'][number];

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
 * `GuildMilestone` ne tient l'écran qu'un instant : celui, très court, entre une fondation ou
 * un ralliement (`justResolved`, une `Guild` sans `members`) et la convergence du cache de
 * `/api/guilds/mine` vers le `GuildDetail` complet. Dès qu'il arrive, `Roster` prend le relais
 * avec la liste ordonnée par le serveur (#43). `guildScreenStateFrom` arbitre entre ces deux
 * sources et le reste des états — **une seule fonction, un seul ordre**, plutôt qu'une chaîne
 * de `if` locale : une revue a montré qu'une chaîne de `if` laisse passer le cas où la guilde
 * disparaît (dissoute pendant qu'on la regardait) sans que les deux sources s'effacent
 * ensemble, ce qui ramenait indéfiniment `GuildMilestone` sur une guilde qui n'existait plus.
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

  // La disparition d'une guilde doit effacer **les deux** sources qui la font exister à
  // l'écran, dans le même geste : le cache de `/mine`, et `justResolved`, qui sinon lui
  // survivrait et ramènerait `GuildMilestone` sur ce qui n'existe plus. C'est le correctif du
  // bug relevé en revue de #43 — `Roster` appelle ceci quand son rafraîchissement rencontre
  // `guild-not-found`.
  const forgetGuild = () => {
    queryClient.setQueryData(MY_GUILD_QUERY_KEY, null);
    setJustResolved(null);
  };

  const state = guildScreenStateFrom({
    guildDetail: myGuild.data ?? null,
    justResolved,
    isPending: myGuild.isPending,
    failure: myGuild.isError ? myGuild.error : null,
  });

  if (state.kind === 'roster') {
    return <Roster guild={state.guild} onGone={forgetGuild} />;
  }

  if (state.kind === 'milestone') {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <GuildMilestone guild={state.guild} />
      </ScrollView>
    );
  }

  if (state.kind === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.title}>La guilde est indisponible</Text>
        <Text style={styles.body}>{messageFor(state.failure)}</Text>
        <Button label="Réessayer" onPress={() => void myGuild.refetch()} variant="quiet" />
      </ScrollView>
    );
  }

  // `state.kind === 'gate'` : pas de guilde. Un joueur qui apprend en plein formulaire qu'il
  // en a déjà une — fondée ou rejointe depuis un autre appareil pendant qu'il remplissait
  // celui-ci — n'a pas de second appel à faire lui-même : `refetch` va chercher la vraie
  // guilde, et ce même écran bascule sur `Roster` ou `GuildMilestone` dès qu'elle arrive.
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
 * Recale le cache sur ce que le serveur rend *maintenant*, jamais sur une épissure locale.
 *
 * Partagée par le tirer-pour-rafraîchir et par l'exclusion (#45, piège relevé par l'architecte :
 * retirer un membre à la main désynchronise `memberCount`, donc `CapacityGauge`). `guild-not-
 * found` — la guilde a disparu pendant l'aller-retour — passe par `onGone`, qui efface les deux
 * sources où elle peut survivre à l'écran (voir `forgetGuild` dans `GuildeScreen`) ; tout autre
 * refus revient tel quel, pour que l'appelant l'affiche.
 */
async function syncGuild(
  guildId: string,
  queryClient: QueryClient,
  onGone: () => void,
): Promise<Failure | null> {
  const outcome = await refreshGuild(guildId);

  if (outcome.ok) {
    queryClient.setQueryData(MY_GUILD_QUERY_KEY, outcome.guild);
    return null;
  }

  if (isGuildGone(outcome.failure)) {
    onGone();
    return null;
  }

  return outcome.failure;
}

/** Le refus précis d'une exclusion sur un membre déjà parti : un recalage, pas une excuse. */
function isPlayerNotAMember(failure: Failure): boolean {
  return (
    failure.kind === 'problem' &&
    failure.problem.type === 'https://grrind.app/problems/player-is-not-a-member'
  );
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
 * le fondateur vient de la dissoudre. Sur ce refus précis, `onGone` (porté par le parent)
 * efface la guilde des deux endroits où elle peut vivre à l'écran — pas seulement le cache
 * de `/mine` : `Roster` lui-même ne connaît pas `justResolved`, qui vit dans `GuildeScreen`.
 *
 * ————— #45 : quitter, exclure, gérer ——————————————————————————————————————————————————
 *
 * Trois gestes de plus, aucun optimiste : « Quitter » est un `DangerRow` seul dans sa propre
 * section du pied de liste, offert à **tout le monde** (`role` n'en change que le message,
 * jamais la visibilité). « Exclure » vit sur la ligne d'un membre, mais **jamais dans le
 * `Pressable` du `Link`** qui pointe vers son profil — un appui unique ne doit jamais exclure
 * *et* naviguer. « Gérer la guilde » (renommer, dissoudre) bascule cet écran sur `ManageGuild`,
 * dans le même composant : dissoudre a besoin de `onGone`, exactement comme quitter, et
 * `onGone` n'existe qu'ici — le pousser sur une route séparée l'aurait rendu inatteignable
 * sans réinventer `forgetGuild`.
 */
function Roster({ guild, onGone }: { guild: GuildDetail; onGone: () => void }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailure, setRefreshFailure] = useState<Failure | null>(null);
  const [managing, setManaging] = useState(false);

  const [excludingId, setExcludingId] = useState<string | null>(null);
  const [excludeFailure, setExcludeFailure] = useState<Failure | null>(null);

  const [leaving, setLeaving] = useState(false);
  const [leaveFailure, setLeaveFailure] = useState<Failure | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    // Effacé à chaque tentative, succès compris : un rafraîchissement raté suivi d'un
    // réussi ne doit pas laisser un message d'erreur affiché sous une liste à jour.
    setRefreshFailure(null);
    setRefreshFailure(await syncGuild(guild.id, queryClient, onGone));
    setRefreshing(false);
  };

  const performExclude = async (playerId: string) => {
    setExcludingId(playerId);
    setExcludeFailure(null);

    const outcome = await excludeMember(guild.id, playerId);

    if (!outcome.ok && !isPlayerNotAMember(outcome.failure)) {
      setExcludeFailure(outcome.failure);
      setExcludingId(null);
      return;
    }

    // Succès, ou `player-is-not-a-member` — il était déjà parti : dans les deux cas la liste
    // se recale sur ce que le serveur rend maintenant, jamais sur une épissure locale.
    setExcludeFailure(await syncGuild(guild.id, queryClient, onGone));
    setExcludingId(null);
  };

  const confirmExclude = (member: GuildMemberEntry) => {
    Alert.alert(
      `Exclure ${member.displayName} ?`,
      "Il pourra revenir avec un code valide : il n'y a pas de liste noire. Pour fermer la guilde à tout le monde, révoque plutôt le code d'invitation.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Exclure', style: 'destructive', onPress: () => void performExclude(member.id) },
      ],
    );
  };

  const performLeave = async () => {
    setLeaving(true);
    setLeaveFailure(null);

    const outcome = await leaveGuild();

    // Les trois issues du serveur (départ simple, succession, dissolution) retirent toutes
    // la guilde de ce que *ce* joueur voit ; `guild-not-found` — elle a disparu pendant qu'il
    // regardait — ramène au même endroit, sans drame. `onGone` couvre les deux cas.
    if (outcome.ok || isGuildGone(outcome.failure)) {
      onGone();
      return;
    }

    setLeaveFailure(outcome.failure);
    setLeaving(false);
  };

  const confirmLeave = () => {
    const announcement = leaveAnnouncementFor({
      role: guild.role,
      memberCount: guild.memberCount,
      guildName: guild.name,
    });

    Alert.alert('Quitter la guilde', announcement.message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => void performLeave() },
    ]);
  };

  if (managing) {
    return <ManageGuild guild={guild} onClose={() => setManaging(false)} onDissolved={onGone} />;
  }

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
          {/* `role` décide quoi dessiner, jamais ce qui est permis (#44) : un appel direct de
              l'écran par un membre recevrait de toute façon `forbidden` du serveur. */}
          {guild.role === 'FOUNDER' ? (
            <>
              <Button
                label="Code d'invitation"
                onPress={() => router.push({ pathname: '/invite-code', params: { guildId: guild.id } })}
                variant="quiet"
              />
              <Button label="Gérer la guilde" onPress={() => setManaging(true)} variant="quiet" />
            </>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.memberRow}>
          <Link href={{ pathname: '/joueur/[id]', params: { id: item.id } }} asChild>
            {/* `asChild` clone l'enfant avec `onPress` : voir index.tsx pour la même règle. */}
            <Pressable>
              <GuildMemberRow member={item} />
            </Pressable>
          </Link>

          {/* Le fondateur ne se voit jamais ce geste sur sa propre ligne — un seul membre
              porte `role === 'FOUNDER'` dans cette liste, c'est lui. Le `409
              founder-cannot-exclude-himself` reste une garde serveur, l'écran ne l'expose
              simplement pas (#45). Hors de son propre `Pressable` du `Link` ci-dessus : un
              appui n'exclut jamais *et* ne navigue jamais dans le même geste. */}
          {guild.role === 'FOUNDER' && item.role !== 'FOUNDER' ? (
            <DangerRow
              label="Exclure"
              onPress={() => confirmExclude(item)}
              busy={excludingId === item.id}
              disabled={excludingId !== null && excludingId !== item.id}
            />
          ) : null}
        </View>
      )}
      ListFooterComponent={
        <View style={styles.leaveSection}>
          {excludeFailure === null ? null : (
            <Text style={styles.failure}>{messageFor(excludeFailure)}</Text>
          )}
          {leaveFailure === null ? null : (
            <Text style={styles.failure}>{messageFor(leaveFailure)}</Text>
          )}
          {/* Seule dans sa section, jamais mêlée aux actions ordinaires du pied de liste — la
              règle de `DangerRow`. Offerte à tout le monde : `role` ne change que le message
              annoncé par `leaveAnnouncementFor`, jamais la visibilité du geste. */}
          <DangerRow
            label="Quitter la guilde"
            onPress={confirmLeave}
            busy={leaving}
            disabled={excludingId !== null}
          />
        </View>
      }
    />
  );
}

/**
 * « Gérer la guilde » — fondateur seul, poussé depuis `Roster` sans quitter ce composant : le
 * geste de dissolution a besoin d'`onDissolved` (== `forgetGuild`, porté par `GuildeScreen`),
 * qu'une route séparée n'aurait pas pu atteindre sans dupliquer la double purge du cache.
 */
function ManageGuild({
  guild,
  onClose,
  onDissolved,
}: {
  guild: GuildDetail;
  onClose: () => void;
  onDissolved: () => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(guild.name);
  const [renaming, setRenaming] = useState(false);
  const [renameFailure, setRenameFailure] = useState<Failure | null>(null);

  const [dissolving, setDissolving] = useState(false);
  const [dissolveFailure, setDissolveFailure] = useState<Failure | null>(null);

  const violations = renameFailure === null ? {} : violationsByField(renameFailure);
  const trimmedName = name.trim();

  const submitRename = async () => {
    setRenaming(true);
    setRenameFailure(null);

    const outcome = await renameGuild(guild.id, trimmedName);

    if (outcome.ok) {
      // `PATCH /api/guilds/{id}` rend une `Guild`, **pas** un `GuildDetail` : écrire cette
      // réponse telle quelle dans le cache effacerait `members`. On fusionne donc le nom
      // dans le détail déjà en cache, sans toucher au reste (#45, piège relevé par l'archi).
      queryClient.setQueryData<GuildDetail | null>(MY_GUILD_QUERY_KEY, (previous) =>
        previous === null || previous === undefined
          ? (previous ?? null)
          : { ...previous, name: outcome.guild.name },
      );
      onClose();
      return;
    }

    setRenameFailure(outcome.failure);
    setRenaming(false);
  };

  const performDissolve = async () => {
    setDissolving(true);
    setDissolveFailure(null);

    const outcome = await dissolveGuild(guild.id);

    if (outcome.ok) {
      onDissolved();
      return;
    }

    setDissolveFailure(outcome.failure);
    setDissolving(false);
  };

  const confirmDissolve = () => {
    Alert.alert(
      'Dissoudre la guilde ?',
      "Irréversible : la guilde et toutes les adhésions disparaissent dans le même geste. Pour partir sans la casser, quitte-la plutôt depuis la liste des membres — la guilde continue sans toi.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Dissoudre', style: 'destructive', onPress: () => void performDissolve() },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Gérer la guilde</Text>

        <Field
          label="Nom de la guilde"
          value={name}
          onChangeText={setName}
          maxLength={GUILD_NAME_MAX_LENGTH}
          autoCapitalize="words"
          returnKeyType="done"
          editable={!renaming}
          error={violations.name}
        />
        <Text style={styles.counter}>
          {name.length} / {GUILD_NAME_MAX_LENGTH}
        </Text>
        {renameFailure === null ? null : (
          <Text style={styles.failure}>{messageFor(renameFailure)}</Text>
        )}
        <Button
          label="Renommer"
          onPress={() => void submitRename()}
          busy={renaming}
          disabled={trimmedName.length === 0 || trimmedName === guild.name}
        />

        {dissolveFailure === null ? null : (
          <Text style={styles.failure}>{messageFor(dissolveFailure)}</Text>
        )}
        <DangerRow
          label="Dissoudre la guilde"
          onPress={confirmDissolve}
          busy={dissolving}
          disabled={renaming}
        />

        <Button label="Retour" onPress={onClose} variant="quiet" disabled={renaming || dissolving} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  memberRow: { gap: space.xs },
  leaveSection: { gap: space.sm, marginTop: space.lg },
});
