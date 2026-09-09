import { useHeaderHeight } from 'expo-router/react-navigation';
import { randomUUID } from 'expo-crypto';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { color, control, guildChat, radius, space, type } from '@/design/tokens';
import { messageFor, violationsByField } from '@/features/auth/problems';
import { readChatImage } from '@/features/community/chatImage';
import { pickChatPhoto, removeChatPhoto } from '@/features/community/chatPhoto';
import { chatAuthorLabel, type ChatError, type ChatMessage } from '@/features/community/chatState';
import type { GuildDetail } from '@/features/community/guildScreenState';
import { useGuildChat } from '@/features/community/useGuildChat';

export function GuildChat({ guild, playerId, onClose, onGone }: {
  guild: GuildDetail; playerId: string; onClose: () => void; onGone: () => void;
}) {
  const { state, controller, connected, signal } = useGuildChat(guild.id, playerId, onGone);
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const headerHeight = useHeaderHeight();
  const draft = state.draft;
  const close = () => {
    if (draft?.text || draft?.photo) {
      Alert.alert('Fermer le chat ?', 'Le brouillon et sa photo seront abandonnés.', [
        { text: 'Continuer à écrire', style: 'cancel' },
        { text: 'Abandonner', style: 'destructive', onPress: onClose },
      ]);
    } else onClose();
  };
  const pick = async () => {
    setPicking(true);
    setPhotoError(null);
    try {
      const photo = await pickChatPhoto();
      if (signal.aborted) { if (photo) removeChatPhoto(photo); return; }
      if (photo) controller.setDraft({ clientId: randomUUID(), text: draft?.text ?? '', photo });
    } catch {
      if (!signal.aborted) setPhotoError('Impossible de préparer cette photo. Choisis une autre image.');
    } finally { if (!signal.aborted) setPicking(false); }
  };
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
      <View style={styles.heading}>
        <Button label="Infos et membres" onPress={close} variant="quiet" />
        <View style={styles.headingRow}>
          <Text style={styles.title} numberOfLines={1}>Chat · {guild.name}</Text>
          <Text style={styles.status}>{connected ? 'En direct' : 'Reconnexion…'}</Text>
        </View>
      </View>
      {state.error ? <View style={styles.notice}>
        <Text style={styles.error}>{chatErrorMessage(state.error)}</Text>
        <Button label="Actualiser" onPress={() => void controller.catchUp()} variant="quiet" />
      </View> : null}
      {state.loading ? <ActivityIndicator color={color.accent} /> : null}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.messages}
        data={[...state.messages].reverse()}
        inverted
        keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: space.lg }}
        ListEmptyComponent={state.loaded ? <Text style={styles.empty}>La conversation commence ici.</Text> : null}
        ListFooterComponent={state.before ? <Button label="Messages précédents" onPress={() => void controller.older()} busy={state.loadingOlder} variant="quiet" /> : null}
        renderItem={({ item }) => <View style={[styles.bubble, item.authorId === playerId && styles.ownBubble]}>
          <Text style={styles.author}>{chatAuthorLabel(item.authorId, playerId, guild.members)}</Text>
          {item.text ? <Text selectable style={styles.message}>{item.text}</Text> : null}
          {item.imageUrl ? <PrivatePhoto key={item.id} guildId={guild.id} message={item} signal={signal} onError={controller.acceptError} /> : null}
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>}
      />
      <View style={styles.composer}>
        {draft?.photo ? <View style={styles.attachment}>
          <Image source={{ uri: draft.photo.uri }} cachePolicy="none" style={styles.preview} contentFit="contain" accessibilityLabel="Photo à envoyer" />
          <View style={styles.flex}><Button label="Retirer la photo" variant="quiet" disabled={state.sending || picking} onPress={() => controller.setDraft({ clientId: randomUUID(), text: draft.text, photo: null })} /></View>
        </View> : null}
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
        {state.sendError ? <Text style={styles.error}>{chatErrorMessage(state.sendError)}</Text> : null}
        <TextInput
          testID="chat-input"
          accessibilityLabel="Message à la guilde"
          placeholder="Écrire à la guilde…"
          placeholderTextColor={color.textMuted}
          style={styles.input}
          multiline
          maxLength={4000}
          value={draft?.text ?? ''}
          editable={!state.sending && !picking}
          onChangeText={(text) => controller.setDraft({ clientId: randomUUID(), text, photo: draft?.photo ?? null })}
        />
        <View style={styles.actions}>
          <View style={styles.flex}><Button label="Photo" variant="quiet" busy={picking} disabled={state.sending} onPress={() => void pick()} /></View>
          <View style={styles.flex}><Button label={state.sendError ? 'Réessayer' : 'Envoyer'} busy={state.sending} disabled={picking || !state.loaded || (!draft?.text.trim() && !draft?.photo)} onPress={() => void controller.send()} /></View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function chatErrorMessage(error: ChatError): string {
  const fields = violationsByField(error.failure);
  if (fields.text || fields.image) return fields.text ?? fields.image!;
  if (error.failure.kind === 'problem' && error.failure.problem.type === 'https://grrind.app/problems/idempotency-key-reused') {
    return 'Cet envoi ne correspond plus au message initial. Modifie le contenu pour créer un nouvel envoi.';
  }
  return messageFor(error.failure);
}

function PrivatePhoto({ guildId, message, signal, onError }: {
  guildId: string; message: ChatMessage; signal: AbortSignal; onError: (error: ChatError) => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    void readChatImage(guildId, message.id, signal).then((result) => {
      if (!mounted || signal.aborted) return;
      if (result.ok) setUri(result.data);
      else { setFailed(true); onError(result.error); }
    });
    return () => { mounted = false; };
  }, [guildId, message.id, signal, attempt, onError]);
  if (failed) return <Button label="Recharger la photo" variant="quiet" onPress={() => { setFailed(false); setAttempt(attempt + 1); }} />;
  if (!uri) return <View style={styles.photo}><ActivityIndicator color={color.accent} /></View>;
  return <Image source={{ uri }} cachePolicy="none" contentFit="contain" style={styles.photo} accessibilityLabel="Photo partagée dans la guilde" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  heading: { padding: space.md, gap: space.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...type.body, color: color.text, flex: 1 },
  status: { ...type.label, color: color.textMuted },
  list: { flex: 1 },
  messages: { paddingHorizontal: space.md, paddingVertical: space.sm },
  bubble: { alignSelf: 'flex-start', maxWidth: guildChat.bubbleWidth, padding: space.md, marginVertical: space.xs, gap: space.xs, borderRadius: radius.md, backgroundColor: color.surface },
  ownBubble: { alignSelf: 'flex-end', backgroundColor: color.surfaceRaised },
  author: { ...type.label, color: color.accent },
  message: { ...type.body, color: color.text },
  date: { ...type.label, color: color.textMuted },
  empty: { ...type.body, color: color.textMuted, textAlign: 'center', padding: space.lg },
  notice: { paddingHorizontal: space.md, gap: space.xs },
  error: { ...type.label, color: color.danger },
  composer: { padding: space.md, gap: space.sm, backgroundColor: color.surface },
  input: { ...type.body, color: color.text, borderWidth: control.borderWidth, borderColor: color.border, borderRadius: radius.sm, padding: space.sm, minHeight: control.minHeight, maxHeight: guildChat.composerMaxHeight },
  actions: { flexDirection: 'row', gap: space.sm },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  preview: { width: guildChat.previewHeight, height: guildChat.previewHeight },
  photo: { width: guildChat.photoHeight, height: guildChat.photoHeight, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' },
});
