import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { AppearanceScene } from '@/features/avatar/AppearanceScene';
import { AVATAR_FIELDS, AVATAR_LABELS } from '@/features/avatar/avatar';
import { DEFAULT_AVATAR, serverAvatar } from '@/features/combat/serverAvatar';
import { usePlayer } from '@/features/community/usePlayer';

export default function AppearanceScreen() {
  const { playerId } = useLocalSearchParams<{ playerId?: string }>();
  return playerId ? <PublicAppearance id={playerId} />
    : <Redirect href={{ pathname: '/inventaire', params: { section: 'appearance' } }} />;
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
