/**
 * KebabMenu Component
 *
 * A reusable three-dot horizontal menu with a dropdown action menu.
 * Uses React Native Modal with transparent background and fade animation
 * (proven pattern in this codebase via ConfirmationModal).
 *
 * Currently supports a single "Delete" action. Can be extended with
 * additional menu items as needed.
 */

import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface KebabMenuProps {
  onDelete: () => void;
}

export function KebabMenu({ onDelete }: KebabMenuProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleDelete = () => {
    setMenuVisible(false);
    onDelete();
  };

  return (
    <View>
      <Pressable
        onPress={() => setMenuVisible(true)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={theme.colors.textMuted}
        />
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.dropdownAnchor}>
            <View style={styles.dropdown}>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    trigger: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    triggerPressed: {
      opacity: 0.6,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    dropdownAnchor: {
      position: 'absolute',
      top: 80,
      right: theme.spacing.lg,
      alignItems: 'flex-end',
    },
    dropdown: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      minWidth: 120,
      ...theme.shadows.md,
      elevation: 8,
    },
    menuItem: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      borderRadius: theme.radii.sm,
    },
    menuItemPressed: {
      backgroundColor: theme.colors.bgElevated,
    },
    deleteText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.danger,
    },
  });
}
