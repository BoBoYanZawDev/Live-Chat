import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { UploadFile } from '../../lib/api';
import { LIMITS } from '../../lib/config';
import { useTheme, type Theme } from '../../lib/theme';
import { notifyTyping, stopTyping, useSendMediaMessage, useSendMessage } from './api';
import { formatBytes } from './format';

interface PickedFile extends UploadFile {
  key: string;
  kind: 'image' | 'video';
  size?: number;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const extOf = (s: string | null | undefined) => s?.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();

/** Normalises a picker asset into an upload part, or returns a human-readable rejection reason. */
function toPickedFile(asset: ImagePicker.ImagePickerAsset, i: number): PickedFile | string {
  const kind = asset.type === 'video' ? 'video' : 'image';
  const type = (asset.mimeType ?? EXT_TO_MIME[extOf(asset.fileName) ?? extOf(asset.uri) ?? ''] ?? '').toLowerCase();
  const label = asset.fileName ?? `${kind} ${i + 1}`;
  const allowed: readonly string[] = kind === 'video' ? LIMITS.videoTypes : LIMITS.imageTypes;
  if (!allowed.includes(type)) {
    return `${label}: unsupported format${type ? ` (${type})` : ''}. Use JPEG, PNG, WebP, GIF, AVIF, MP4, WebM or MOV.`;
  }
  const max = kind === 'video' ? LIMITS.maxVideoBytes : LIMITS.maxImageBytes;
  if (asset.fileSize != null && asset.fileSize > max) {
    return `${label}: ${formatBytes(asset.fileSize)} is over the ${formatBytes(max)} ${kind} limit.`;
  }
  // iOS "Compatible" mode transcodes HEIC → JPEG but may keep the .HEIC file name.
  const ext = MIME_TO_EXT[type];
  const base = (asset.fileName ?? `${kind}-${Date.now()}-${i}`).replace(/\.[^.]+$/, '');
  return { key: `${asset.uri}-${i}`, uri: asset.uri, name: `${base}.${ext}`, type, kind, size: asset.fileSize };
}

export function Composer({ disabled }: { disabled?: boolean }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const sendText = useSendMessage();
  const sendMedia = useSendMediaMessage();
  const uploading = sendMedia.isPending;

  const canSend = !uploading && !disabled && (text.trim().length > 0 || files.length > 0);

  const pick = async () => {
    const remaining = LIMITS.maxFiles - files.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can attach up to ${LIMITS.maxFiles} files per message.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to send photos and videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      orderedSelection: true,
      // Turn HEIC/HEVC into JPEG/H.264 so the backend's allow-list accepts them.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    });
    if (result.canceled) return;

    const accepted: PickedFile[] = [];
    const rejected: string[] = [];
    result.assets.slice(0, remaining).forEach((asset, i) => {
      const r = toPickedFile(asset, files.length + i);
      if (typeof r === 'string') rejected.push(r);
      else accepted.push(r);
    });
    if (result.assets.length > remaining) rejected.push(`Only ${LIMITS.maxFiles} files can be attached per message.`);
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    if (rejected.length) Alert.alert("Some files weren't added", rejected.join('\n\n'));
  };

  const send = () => {
    if (!canSend) return;
    const content = text.trim();
    stopTyping();

    if (files.length === 0) {
      setText('');
      sendText.mutate(content, {
        onError: (err) => {
          setText((cur) => (cur ? cur : content));
          Alert.alert('Message not sent', err.message);
        },
      });
      return;
    }

    sendMedia.mutate(
      { content, files: files.map(({ uri, name, type }) => ({ uri, name, type })) },
      {
        onSuccess: () => {
          setText('');
          setFiles([]);
        },
        onError: (err) => Alert.alert('Upload failed', err.message),
      },
    );
  };

  return (
    <View style={styles.container}>
      {files.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewStrip}>
          {files.map((f) => (
            <View key={f.key} style={styles.preview}>
              {f.kind === 'image' ? (
                <Image source={{ uri: f.uri }} style={styles.previewImage} />
              ) : (
                <View style={[styles.previewImage, styles.videoTile]} />
              )}
              {f.kind === 'video' ? (
                <View style={styles.videoBadge}>
                  <Text style={styles.videoBadgeText}>▶</Text>
                </View>
              ) : null}
              {!uploading ? (
                <Pressable
                  style={styles.remove}
                  hitSlop={8}
                  onPress={() => setFiles((prev) => prev.filter((p) => p.key !== f.key))}
                  accessibilityLabel="Remove attachment"
                >
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {uploading ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${sendMedia.progress}%` }]} />
        </View>
      ) : null}

      <View style={styles.row}>
        <Pressable
          onPress={pick}
          disabled={uploading || disabled}
          style={({ pressed }) => [styles.iconButton, (uploading || disabled) && styles.disabled, pressed && styles.pressed]}
          accessibilityLabel="Attach photos or videos"
        >
          <Text style={styles.attachIcon}>＋</Text>
        </Pressable>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (v.length > 0) notifyTyping();
            else stopTyping();
          }}
          onBlur={stopTyping}
          placeholder="Message"
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={4000}
          editable={!uploading}
        />

        <Pressable
          onPress={send}
          disabled={!canSend}
          style={({ pressed }) => [styles.sendButton, !canSend && styles.disabled, pressed && styles.pressed]}
          accessibilityLabel="Send"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={theme.onAccent} />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </Pressable>
      </View>
      {uploading ? <Text style={styles.progressLabel}>Uploading… {sendMedia.progress}%</Text> : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      backgroundColor: t.background,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 8,
    },
    previewStrip: { gap: 8, paddingHorizontal: 4, paddingBottom: 8 },
    preview: { width: 64, height: 64 },
    previewImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: t.surfaceAlt },
    videoTile: { backgroundColor: '#222' },
    videoBadge: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    videoBadgeText: { color: '#fff', fontSize: 20, textShadowColor: '#000', textShadowRadius: 4 },
    remove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.dark ? t.surfaceAlt : '#333',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.background,
    },
    removeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    progressTrack: { height: 3, borderRadius: 2, backgroundColor: t.surfaceAlt, marginHorizontal: 4, marginBottom: 8, overflow: 'hidden' },
    progressFill: { height: 3, backgroundColor: t.accent },
    progressLabel: { fontSize: 11, color: t.textMuted, marginLeft: 52, marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    attachIcon: { fontSize: 26, color: t.accent, lineHeight: 30 },
    input: {
      flex: 1,
      minHeight: 38,
      maxHeight: 120,
      borderRadius: 19,
      backgroundColor: t.surface,
      color: t.text,
      paddingHorizontal: 14,
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
      paddingBottom: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 16,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendIcon: { color: t.onAccent, fontSize: 16, marginLeft: 2 },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.7 },
  });
