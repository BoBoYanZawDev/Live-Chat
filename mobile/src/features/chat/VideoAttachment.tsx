import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { mediaUrl } from '../../lib/config';
import type { Attachment } from '../../types';

function Player({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={style}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture={false}
    />
  );
}

/**
 * Shows a poster with a play button; the native player is only created on tap so a long chat
 * history doesn't spin up a player per video.
 */
export function VideoAttachment({ attachment, width }: { attachment: Attachment; width: number }) {
  const [active, setActive] = useState(false);
  const aspect =
    attachment.width && attachment.height ? Math.min(Math.max(attachment.width / attachment.height, 0.6), 1.8) : 16 / 9;
  const style = { width, height: width / aspect, borderRadius: 14, overflow: 'hidden' as const, backgroundColor: '#000' };

  if (active) return <Player uri={mediaUrl(attachment.url)} style={style} />;

  return (
    <Pressable onPress={() => setActive(true)} style={style} accessibilityLabel="Play video">
      {attachment.thumbnailUrl ? (
        <Image source={{ uri: mediaUrl(attachment.thumbnailUrl) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      <View style={styles.center}>
        <View style={styles.playButton}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 22, marginLeft: 4 },
});
