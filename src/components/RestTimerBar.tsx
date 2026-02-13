/**
 * RestTimerBar Component
 *
 * Inline rest timer bar for the active workout screen.
 * Shows a countdown with a shrinking progress fill and +/-10s adjustment buttons.
 *
 * Different from RestTimerInline (template editor):
 * - RestTimerInline: editable text input for configuring default rest seconds
 * - RestTimerBar: live countdown display during active workout with progress bar
 *
 * Layout: [-10s] [progress bar with MM:SS overlay] [+10s]
 * When inactive: shows 100% fill with the exercise's default rest time.
 * When active: shows countdown with shrinking fill from right to left.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface RestTimerBarProps {
  remainingSeconds: number;
  totalSeconds: number;
  isActive: boolean;
  onAdjust: (delta: number) => void;
}

function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RestTimerBar({
  remainingSeconds,
  totalSeconds,
  isActive,
  onAdjust,
}: RestTimerBarProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const percentage = totalSeconds > 0
    ? (remainingSeconds / totalSeconds) * 100
    : 100;

  const displayTime = isActive ? formatTime(remainingSeconds) : formatTime(totalSeconds);

  return (
    <View style={styles.container}>
      {/* -10s button */}
      <Pressable
        onPress={() => onAdjust(-10)}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>-10s</Text>
      </Pressable>

      {/* Progress bar with time overlay */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(100, Math.max(0, percentage))}%`,
                backgroundColor: isActive
                  ? theme.colors.accent
                  : theme.colors.bgElevated,
              },
            ]}
          />
        </View>
        <View style={styles.timeOverlay}>
          <Text style={[
            styles.timeText,
            isActive && styles.timeTextActive,
          ]}>
            {displayTime}
          </Text>
        </View>
      </View>

      {/* +10s button */}
      <Pressable
        onPress={() => onAdjust(10)}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>+10s</Text>
      </Pressable>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    button: {
      minWidth: 44,
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    barContainer: {
      flex: 1,
      height: 28,
      justifyContent: 'center',
    },
    barTrack: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: theme.radii.full,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: theme.radii.full,
    },
    timeOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeText: {
      fontSize: theme.typography.sizes.xs,
      fontFamily: theme.typography.fontFamilyMono,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textMuted,
    },
    timeTextActive: {
      color: theme.colors.textPrimary,
    },
  });
}
