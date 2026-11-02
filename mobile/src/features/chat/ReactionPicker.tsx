import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

interface Props {
  visible: boolean;
  /** Emojis the customer has already reacted with (highlighted). */
  selected: string[];
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ visible, selected, onSelect, onClose }: Props) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onClose}>
        <View style={[styles.row, { backgroundColor: t.dark ? t.surfaceAlt : t.background }]}>
          {REACTION_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                onSelect(emoji);
                onClose();
              }}
              style={({ pressed }) => [
                styles.emojiButton,
                selected.includes(emoji) && { backgroundColor: t.dark ? t.border : t.surfaceAlt },
                pressed && styles.pressed,
              ]}
              accessibilityLabel={`React with ${emoji}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  emojiButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 1.25 }] },
  emoji: { fontSize: 28 },
});
