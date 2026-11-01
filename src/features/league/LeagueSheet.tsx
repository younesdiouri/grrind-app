import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { LeagueWeek } from '@/components/LeagueWeek';
import { color, inventoryArt, leagueArt, radius, space, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { messageFor } from '@/features/auth/problems';
import type { useLeague } from './useLeague';

export function LeagueSheet({ visible, onClose, query }: {
  visible: boolean; onClose(): void; query: ReturnType<typeof useLeague>;
}) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType={reduced === false ? 'fade' : 'none'} onRequestClose={onClose}>
    <View style={[styles.modal, { paddingTop: insets.top + space.md, paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <ScrollView contentContainerStyle={styles.content}>
          {query.data && <LeagueWeek state={query.data} now={Math.max(query.dataUpdatedAt, query.errorUpdatedAt)} />}
          {query.isPending && <ActivityIndicator color={color.accent} accessibilityLabel="Chargement de ma semaine" />}
          {query.isError && <Text accessibilityRole="alert" style={styles.error}>{messageFor(query.error)}</Text>}
          <Button label="Actualiser ma semaine" variant="quiet" busy={query.isFetching} onPress={() => void query.refetch()} />
          <Button label="Fermer ma semaine" variant="quiet" onPress={onClose} />
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: inventoryArt.scrim, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: space.md },
  sheet: { width: '100%', maxWidth: leagueArt.sheetMaxWidth, maxHeight: leagueArt.sheetMaxHeight,
    borderRadius: radius.md, backgroundColor: color.surfaceRaised, overflow: 'hidden' },
  content: { padding: space.lg, gap: space.md },
  error: { ...type.body, color: color.danger },
});
