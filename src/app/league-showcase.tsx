import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PlayerProfile } from '@/components/PlayerProfile';
import { AmbientBackdropProvider } from '@/components/AmbientBackdrop';
import { LeagueWeek } from '@/components/LeagueWeek';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar';
import { LEAGUE_FIXTURE } from '@/features/league/leagueFixtures';
import { leagueLabel, type LeagueTier } from '@/features/league/league';
import { LeagueMotion } from '@/features/league/LeagueMotion';

export default function LeagueShowcaseScreen() {
  const params = useLocalSearchParams<{ tier?: string; body?: string; long?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return <AmbientBackdropProvider><Showcase key={`${params.tier}:${params.body}:${params.long}`} params={params} /></AmbientBackdropProvider>;
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
    <PlayerProfile player={player} equipment={{ HEAD: { key: 'BANDEAU_ECLAIR', artworkVersion: null },
      WEAPON: { key: 'FER_PLAY', artworkVersion: null } }}
      action={<Button label="Défier" onPress={() => {}} />}
      onLeaguePress={() => setWeek(value => !value)} motion={<LeagueMotion tier={tier} />} />
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
  note: { ...type.label, color: color.textMuted },
});
