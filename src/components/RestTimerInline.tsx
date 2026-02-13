/**
 * RestTimerInline Component
 *
 * Inline rest timer configuration for the template editor.
 * Shows -10s button, MM:SS time input, and +10s button in a row.
 *
 * Time formatting helpers:
 * - formatTime: converts seconds to "M:SS" display (e.g., 90 -> "1:30")
 * - parseTimeInput: handles plain seconds ("90") or MM:SS ("1:30") input
 *
 * Minimum rest time is 0 seconds. No progress bar in template editor context
 * (progress bar is a workout-only feature for Phase 5).
 */

import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface RestTimerInlineProps {
  seconds: number;
  onSecondsChange: (value: number) => void;
}

/**
 * Format seconds to M:SS display string.
 * Examples: 90 -> "1:30", 60 -> "1:00", 45 -> "0:45", 0 -> "0:00"
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse user input to seconds.
 * Handles plain seconds ("90") or M:SS format ("1:30").
 * Returns minimum 0.
 */
function parseTimeInput(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '') return 0;

  // Check for M:SS or MM:SS format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return Math.max(0, mins * 60 + secs);
  }

  // Plain number -- treat as seconds
  const parsed = parseInt(trimmed, 10);
  return Math.max(0, isNaN(parsed) ? 0 : parsed);
}

export function RestTimerInline({
  seconds,
  onSecondsChange,
}: RestTimerInlineProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [editingText, setEditingText] = useState<string | null>(null);

  const handleDecrement = () => {
    onSecondsChange(Math.max(0, seconds - 10));
  };

  const handleIncrement = () => {
    onSecondsChange(seconds + 10);
  };

  const handleFocus = () => {
    setEditingText(formatTime(seconds));
  };

  const handleBlur = () => {
    if (editingText !== null) {
      onSecondsChange(parseTimeInput(editingText));
      setEditingText(null);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleDecrement} style={styles.button}>
        <Text style={styles.buttonText}>-10s</Text>
      </Pressable>

      <TextInput
        style={styles.timeInput}
        value={editingText !== null ? editingText : formatTime(seconds)}
        onChangeText={setEditingText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType="numbers-and-punctuation"
        selectTextOnFocus
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable onPress={handleIncrement} style={styles.button}>
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
    buttonText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    timeInput: {
      width: 60,
      height: 40,
      textAlign: 'center',
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamilyMono,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
    },
  });
}
