import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useInventory } from '@/features/inventory/useInventory';
import { fetchAvatarCatalog } from './api';
import type { AvatarCatalog } from './avatar';
import { AvatarEditor } from './AvatarEditor';
import { useAvatarProfile } from './useAvatarProfile';

export function OwnAppearance() {
  const profile = useAvatarProfile();
  const inventory = useInventory();
  const catalog = useQuery<AvatarCatalog, Failure>({ queryKey: ['avatar-catalog'], queryFn: fetchAvatarCatalog });
  if (!profile.data || !inventory.data || !catalog.data) {
    const failure = profile.error ?? inventory.error ?? catalog.error;
    return <View style={styles.state}>
      {failure ? <>
        <Text style={styles.body}>{messageFor(failure)}</Text>
        <Button label="Réessayer" onPress={() => { void profile.refetch(); void inventory.refetch(); void catalog.refetch(); }} />
      </> : <ActivityIndicator color={color.accent} />}
    </View>;
  }
  // Le brouillon reste monté pendant un échec de relecture en arrière-plan.
  return <AvatarEditor key={profile.data.id} profile={profile.data} equipment={inventory.data.equipment} catalog={catalog.data} embedded />;
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.md },
  body: { ...type.body, color: color.textMuted },
});
