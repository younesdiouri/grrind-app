import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { appearanceArt, color, combatMotion, control, frame, radius, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAppearances } from './useAppearances';

type Profile = components['schemas']['UserProfile'];

export function HeroPicker({ profile, onProfile }: { profile: Profile; onProfile: (next: Profile) => void }) {
  const catalog = useAppearances();
  const queryClient = useQueryClient();
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
      queryClient.setQueryData(['avatar-profile', profile.id], next);
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
      {catalog.data?.appearances.filter((model) => model.selectable).map((model) => {
        const selected = profile.appearance === model.key;
        return <Pressable key={model.key} testID={`hero-${model.key}`} accessibilityRole="button"
          accessibilityLabel={model.name}
          accessibilityState={{ selected, disabled: busy }} disabled={busy}
          onPress={() => void choose(model.key)} style={[styles.model, selected && styles.selected]}>
          <Image source={{ uri: model.imageUrls.front.idle }} style={styles.preview} contentFit="contain" />
          <Text style={styles.label}>{model.name}</Text>
          <Text style={styles.body}>{selected ? 'Héros choisi' : 'Choisir'}</Text>
        </Pressable>;
      })}
    </View>
    {busy && <ActivityIndicator color={color.accent} />}
    {saved && <Text style={styles.body} accessibilityLiveRegion="polite">Apparence enregistrée</Text>}
    {failure && <Text style={styles.error} accessibilityLiveRegion="polite">{messageFor(failure)}</Text>}
    {__DEV__ && <Button label="Atelier des avatars" variant="quiet" onPress={() => router.push('/avatars')} />}
  </View>;
}

const styles = StyleSheet.create({
  section: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, gap: space.sm },
  title: { ...type.title, color: color.text }, body: { ...type.body, color: color.textMuted },
  models: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  model: { width: appearanceArt.choiceWidth, flexGrow: 1, alignItems: 'center', borderWidth: control.borderWidth, borderColor: color.border,
    borderRadius: frame.standard.radius, padding: space.sm },
  selected: { borderColor: color.accent }, preview: { width: '100%', maxWidth: combatMotion.previewHeight, height: appearanceArt.choiceHeight },
  label: { ...type.label, color: color.text }, error: { ...type.body, color: color.danger },
});
