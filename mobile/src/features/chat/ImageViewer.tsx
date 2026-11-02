import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  /** Absolute image URLs; null hides the viewer. */
  images: string[] | null;
  initialIndex: number;
  onClose: () => void;
}

function Slide({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [loading, setLoading] = useState(true);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={{ uri }}
        style={{ width, height }}
        resizeMode="contain"
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" /> : null}
    </View>
  );
}

/** Full-screen, swipeable viewer for the original (non-thumbnail) images of a message. */
export function ImageViewer({ images, initialIndex, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);

  return (
    <Modal
      visible={!!images}
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setIndex(initialIndex)}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.container}>
        {images ? (
          <FlatList
            data={images}
            keyExtractor={(uri, i) => `${i}-${uri}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(initialIndex, images.length - 1)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <Slide uri={item} width={width} height={height} />}
          />
        ) : null}
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          {images && images.length > 1 ? (
            <Text style={styles.counter}>
              {index + 1} / {images.length}
            </Text>
          ) : (
            <View />
          )}
          <Pressable onPress={onClose} style={styles.close} hitSlop={12} accessibilityLabel="Close image">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: { color: '#fff', fontSize: 15, fontWeight: '600' },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
