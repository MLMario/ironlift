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

import { useState, useRef } from 'react';
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
  const [triggerPos, setTriggerPos] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const triggerRef = useRef<View>(null);

  const handleOpenMenu = () => {
    triggerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setTriggerPos({ x: pageX, y: pageY, width, height });
      setMenuVisible(true);
    });
  };

  const handleClose = () => {
    setMenuVisible(false);
  };

  const handleDelete = () => {
    handleClose();
    onDelete();
  };

  return (
    <View ref={triggerRef} collapsable={false}>
      <Pressable
        onPress={handleOpenMenu}
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
        onRequestClose={handleClose}
      >
        <Pressable
          style={styles.overlay}
          onPress={handleClose}
        >
          <View style={[styles.dropdownAnchor, { top: triggerPos ? triggerPos.y + triggerPos.height : 80 }]}>
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
