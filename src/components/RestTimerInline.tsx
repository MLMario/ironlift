/**
 * RestTimerInline Component
 *
 * Inline rest timer configuration for the template editor.
 * Shows -10s button, MM:SS time input, and +10s button in a row.
 *
 * Time parsing and formatting delegated to shared utilities in @/lib/timeUtils.
 * Minimum rest time is 0 seconds. No progress bar in template editor context
 * (progress bar is a workout-only feature for Phase 5).
 */

import { formatTime, parseTimeInput } from "@/lib/timeUtils";
import type { Theme } from "@/theme";
import { useTheme } from "@/theme";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface RestTimerInlineProps {
  seconds: number;
  onSecondsChange: (value: number) => void;
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
      const parsed = parseTimeInput(editingText);
      // Only update if parseable -- unparseable input reverts to previous value
      if (parsed !== null) {
        onSecondsChange(parsed);
      }
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
        placeholderTextColor={theme.colors.textPrimary}
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
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      justifyContent: "center",
    },
    button: {
      minWidth: 40,
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    timeInput: {
      width: 200,
      height: 40,
      textAlign: "center",
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamilyMono,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
    },
  });
}
