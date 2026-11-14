import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { SystemFrame } from '@/components/SystemFrame';
import { attributeColor, attributeLabel, color, radius, space, type, typography } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { formatDuration } from '@/features/progression/format';
import { filterSports, type SportCatalog, type SportEntry } from '@/features/progression/sports';

export function SportsGuideView({ catalog, search, onSearch, loading, failure, refreshing = false, onRetry }: {
  catalog?: SportCatalog;
  search: string;
  onSearch: (search: string) => void;
  loading: boolean;
  failure?: Failure | null;
  refreshing?: boolean;
  onRetry: () => void;
}) {
  const entries = filterSports(catalog?.disciplines ?? [], search);
  return <View style={styles.stack}>
    <Text style={styles.title} accessibilityRole="header">Guide des sports</Text>
    <Text style={styles.body}>Cherche un sport pour découvrir ses gains. Les sports sont regroupés par discipline.</Text>
    {catalog ? <View style={styles.reference}>
      <Text style={styles.referenceTitle}>Repère pour {formatDuration(catalog.reference.durationSeconds)} de sport</Text>
      <Text style={styles.body}>Journée sans XP préalable ni bonus, hors distance, dénivelé et fréquence cardiaque. Plafonds appliqués.</Text>
      <Text style={styles.body}>L’XP se répartit en points de caractéristiques. Tes gains réels peuvent varier.</Text>
    </View> : null}
    <Field label="Rechercher un sport" placeholder="Nom du sport…" value={search} onChangeText={onSearch}
      autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing"
      editable={catalog !== undefined} accessibilityRole="search" />
    {loading ? <View style={styles.loading} accessibilityLiveRegion="polite">
      <ActivityIndicator color={color.accent} /><Text style={styles.body}>Chargement des sports…</Text>
    </View> : null}
    {failure ? <View style={styles.stack} accessibilityLiveRegion="polite">
      <Text style={styles.body}>{messageFor(failure)}</Text>
      {catalog ? <Text style={styles.body}>Le dernier catalogue chargé reste affiché.</Text> : null}
      <Button label="Réessayer" variant="quiet" busy={refreshing} onPress={onRetry} />
    </View> : null}
    {catalog ? <>
      <Text style={styles.meta} accessibilityLiveRegion="polite">{refreshing && !failure ? 'Actualisation…' : `${entries.length} discipline${entries.length > 1 ? 's' : ''}`}</Text>
      {entries.length === 0 ? <Text style={styles.body}>{catalog.disciplines.length === 0
        ? 'Le guide ne contient encore aucun sport.' : 'Aucun sport trouvé. Essaie un autre nom.'}</Text> : null}
      {entries.map(entry => <SportCard key={entry.discipline} entry={entry} unit={catalog.reference.unit} />)}
      <Text style={styles.meta}>La prise en charge dépend du fournisseur santé. Un sport absent du guide n’est pas encore pris en charge.</Text>
    </> : null}
  </View>;
}

function SportCard({ entry, unit }: { entry: SportEntry; unit: SportCatalog['reference']['unit'] }) {
  const gains = entry.baseAttributeGains;
  const attributes = gains ? (Object.keys(gains) as (keyof typeof gains)[]).sort((a, b) => gains[b] - gains[a]) : [];
  return <SystemFrame contentStyle={styles.card}>
    <View style={styles.head}>
      <Text style={styles.name} accessibilityRole="header">{entry.name}</Text>
      <Text style={[styles.xp, !entry.creditsXp && styles.meta]}>{entry.creditsXp ? `${entry.baseXp} ${unit}` : 'Sans XP'}</Text>
    </View>
    {entry.creditsXp ? <>
      {gains ? <View style={styles.gains}>{attributes.map(attribute => <Text key={attribute}
        style={[styles.gain, { color: attributeColor[attribute] }]}>{attributeLabel[attribute]} +{gains[attribute]}</Text>)}</View> : null}
      {entry.dailyCapXp !== null ? <Text style={styles.meta}>Plafond : {entry.dailyCapXp} {unit} / jour</Text> : null}
    </> : <Text style={styles.body}>Reconnu, sans gain d’XP ni de points de caractéristiques. Les pas ne se convertissent pas en minutes de sport.</Text>}
  </SystemFrame>;
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  title: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  reference: { gap: space.sm, padding: space.md, backgroundColor: color.surface, borderRadius: radius.md },
  referenceTitle: { ...type.label, color: color.accent },
  loading: { paddingVertical: space.lg, alignItems: 'center', gap: space.sm },
  card: { padding: space.md, gap: space.sm },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  name: { ...type.body, fontFamily: typography.display.semibold, color: color.text, flexShrink: 1 },
  xp: { ...type.body, fontFamily: typography.display.semibold, color: color.accent },
  gains: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gain: { ...type.body },
  meta: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
