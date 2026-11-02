import { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { mediaUrl } from '../../lib/config';
import { useTheme, type Theme } from '../../lib/theme';
import type { Attachment, ChatMessage } from '../../types';
import { formatTime } from './format';
import { VideoAttachment } from './VideoAttachment';

export const BUBBLE_MAX_WIDTH = 260;
const GAP = 4;

interface Props {
  message: ChatMessage;
  isMine: boolean;
  /** Operator name above the first bubble of a run. */
  showSenderName: boolean;
  /** Last bubble of a run from the same sender: show the timestamp. */
  showTime: boolean;
  showSeen: boolean;
  myActorKey: string;
  onLongPress: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenImage: (images: string[], index: number) => void;
}

function ImageGrid({
  images,
  onOpen,
  onLongPress,
}: {
  images: Attachment[];
  onOpen: (index: number) => void;
  onLongPress: () => void;
}) {
  const cols = images.length === 1 ? 1 : images.length === 2 || images.length === 4 ? 2 : 3;
  const size = cols === 1 ? BUBBLE_MAX_WIDTH : (BUBBLE_MAX_WIDTH - GAP * (cols - 1)) / cols;
  const single = images[0];
  const singleHeight =
    single?.width && single.height
      ? Math.min(Math.max(BUBBLE_MAX_WIDTH * (single.height / single.width), 120), 360)
      : BUBBLE_MAX_WIDTH;

  return (
    <View style={[styles.grid, { width: BUBBLE_MAX_WIDTH, gap: GAP }]}>
      {images.map((a, i) => (
        <Pressable key={a.id} onPress={() => onOpen(i)} onLongPress={onLongPress} delayLongPress={300}>
          <Image
            source={{ uri: mediaUrl(a.thumbnailUrl ?? a.url) }}
            style={{
              width: size,
              height: cols === 1 ? singleHeight : size,
              borderRadius: cols === 1 ? 16 : 8,
              backgroundColor: '#8884',
            }}
            resizeMode="cover"
          />
        </Pressable>
      ))}
    </View>
  );
}

function MessageBubbleImpl({
  message,
  isMine,
  showSenderName,
  showTime,
  showSeen,
  myActorKey,
  onLongPress,
  onToggleReaction,
  onOpenImage,
}: Props) {
  const theme = useTheme();
  const styles2 = useMemo(() => makeStyles(theme), [theme]);

  if (message.senderType === 'SYSTEM') {
    return (
      <View style={styles2.systemRow}>
        <Text style={styles2.systemText}>{message.content}</Text>
      </View>
    );
  }

  const images = message.attachments.filter((a) => a.type === 'IMAGE');
  const videos = message.attachments.filter((a) => a.type === 'VIDEO');
  const hasText = message.content.trim().length > 0;
  const longPress = () => {
    if (!message.pending) onLongPress(message);
  };

  return (
    <View style={[styles2.row, isMine ? styles2.rowMine : styles2.rowTheirs, message.pending && styles2.pending]}>
      {showSenderName && !isMine ? (
        <Text style={styles2.senderName}>{message.sender?.name ?? 'Support'}</Text>
      ) : null}

      {images.length > 0 ? (
        <ImageGrid
          images={images}
          onLongPress={longPress}
          onOpen={(i) => onOpenImage(images.map((a) => mediaUrl(a.url)), i)}
        />
      ) : null}

      {videos.map((v) => (
        <View key={v.id} style={styles2.media}>
          <VideoAttachment attachment={v} width={BUBBLE_MAX_WIDTH} />
        </View>
      ))}

      {hasText ? (
        <Pressable
          onLongPress={longPress}
          delayLongPress={300}
          style={[styles2.bubble, isMine ? styles2.bubbleMine : styles2.bubbleTheirs]}
        >
          <Text style={[styles2.text, { color: isMine ? theme.onAccent : theme.onIncoming }]} selectable={false}>
            {message.content}
          </Text>
        </Pressable>
      ) : null}

      {message.reactions.length > 0 ? (
        <View style={[styles2.reactions, isMine ? styles2.reactionsMine : null]}>
          {message.reactions.map((r) => {
            const mine = r.actorKeys.includes(myActorKey);
            return (
              <Pressable
                key={r.emoji}
                onPress={() => onToggleReaction(message.id, r.emoji)}
                style={[styles2.chip, mine && styles2.chipMine]}
                accessibilityLabel={`${r.emoji} ${r.count}${mine ? ', including you' : ''}`}
              >
                <Text style={styles2.chipEmoji}>{r.emoji}</Text>
                {r.count > 1 ? <Text style={[styles2.chipCount, mine && styles2.chipCountMine]}>{r.count}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {message.pending ? (
        <Text style={styles2.meta}>Sending…</Text>
      ) : showTime || showSeen ? (
        <Text style={styles2.meta}>
          {showTime ? formatTime(message.createdAt) : ''}
          {showTime && showSeen ? ' · ' : ''}
          {showSeen ? 'Seen' : ''}
        </Text>
      ) : null}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: { paddingHorizontal: 12, marginVertical: 1, maxWidth: '100%' },
    rowMine: { alignItems: 'flex-end' },
    rowTheirs: { alignItems: 'flex-start' },
    pending: { opacity: 0.55 },
    senderName: { fontSize: 12, color: t.textMuted, marginLeft: 12, marginTop: 8, marginBottom: 2 },
    media: { marginVertical: 1 },
    bubble: { maxWidth: BUBBLE_MAX_WIDTH + 20, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginTop: 1 },
    bubbleMine: { backgroundColor: t.accent },
    bubbleTheirs: { backgroundColor: t.incoming },
    text: { fontSize: 16, lineHeight: 21 },
    reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -4, marginHorizontal: 6 },
    reactionsMine: { justifyContent: 'flex-end' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 12,
      backgroundColor: t.dark ? t.surfaceAlt : t.background,
      borderWidth: 1,
      borderColor: t.border,
    },
    chipMine: { borderColor: t.accent, backgroundColor: t.dark ? '#0A3A6B' : '#E7F1FF' },
    chipEmoji: { fontSize: 14 },
    chipCount: { fontSize: 12, color: t.textMuted, marginLeft: 3 },
    chipCountMine: { color: t.accent, fontWeight: '600' },
    meta: { fontSize: 11, color: t.textMuted, marginTop: 3, marginHorizontal: 6, marginBottom: 4 },
    systemRow: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 8 },
    systemText: { fontSize: 12, color: t.textMuted, textAlign: 'center' },
  });
