import { StyleSheet, Text, View } from 'react-native';
import { SystemFrame } from '@/components/SystemFrame';
import { color, space, type } from '@/design/tokens';
import { leagueDeadline, leagueLabel, leagueProjection, leagueRank, movementLabel, type LeagueState } from '@/features/league/league';

export function LeagueWeek({ state, now }: { state: LeagueState; now: number }) {
  const settling = now >= Date.parse(state.weekEndsAt);
  const result = state.lastResult;
  return <View style={styles.content} testID="league-week">
    <Text style={styles.title} accessibilityRole="header">Ma semaine</Text>
    <Text style={styles.league}>Ligue {leagueLabel[state.league.tier]}</Text>
    <SystemFrame contentStyle={styles.card}>
      <Text style={styles.score}>{state.score.toLocaleString('fr-FR')} XP sportives</Text>
      <Text style={styles.body}>{leagueRank(state)}</Text>
      <Text style={styles.projection}>{settling ? 'Clôture en cours · résultat à venir' : leagueProjection(state)}</Text>
      <Text style={styles.note}>Échéance : {leagueDeadline(state.weekEndsAt)} (Paris).</Text>
      <Text style={styles.note}>Le classement reste provisoire jusqu’à la clôture serveur. Les ex æquo partagent le même rang.</Text>
    </SystemFrame>
    <Text style={styles.body}>Chance de butin : +{state.league.lootLuckPercent} points.</Text>
    <Text style={styles.note}>Ce bonus améliore la chance de butin ; il ne garantit aucun objet et ne donne pas d’XP.</Text>
    <Text style={styles.note}>Les {state.movementPercent} % en tête avec une XP positive montent d’un palier.
      {' '}La relégation au classement s’applique à partir de {state.minimumPlayersForRelegation} participants.
      {' '}Une semaine sans XP sportive pour un joueur déjà engagé entraîne une descente, dans les limites Bronze et Diamant.</Text>
    {result !== null && <SystemFrame contentStyle={styles.card}>
      <Text style={styles.league}>DERNIER RÉSULTAT</Text>
      <Text style={styles.body}>{movementLabel[result.movement]} · {leagueLabel[result.tier]} → {leagueLabel[result.nextTier]}</Text>
      <Text style={styles.body}>{result.score.toLocaleString('fr-FR')} XP · {leagueRank(result)}</Text>
      <Text style={styles.note}>Semaine clôturée le {leagueDeadline(result.weekEndsAt)} (Paris).</Text>
    </SystemFrame>}
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  card: { padding: space.md, gap: space.sm },
  title: { ...type.title, color: color.text },
  league: { ...type.label, color: color.accent },
  score: { ...type.title, color: color.text },
  projection: { ...type.body, color: color.accent },
  body: { ...type.body, color: color.text },
  note: { ...type.body, color: color.textMuted },
});
