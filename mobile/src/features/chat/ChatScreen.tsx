import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomerSocket } from '../../hooks/useCustomerSocket';
import { useTheme, type Theme } from '../../lib/theme';
import { customerActorKey, useAuthStore } from '../../stores/auth.store';
import { useChatStore } from '../../stores/chat.store';
import type { ChatMessage } from '../../types';
import { logout } from '../auth/api';
import { useSettingsStore } from '../../stores/settings.store';
import {
  markConversationRead,
  syncConversationIntoStore,
  useConversation,
  useMessages,
  useToggleReaction,
} from './api';
import { Composer } from './Composer';
import { ImageViewer } from './ImageViewer';
import { MessageBubble } from './MessageBubble';
import { ReactionPicker } from './ReactionPicker';

const RUN_BREAK_MS = 5 * 60 * 1000;

const sameSender = (a: ChatMessage | undefined, b: ChatMessage | undefined) =>
  !!a && !!b && a.senderType === b.senderType && (a.senderType !== 'OPERATOR' || a.sender?.id === b.sender?.id);

function useStatusLine() {
  const typing = useChatStore((s) => s.typing);
  const online = useChatStore((s) => s.operatorsOnline.length > 0);
  const connection = useChatStore((s) => s.connection);
  if (connection !== 'connected') return { text: connection === 'connecting' ? 'Connecting…' : 'Offline', tone: 'muted' as const };
  if (typing.length === 1) return { text: `${typing[0].name} is typing…`, tone: 'accent' as const };
  if (typing.length > 1) return { text: `${typing.length} agents are typing…`, tone: 'accent' as const };
  return online ? { text: 'Online', tone: 'online' as const } : { text: "We'll reply soon", tone: 'muted' as const };
}

