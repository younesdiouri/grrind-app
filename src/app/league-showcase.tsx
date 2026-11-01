import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PlayerIdentity } from '@/components/PlayerIdentity';
import { LeagueWeek } from '@/components/LeagueWeek';
import { Button } from '@/components/Button';
import { AttributeLegend, AttributeRing } from '@/components/AttributeRing';
import { color, space, type } from '@/design/tokens';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar';
import { LEAGUE_FIXTURE } from '@/features/league/leagueFixtures';
import { leagueLabel, type LeagueTier } from '@/features/league/league';
import { LeagueMotion } from '@/features/league/LeagueMotion';

export default function LeagueShowcaseScreen() {
  const params = useLocalSearchParams<{ tier?: string; body?: string; long?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return <Showcase key={`${params.tier}:${params.body}:${params.long}`} params={params} />;
}
function Showcase({ params }: { params: { tier?: string; body?: string; long?: string } }) {
  const initialTier = Object.keys(leagueLabel).find(tier => tier === params.tier) as LeagueTier | undefined;
  const [tier, setTier] = useState<LeagueTier>(initialTier ?? 'BRONZE');
  const [female, setFemale] = useState(params.body === 'female');
  const [long, setLong] = useState(params.long === '1');
  const [week, setWeek] = useState(false);
  const player = { displayName: long ? 'Alexandra au-delà des montagnes' : 'Nora', level: long ? 80 : 12,
    title: long ? { id: 'long', name: 'Celle qui ne renonce jamais, même au sommet', hint: '', unlocked: true,
      unlockedAt: null, progress: { current: 1, target: 1, unit: 'LEVELS' as const } } : null,
    avatar: female ? { ...DEFAULT_AVATAR, body: 'female' as const, hairStyle: 'long' as const, noseStyle: 'button' as const } : DEFAULT_AVATAR,
    league: { ...LEAGUE_FIXTURE.league, tier } };
  return <ScrollView contentContainerStyle={styles.screen}>
    <Stack.Screen options={{ title: 'Aperçu des ligues' }} />
    <PlayerIdentity player={player} onLeaguePress={() => setWeek(value => !value)} motion={<LeagueMotion tier={tier} />} />
    <Button label="Défier" onPress={() => {}} />
    <View style={styles.attributes}><AttributeRing attributes={{ strength: 120, endurance: 90, mobility: 70, dexterity: 55 }} vitality={160} size="hero" />
      <View style={styles.legend}><AttributeLegend attributes={{ strength: 120, endurance: 90, mobility: 70, dexterity: 55 }} /></View></View>
    <Text style={styles.note}>Aperçu local · données de démonstration</Text>
    <View style={styles.choices}>{(Object.keys(leagueLabel) as LeagueTier[]).map(value => <Button key={value}
      variant="quiet" label={leagueLabel[value]} onPress={() => setTier(value)} />)}</View>
    <Button variant="quiet" label={female ? 'Corps masculin' : 'Corps féminin'} onPress={() => setFemale(value => !value)} />
    <Button variant="quiet" label={long ? 'Nom court · sans titre · niveau 12' : 'Nom et titre longs · niveau 80'} onPress={() => setLong(value => !value)} />
    {week && <LeagueWeek state={{ ...LEAGUE_FIXTURE, league: player.league }} now={Date.parse(LEAGUE_FIXTURE.weekStartsAt)} />}
  </ScrollView>;
}
const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  attributes: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  legend: { flex: 1 },
  note: { ...type.label, color: color.textMuted },
});
