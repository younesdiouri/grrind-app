import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { SystemFrame } from '@/components/SystemFrame';
import { color } from '@/design/tokens';
import { AlamGauges } from '@/features/alam/AlamGauges';
import { AlamDifficultyOptions } from '@/features/alam/AlamDifficultyOptions';
import { ALAM_KEY, alamPreferences, launchAlam, useAlamCurrent } from '@/features/alam/api';
import { preferenceIsDefinitive, preferenceMessage } from '@/features/alam/preferences';
import { alamStyles as s } from '@/features/alam/styles';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { MY_GUILD_QUERY_KEY, useMyGuild } from '@/features/community/useMyGuild';
import { isGuildGone } from '@/features/community/guildRefresh';

type Preference = { kind: 'registration'; input: Parameters<typeof alamPreferences.register>[0] }
  | { kind: 'difficulty'; input: Parameters<typeof alamPreferences.choose>[0] };

export default function AlamScreen() {
  const guild = useMyGuild();
  const current = useAlamCurrent(guild.data?.id);
  const auth = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [preferenceFailure, setPreferenceFailure] = useState<Failure | null>(null);
  const [retry, setRetry] = useState<Preference | null>(null);
  useEffect(() => {
    if (current.isError && isGuildGone(current.error))
      void client.invalidateQueries({ queryKey: MY_GUILD_QUERY_KEY });
  }, [client, current.isError, current.error]);
  const save = async (preference: Preference) => {
    if (busy || auth.status !== 'signedIn' || !guild.data || preference.input.playerId !== auth.user.id
      || preference.input.guildId !== guild.data.id
      || !guild.data.members.some(member => member.id === auth.user.id && member.joinedAt === preference.input.membershipJoinedAt)
      || (preference.kind === 'difficulty' && preference.input.runId !== current.data?.current.id)) return;
    setBusy(true); setPreferenceFailure(null); setRetry(null);
    const result = preference.kind === 'registration'
      ? await alamPreferences.register(preference.input) : await alamPreferences.choose(preference.input);
    if (result.kind === 'refused') {
      setPreferenceFailure(result.failure);
      if (!preferenceIsDefinitive(result.failure)) setRetry(preference);
      if (result.failure.kind === 'problem' && result.failure.problem.type === 'https://grrind.app/problems/guild-not-found')
        void client.invalidateQueries({ queryKey: MY_GUILD_QUERY_KEY });
    }
    await client.invalidateQueries({ queryKey: ALAM_KEY });
    setBusy(false);
  };
  const launch = async () => {
    if (busy || auth.status !== 'signedIn' || !guild.data) return;
    setBusy(true); setFailure(null);
    const result = await launchAlam(auth.user.id, guild.data.id);
    setBusy(false);
    if (result.kind === 'refused') { setFailure(result.failure); return; }
    void client.invalidateQueries({ queryKey: ALAM_KEY });
    router.push({ pathname: '/alam/[id]', params: { id: result.data.id } });
  };
  const run = guild.data && !current.isError ? current.data?.current : undefined;
  const membership = auth.status === 'signedIn' ? guild.data?.members.find(member => member.id === auth.user.id) : undefined;
  const scope = auth.status === 'signedIn' && guild.data && membership
    ? { playerId: auth.user.id, guildId: guild.data.id, membershipJoinedAt: membership.joinedAt } : null;
  return <ScrollView contentContainerStyle={s.screen}>
    <Text style={s.title}>La semaine devient une épopée.</Text>
    <Text style={s.muted}>Seuls les efforts de cette semaine des membres inscrits comptent. Un seul combat automatique, dimanche à 19 h Europe/Paris, avec le butin de la difficulté choisie.</Text>
    {guild.isPending && <ActivityIndicator color={color.accent} />}
    {guild.isError && <SystemFrame contentStyle={s.card}><Text style={s.error}>{messageFor(guild.error)}</Text>
      <Button label="Réessayer" onPress={() => void guild.refetch()} /></SystemFrame>}
    {guild.data === null && <SystemFrame contentStyle={s.card}>
      <Text style={s.body}>Rejoins une guilde pour entrer dans ʿĀlam al-Nafs.</Text>
      <Button label="Trouver ma guilde" onPress={() => router.push('/guilde')} />
    </SystemFrame>}
    {guild.data && current.isPending && <ActivityIndicator color={color.accent} />}
    {current.isError && <SystemFrame contentStyle={s.card}><Text style={s.error}>{messageFor(current.error)}</Text>
      <Button label="Réessayer" onPress={() => void current.refetch()} /></SystemFrame>}
    {run && <>
      {current.data && scope && <SystemFrame contentStyle={s.card}>
        <Text style={s.label}>{current.data.registered ? 'TU ES INSCRIT À ĀLAM' : 'INSCRIS-TOI À ĀLAM'}</Text>
        <Text style={s.muted}>L’inscription reste active d’une semaine à l’autre tant que tu restes dans la guilde. Seuls les inscrits contribuent et peuvent recevoir du butin selon leurs efforts.</Text>
        {run.status === 'RESOLVED' && <Text style={s.muted}>Cette édition est clôturée. Modifier ton inscription concerne les prochaines éditions ; le replay et ses récompenses restent inchangés.</Text>}
        <Button label={current.data.registered ? 'Me désinscrire' : 'M’inscrire au raid'} disabled={busy}
          onPress={() => void save({ kind: 'registration', input: { ...scope, registered: !current.data!.registered } })} />
      </SystemFrame>}
      {preferenceFailure && <Text style={s.error} accessibilityLiveRegion="polite">{preferenceMessage(preferenceFailure)}</Text>}
      {retry && retry.input.playerId === scope?.playerId && retry.input.guildId === scope?.guildId
        && retry.input.membershipJoinedAt === scope?.membershipJoinedAt
        && (retry.kind === 'registration' || retry.input.runId === run.id) && <Button
        label="Réessayer cette modification" busy={busy} onPress={() => void save(retry)} />}
      <SystemFrame tier="hero" contentStyle={s.card}>
        <Text style={s.label}>{run.status === 'COLLECTING' ? 'PRÉPARATION' : 'ÉDITION RÉSOLUE'} · {guild.data?.name}</Text>
        <Text style={s.body}>{date(run.weekStartsAt)} → {date(run.collectionEndsAt)}</Text>
        <Text style={s.muted}>Effectif cible figé : {run.frozenTargetCount}</Text>
        <Text style={s.muted}>Chaque nouvelle semaine commence en facile. Le chef peut choisir jusqu’au combat. Les cinq jauges de la difficulté choisie remplies garantissent la victoire.</Text>
        {!current.data?.canChooseDifficulty && <Text style={s.muted}>{run.status === 'RESOLVED'
          ? 'La difficulté et les prévisions de clôture sont figées pour ce replay.' : 'Le choix de difficulté est réservé au chef avant la clôture.'}</Text>}
        {run.difficultyOptions.length === 0 && <AlamGauges gauges={run.gauges} />}
        {run.status === 'RESOLVED' && <Button label="Voir cette édition" onPress={() => router.push({ pathname: '/alam/[id]', params: { id: run.id } })} />}
      </SystemFrame>
      <AlamDifficultyOptions run={run} canChoose={current.data?.canChooseDifficulty === true} busy={busy}
        onChoose={difficulty => { if (scope) void save({ kind: 'difficulty', input: { ...scope, runId: run.id, difficulty } }); }} />
      {current.data?.canLaunchManual && <SystemFrame contentStyle={s.card}>
        <Text style={s.label}>LANCEMENT DE DÉVELOPPEMENT</Text>
        <Text style={s.muted}>Une édition avec les efforts déjà réalisés. Chaque nouveau lancement peut accorder des récompenses.</Text>
        <Button label={failure ? 'Réessayer le lancement' : 'Lancer maintenant'} busy={busy} onPress={() => void launch()} />
      </SystemFrame>}
      {failure && <Text style={s.error}>{messageFor(failure)}</Text>}
      <SystemFrame contentStyle={s.card}>
        <Text style={s.label}>LES EFFORTS DE LA GUILDE</Text>
        {run.participants.every((player) => player.contribution === 0) && <Text style={s.muted}>Aucune contribution pour le moment. La prochaine séance ouvre le chemin.</Text>}
        {run.participants.map((player) => <View key={player.playerId} style={s.group}>
          <View style={s.member}><PlayerAvatar name={player.displayName} /><View style={s.copy}>
            <Text style={s.body}>{player.displayName}</Text><Text style={s.muted}>{player.contribution} points cette semaine</Text>
          </View></View>
          <AlamGauges gauges={player.gauges} />
        </View>)}
      </SystemFrame>
    </>}
  </ScrollView>;
}

function date(value: string) {
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}
