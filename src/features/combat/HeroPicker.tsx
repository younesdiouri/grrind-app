import { useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { arena, color, combatMotion, control, radius, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAppearances } from './useAppearances';

type Profile = components['schemas']['UserProfile'];

export function HeroPicker({ profile, onProfile }: { profile: Profile; onProfile: (next: Profile) => void }) {
  const catalog = useAppearances();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [saved, setSaved] = useState(false);
  const choose = async (appearance: Profile['appearance']) => {
    setBusy(true); setFailure(null); setSaved(false);
    try {
      const next = await queryOrFailure(() => api.PATCH('/api/me', { body: {
        appearance, displayName: null, timezone: null, locale: null, notificationPreferences: [],
      } }));
      onProfile(next);
      setSaved(true);
    } catch (error) { setFailure(error as Failure); }
    finally { setBusy(false); }
  };
  return <View style={styles.section} testID="hero-picker">
    <Text style={styles.title}>Ton héros</Text>
    <Text style={styles.body}>L’apparence de tes prochains combats. Les anciens gardent leur héros.</Text>
    {catalog.isPending && <ActivityIndicator color={color.accent} />}
    {catalog.isError && <><Text style={styles.body}>{messageFor(catalog.error)}</Text>
      <Button label="Recharger les héros" variant="quiet" onPress={() => void catalog.refetch()} /></>}
    <View style={styles.models}>
      {catalog.data?.appearances.map((model) => {
        const selected = profile.appearance === model.key;
        return <Pressable key={model.key} testID={`hero-${model.key}`} accessibilityRole="button"
          accessibilityLabel={model.key === 'MURID' ? 'Murīd' : model.key}
          accessibilityState={{ selected, disabled: busy }} disabled={busy}
          onPress={() => void choose(model.key)} style={[styles.model, selected && styles.selected]}>
          <Image source={{ uri: model.imageUrls.front.idle }} style={styles.preview} contentFit="contain" />
          <Text style={styles.label}>{model.key === 'MURID' ? 'Murīd' : model.key}</Text>
          <Text style={styles.body}>{selected ? 'Héros choisi' : 'Choisir'}</Text>
        </Pressable>;
      })}
    </View>
    {busy && <ActivityIndicator color={color.accent} />}
    {saved && <Text style={styles.body} accessibilityLiveRegion="polite">Apparence enregistrée</Text>}
    {failure && <Text style={styles.error} accessibilityLiveRegion="polite">{messageFor(failure)}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  section: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, gap: space.sm },
  title: { ...type.title, color: color.text }, body: { ...type.body, color: color.textMuted },
  models: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  model: { flexGrow: 1, alignItems: 'center', borderWidth: control.borderWidth, borderColor: color.border,
    borderRadius: radius.md, padding: space.sm },
  selected: { borderColor: color.accent }, preview: { width: '100%', maxWidth: combatMotion.previewHeight, height: arena.heroPreviewHeight },
  label: { ...type.label, color: color.text }, error: { ...type.body, color: color.danger },
});
