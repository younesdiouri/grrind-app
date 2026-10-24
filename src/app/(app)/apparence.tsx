import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { fetchAvatarCatalog } from '@/features/avatar/api';
import { AppearanceScene } from '@/features/avatar/AppearanceScene';
import { AvatarEditor } from '@/features/avatar/AvatarEditor';
import { AVATAR_FIELDS, AVATAR_LABELS, type AvatarCatalog } from '@/features/avatar/avatar';
import { useAvatarProfile } from '@/features/avatar/useAvatarProfile';
import { DEFAULT_AVATAR, serverAvatar } from '@/features/combat/serverAvatar';
import { usePlayer } from '@/features/community/usePlayer';
import { useInventory } from '@/features/inventory/useInventory';

export default function AppearanceScreen() {
  const { playerId } = useLocalSearchParams<{ playerId?: string }>();
  return playerId ? <PublicAppearance id={playerId} /> : <OwnAppearance />;
}

function OwnAppearance() {
  const profile = useAvatarProfile();
  const inventory = useInventory();
  const catalog = useQuery<AvatarCatalog, Failure>({ queryKey: ['avatar-catalog'], queryFn: fetchAvatarCatalog });
  // Keep a mounted draft during a background refetch failure; only initial loading blocks it.
  if (!profile.data || !inventory.data || !catalog.data) {
    return profile.isError || inventory.isError || catalog.isError ? <State
      failure={profile.error ?? inventory.error ?? catalog.error ?? undefined}
      retry={() => { void profile.refetch(); void inventory.refetch(); void catalog.refetch(); }} /> : <State />;
  }
  return <AvatarEditor key={profile.data.id} profile={profile.data} equipment={inventory.data.equipment} catalog={catalog.data} />;
}

function PublicAppearance({ id }: { id: string }) {
  const player = usePlayer(id);
  if (player.isPending) return <State />;
  if (player.isError) return <State failure={player.error} retry={() => void player.refetch()} />;
  const avatar = player.data.avatar ?? DEFAULT_AVATAR;
  return <AppearanceScene title={player.data.displayName} avatar={serverAvatar(avatar, player.data.inventory.equipment)}>
    <Text style={styles.body}>{AVATAR_FIELDS.map(field => (AVATAR_LABELS[field] as Record<string, string>)[avatar[field]]).join(' · ')}</Text>
    <Text style={styles.body}>{Object.values(player.data.inventory.equipment).flatMap(line => line ? [line.name] : []).join(' · ') || 'Tenue de base'}</Text>
  </AppearanceScene>;
}

function State({ failure, retry }: { failure?: Failure; retry?(): void }) {
  return <View style={styles.state}>
    <Stack.Screen options={{ title: 'Apparence' }} />
    {failure ? <>
      <Text style={styles.body}>{messageFor(failure)}</Text>
      <Button label="Réessayer" onPress={() => retry?.()} />
    </> : <ActivityIndicator color={color.accent} />}
  </View>;
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.md },
  body: { ...type.body, color: color.textMuted },
});
