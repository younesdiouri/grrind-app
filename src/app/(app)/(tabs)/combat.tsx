import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { SystemFrame } from '@/components/SystemFrame';
import { color } from '@/design/tokens';
import { AlamGauges } from '@/features/alam/AlamGauges';
import { ALAM_KEY, launchAlam, useAlamCurrent, useAlamHistory } from '@/features/alam/api';
import { alamStyles as s } from '@/features/alam/styles';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { useMyGuild } from '@/features/community/useMyGuild';

export default function AlamScreen() {
  const guild = useMyGuild();
  const current = useAlamCurrent(guild.data?.id);
  const history = useAlamHistory(guild.data?.id);
  const auth = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const launch = async () => {
    if (busy || auth.status !== 'signedIn' || !guild.data) return;
    setBusy(true); setFailure(null);
    const result = await launchAlam(auth.user.id, guild.data.id);
    setBusy(false);
    if (result.kind === 'refused') { setFailure(result.failure); return; }
    void client.invalidateQueries({ queryKey: ALAM_KEY });
    router.push({ pathname: '/alam/[id]', params: { id: result.data.id } });
  };
  const run = current.data?.current;
  return <ScrollView contentContainerStyle={s.screen}>
    <Text style={s.title}>La semaine devient une épopée.</Text>
    <Text style={s.muted}>Ici, seuls les efforts de cette semaine comptent. Ni équipement, ni niveau, ni passé : toute la guilde avance ensemble.</Text>
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
      <SystemFrame tier="hero" contentStyle={s.card}>
        <Text style={s.label}>{run.status === 'COLLECTING' ? 'PRÉPARATION' : 'ÉDITION RÉSOLUE'} · {guild.data?.name}</Text>
        <Text style={s.body}>{date(run.weekStartsAt)} → {date(run.collectionEndsAt)}</Text>
        <Text style={s.muted}>Effectif cible figé : {run.frozenTargetCount}</Text>
        <AlamGauges gauges={run.gauges} />
        <Text style={s.muted}>Les cinq jauges remplies garantissent la victoire. Chaque effort contribue aux récompenses.</Text>
        {run.status === 'RESOLVED' && <Button label="Voir cette édition" onPress={() => router.push({ pathname: '/alam/[id]', params: { id: run.id } })} />}
      </SystemFrame>
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
      <Text style={s.label}>HISTOIRES DE LA GUILDE</Text>
      {history.isPending && <ActivityIndicator color={color.accent} />}
      {history.isError && <Button label="Réessayer l’historique" onPress={() => void history.refetch()} />}
      {history.data?.pages.every((page) => page.runs.length === 0) && <Text style={s.muted}>Votre première histoire reste à écrire.</Text>}
      {history.data?.pages.flatMap((page) => page.runs).map((edition) => <SystemFrame key={edition.id} contentStyle={s.card}>
        <Text style={s.body}>{date(edition.revealedAt)} · {edition.mode === 'MANUAL' ? 'Manuelle' : 'Hebdomadaire'}</Text>
        <Button label="Lire et rejouer" variant="quiet" onPress={() => router.push({ pathname: '/alam/[id]', params: { id: edition.id, replay: '1' } })} />
      </SystemFrame>)}
      {history.hasNextPage && <Button label="Histoires précédentes" busy={history.isFetchingNextPage} onPress={() => void history.fetchNextPage()} />}
    </>}
    <Button label="Anciens combats solo" variant="quiet" onPress={() => router.push('/combats-solo')} />
  </ScrollView>;
}

function date(value: string) {
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}
