/**
 * ResumeWorkoutModal Component
 *
 * Dashboard overlay for crash recovery. When the app launches and finds
 * a saved workout in AsyncStorage, this modal prompts the user to resume
 * or discard it.
 *
 * Shows template name + time since start (e.g., "started 45 min ago").
 * Discard has NO confirmation dialog (per locked decision).
 *
 * Uses React Native Modal (not Expo Router modal) with transparent
 * background and fade animation. Same dark overlay + centered card
 * pattern as ConfirmationModal.
 */

import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface ResumeWorkoutModalProps {
  visible: boolean;
  templateName: string;
  startedAt: string; // ISO timestamp
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * Format the time elapsed since the given ISO timestamp.
 * Returns a human-readable string like "5 min ago" or "2 hours ago".
 */
function formatTimeSince(isoTimestamp: string): string {
  const startTime = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const diffMs = now - startTime;

  if (diffMs < 0) return 'just now';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export function ResumeWorkoutModal({
  visible,
  templateName,
  startedAt,
  onResume,
  onDiscard,
}: ResumeWorkoutModalProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const timeSince = formatTimeSince(startedAt);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDiscard}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Resume Workout?</Text>

          <Text style={styles.templateName}>{templateName}</Text>
          <Text style={styles.timeText}>Started {timeSince}</Text>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={onDiscard}
              style={({ pressed }) => [
                styles.button,
                styles.discardButton,
                pressed && styles.discardButtonPressed,
              ]}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </Pressable>

            <Pressable
              onPress={onResume}
              style={({ pressed }) => [
                styles.button,
                styles.resumeButton,
                pressed && styles.resumeButtonPressed,
              ]}
            >
              <Text style={styles.resumeButtonText}>Resume</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
      marginBottom: theme.spacing.md,
    },
    templateName: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.accent,
      marginBottom: theme.spacing.xs,
    },
    timeText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.md,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    button: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
    },
    discardButton: {
      backgroundColor: theme.colors.bgElevated,
    },
    discardButtonPressed: {
      opacity: 0.7,
    },
    discardButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    resumeButton: {
      backgroundColor: theme.colors.accent,
    },
    resumeButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    resumeButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
  });
}