export function ChatScreen() {
  useCustomerSocket();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const customer = useAuthStore((s) => s.customer);
  const connection = useChatStore((s) => s.connection);
  const operatorLastReadAt = useChatStore((s) => s.operatorLastReadAt);
  const status = useStatusLine();

  const conversation = useConversation();
  const messages = useMessages();
  const { mutate: toggleReaction } = useToggleReaction();
  const [pickerFor, setPickerFor] = useState<ChatMessage | null>(null);
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);

  const myActorKey = customer ? customerActorKey(customer.id) : '';
  const data = messages.data ?? [];

  useEffect(() => syncConversationIntoStore(conversation.data), [conversation.data]);

  // Mark read when the chat is shown and whenever the app comes back to the foreground.
  useEffect(() => {
    markConversationRead();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') markConversationRead();
    });
    return () => sub.remove();
  }, []);

  /** Newest customer message the operators have read (data is newest-first). */
  const seenMessageId = useMemo(() => {
    if (!operatorLastReadAt) return null;
    const readAt = Date.parse(operatorLastReadAt);
    return (
      data.find((m) => m.senderType === 'CUSTOMER' && !m.pending && Date.parse(m.createdAt) <= readAt)?.id ?? null
    );
  }, [data, operatorLastReadAt]);

  const onToggleReaction = useCallback(
    (messageId: string, emoji: string) =>
      toggleReaction({ messageId, emoji }, { onError: (err) => Alert.alert("Couldn't update reaction", err.message) }),
    [toggleReaction],
  );
  const onOpenImage = useCallback((images: string[], index: number) => setViewer({ images, index }), []);

  const renderItem: ListRenderItem<ChatMessage> = ({ item, index }) => {
    const older = data[index + 1];
    const newer = data[index - 1];
    const isMine = item.senderType === 'CUSTOMER';
    const startsRun =
      !sameSender(item, older) || Date.parse(item.createdAt) - Date.parse(older!.createdAt) > RUN_BREAK_MS;
    const endsRun =
      !sameSender(item, newer) || Date.parse(newer!.createdAt) - Date.parse(item.createdAt) > RUN_BREAK_MS;
    return (
      <View style={startsRun ? styles.runStart : undefined}>
        <MessageBubble
          message={item}
          isMine={isMine}
          showSenderName={item.senderType === 'OPERATOR' && startsRun}
          showTime={endsRun}
          showSeen={item.id === seenMessageId}
          myActorKey={myActorKey}
          onLongPress={setPickerFor}
          onToggleReaction={onToggleReaction}
          onOpenImage={onOpenImage}
        />
      </View>
    );
  };

  const { soundEnabled, toggleSound } = useSettingsStore();
  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can come back any time with the same phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);

  const statusColor =
    status.tone === 'online' ? theme.success : status.tone === 'accent' ? theme.accent : theme.textMuted;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>S</Text>
          {status.tone === 'online' ? <View style={styles.onlineDot} /> : null}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Support</Text>
          <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
            {status.text}
          </Text>
        </View>
        <Pressable
          onPress={toggleSound}
          hitSlop={8}
          accessibilityRole="switch"
          accessibilityState={{ checked: soundEnabled }}
          accessibilityLabel={soundEnabled ? 'Mute message sounds' : 'Turn message sounds on'}
          style={({ pressed }) => [styles.soundToggle, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.soundIcon}>{soundEnabled ? '🔔' : '🔕'}</Text>
        </Pressable>
        <Pressable onPress={confirmLogout} hitSlop={8} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.6 }]}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {connection === 'disconnected' ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Connection lost. Reconnecting…</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {messages.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : messages.isError && data.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{messages.error.message}</Text>
            <Pressable onPress={() => void messages.refetch()} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>👋 Hi{customer ? `, ${customer.name}` : ''}!</Text>
            <Text style={styles.emptyText}>Send us a message and our team will get back to you.</Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            extraData={seenMessageId}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onEndReachedThreshold={0.3}
            onEndReached={() => {
              if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
            }}
            ListFooterComponent={
              messages.isFetchingNextPage ? (
                <ActivityIndicator style={styles.footer} color={theme.textMuted} />
              ) : !messages.hasNextPage ? (
                <Text style={styles.beginning}>This is the start of your conversation with Support</Text>
              ) : undefined
            }
          />
        )}
        <Composer />
      </KeyboardAvoidingView>

      <ReactionPicker
        visible={!!pickerFor}
        selected={pickerFor?.reactions.filter((r) => r.actorKeys.includes(myActorKey)).map((r) => r.emoji) ?? []}
        onSelect={(emoji) => pickerFor && onToggleReaction(pickerFor.id, emoji)}
        onClose={() => setPickerFor(null)}
      />
      <ImageViewer images={viewer?.images ?? null} initialIndex={viewer?.index ?? 0} onClose={() => setViewer(null)} />
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
      backgroundColor: t.background,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: t.onAccent, fontWeight: '700', fontSize: 18 },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: t.success,
      borderWidth: 2,
      borderColor: t.background,
    },
    headerText: { flex: 1, marginLeft: 10 },
    title: { fontSize: 17, fontWeight: '700', color: t.text },
    status: { fontSize: 13, marginTop: 1 },
    soundToggle: { padding: 6, marginRight: 6, borderRadius: 14, backgroundColor: t.surface },
    soundIcon: { fontSize: 16 },
    logout: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: t.surface },
    logoutText: { color: t.text, fontSize: 13, fontWeight: '600' },
    banner: { backgroundColor: t.warningBg, paddingVertical: 6, alignItems: 'center' },
    bannerText: { color: t.warningText, fontSize: 13, fontWeight: '500' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 22, fontWeight: '700', color: t.text, marginBottom: 8 },
    emptyText: { fontSize: 15, color: t.textMuted, textAlign: 'center' },
    retry: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: t.accent },
    retryText: { color: t.onAccent, fontWeight: '600' },
    listContent: { paddingVertical: 8 },
    runStart: { marginTop: 8 },
    footer: { marginVertical: 16 },
    beginning: { textAlign: 'center', color: t.textMuted, fontSize: 12, marginVertical: 20, paddingHorizontal: 32 },
  });
