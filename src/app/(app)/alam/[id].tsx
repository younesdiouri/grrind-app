import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Button } from '@/components/Button';
import { SystemFrame } from '@/components/SystemFrame';
import { alamMotion, color, rarityColor, rarityLabel } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { messageFor } from '@/features/auth/problems';
import { useAlamRun, type AlamRun } from '@/features/alam/api';
import { RaidStage } from '@/features/alam/RaidStage';
import { raidMembers } from '@/features/alam/presentation';
import { alamStyles as s } from '@/features/alam/styles';
import { useAlamSound } from '@/features/alam/useAlamSound';
import { useRaidClock } from '@/features/alam/useRaidClock';

export default function AlamEdition() {
  const { id, replay } = useLocalSearchParams<{ id: string; replay?: string }>();
  const query = useAlamRun(id);
  return <>
    <Stack.Screen options={{ title: 'ʿĀlam al-Nafs' }} />
    {query.isPending && <ActivityIndicator color={color.accent} />}
    {query.isError && <View style={s.screen}><Text style={s.error}>{messageFor(query.error)}</Text>
      <Button label="Réessayer" onPress={() => void query.refetch()} /></View>}
    {query.data && (query.data.status === 'COLLECTING'
      ? <View style={s.screen}><Text style={s.title}>La guilde se prépare.</Text><Text style={s.muted}>L’histoire apparaîtra une fois les efforts résolus.</Text></View>
      : <Edition key={id} run={query.data} receivedAt={query.dataUpdatedAt} replay={replay === '1'} />)}
  </>;
}

function Edition({ run, receivedAt, replay }: { run: AlamRun; receivedAt: number; replay: boolean }) {
  const reduced = useReducedMotion() !== false;
  const presentation = useRaidClock(run, receivedAt, replay);
  const sound = useAlamSound(!presentation.finished);
  const previousCursor = useRef(-1);
  const [summary, setSummary] = useState(false);
  useEffect(() => {
    const event = run.events[presentation.cursor];
    const follows = presentation.cursor === previousCursor.current + 1;
    previousCursor.current = presentation.cursor;
    if (!follows || !event || (event.action !== 'EFFORT' && event.action !== 'DROP')) return;
    sound.cue(event.action === 'DROP');
    if (!reduced) void Haptics.impactAsync(event.action === 'DROP' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [presentation.cursor, reduced, run.events, sound]);
  const members = useMemo(() => raidMembers(run.participants), [run.participants]);
  const event = run.events[presentation.cursor];
  const encounter = run.encounters.find((entry) => entry.index === event?.encounterIndex);
  const revealed = run.events.slice(0, presentation.cursor + 1).some((entry) =>
    entry.encounterIndex === encounter?.index && (entry.action === 'VICTORY' || entry.action === 'DEFEAT'));
  return <>
    <Stack.Screen options={{ headerShown: false, statusBarHidden: true }} />
    <RaidStage clock={presentation.clock} events={run.events} members={members}
      finalEncounter={Math.max(0, ...run.encounters.map((entry) => entry.index))}>
      <View style={s.raidHeader}>
        <View style={s.raidHeading}><Text style={s.label}>{presentation.finished ? 'HISTOIRE DE LA GUILDE' : presentation.replaying ? 'REPLAY' : 'EN DIRECT'}</Text>
          <Text style={s.raidTitle}>{encounter?.enemyName ?? 'Al Kasal'}</Text>
          {encounter && <Text style={s.raidRoster}>Rencontre {encounter.index} · seuil {encounter.thresholdPermille / 10} %</Text>}</View>
        <Button label="Fermer" onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/combat')} variant="quiet" />
      </View>
      <View style={s.raidPanel}>
        <Text style={s.body} accessibilityLiveRegion="polite" numberOfLines={1}>{encounter && revealed ? encounter.narration
          : event?.text || 'La guilde entre dans la dimension du Nafs…'}</Text>
        <View style={s.raidActions}>
          <Text style={s.raidNarration} numberOfLines={1}>{members.map((member) => member.name).join(' · ')}</Text>
          <Button label={sound.enabled ? 'Couper le son' : 'Activer le son'} onPress={sound.toggle} variant="quiet" />
          <Button label="Voir le résumé" onPress={() => { presentation.skip(); setSummary(true); }} />
        </View>
      </View>
      {presentation.finished && summary && <ScrollView style={s.raidSummary} contentContainerStyle={s.screen}>
      <Button label="Revenir à la scène" onPress={() => setSummary(false)} variant="quiet" />
      <Text style={s.title}>Le fruit de vos efforts</Text>
      <Text style={s.muted}>Les récompenses ont été enregistrées. Rejouer cette histoire ne donne aucun gain supplémentaire.</Text>
      {run.encounters.map((entry) => <SystemFrame key={entry.index} contentStyle={s.card}>
        <Text style={s.label}>Rencontre {entry.index} · {entry.won ? 'Victoire' : 'Défaite'}</Text>
        <Text style={s.body}>{entry.narration}</Text>
        {entry.drops.length === 0 && <Text style={s.muted}>Aucun drop pour cette rencontre.</Text>}
        {entry.drops.map((drop, index) => <View key={`${drop.playerId}:${drop.itemKey}:${index}`} style={s.member}>
          {drop.imageUrl && <Image source={{ uri: drop.imageUrl }} style={{ width: alamMotion.avatarSize, height: alamMotion.avatarSize }} contentFit="contain" />}
          <View style={s.copy}>
            <Text style={[s.label, { color: rarityColor[drop.rarity] }]}>{rarityLabel[drop.rarity]} · {drop.name} ×{drop.quantity}</Text>
            <Text style={s.body}>{run.participants.find((player) => player.playerId === drop.playerId)?.displayName ?? 'Membre de la guilde'}</Text>
          </View>
        </View>)}
      </SystemFrame>)}
      <Button label="Rejouer depuis le début" onPress={() => { setSummary(false); presentation.restart(); }} />
      <Button label="Ouvrir l’atelier" onPress={() => router.push('/atelier')} variant="quiet" />
      </ScrollView>}
    </RaidStage>
  </>;
}
