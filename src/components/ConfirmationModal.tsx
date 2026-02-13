/**
 * ConfirmationModal Component
 *
 * A reusable modal for all workout confirmations:
 * - Finish workout confirmation
 * - Cancel workout confirmation
 * - Template update prompt (non-dismissible overlay)
 *
 * Uses React Native Modal (not Expo Router modal) with transparent
 * background and fade animation. Dark overlay + centered card pattern
 * matching iOS conventions.
 *
 * The dismissOnOverlayPress prop controls whether tapping the dark overlay
 * calls onCancel. For the template update modal, this is false (per locked
 * decision: cannot be dismissed by tapping overlay).
 */

import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  secondaryMessage?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: 'primary' | 'danger';
  dismissOnOverlayPress?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  secondaryMessage,
  confirmLabel,
  cancelLabel,
  confirmVariant,
  dismissOnOverlayPress = true,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const confirmBgColor =
    confirmVariant === 'danger' ? theme.colors.danger : theme.colors.accent;
  const confirmPressedColor =
    confirmVariant === 'danger'
      ? theme.colors.dangerHover
      : theme.colors.accentHover;

  const handleOverlayPress = () => {
    if (dismissOnOverlayPress) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={handleOverlayPress}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {secondaryMessage ? (
            <Text style={styles.secondaryMessage}>{secondaryMessage}</Text>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? confirmPressedColor : confirmBgColor },
              ]}
            >
              <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    message: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
      lineHeight: theme.typography.sizes.base * theme.typography.lineHeights.base,
      marginBottom: theme.spacing.sm,
    },
    secondaryMessage: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      fontStyle: 'italic',
      lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.base,
      marginBottom: theme.spacing.sm,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    button: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
    },
    cancelButton: {
      backgroundColor: theme.colors.bgElevated,
    },
    cancelButtonPressed: {
      opacity: 0.7,
    },
    cancelButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    confirmButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
  });
}
