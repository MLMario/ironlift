/**
 * RestTimerBar Component
 *
 * Inline rest timer bar for the active workout screen.
 * Three visual states: INACTIVE, EDITING, ACTIVE.
 *
 * INACTIVE: Full progress fill showing exercise's rest time, tappable to edit.
 * EDITING: TextInput replaces time text, auto-focused, +/-10s adjust editText.
 * ACTIVE: Countdown with shrinking fill, tappable to pause and edit.
 *
 * Different from RestTimerInline (template editor):
 * - RestTimerInline: editable text input for configuring default rest seconds
 * - RestTimerBar: live countdown + inline editing during active workout
 *
 * Layout: [-10s] [progress bar with MM:SS overlay or TextInput] [+10s]
 */

import { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { formatTime, parseTimeInput, clampSeconds } from '@/lib/timeUtils';

// ============================================================================
// Types
// ============================================================================

interface RestTimerBarProps {
  remainingSeconds: number;
  totalSeconds: number;
  isActive: boolean;
  restSeconds: number;
  onAdjust: (delta: number) => void;
  onRestTimeChange: (seconds: number) => void;
  onTimerPause: () => void;
  onTimerRestart: (seconds: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function RestTimerBar({
  remainingSeconds,
  totalSeconds,
  isActive,
  restSeconds,
  onAdjust,
  onRestTimeChange,
  onTimerPause,
  onTimerRestart,
}: RestTimerBarProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Internal editing state
  const [mode, setMode] = useState<'inactive' | 'editing'>('inactive');
  const [editText, setEditText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const wasActiveBeforeEdit = useRef<boolean>(false);

  // Determine effective display mode:
  // editing takes priority, then isActive prop, then inactive
  const effectiveMode = mode === 'editing' ? 'editing'
    : isActive ? 'active'
    : 'inactive';

  // Progress bar percentage
  const percentage = effectiveMode === 'active' && totalSeconds > 0
    ? (remainingSeconds / totalSeconds) * 100
    : 100;

  // Progress bar fill color
  const fillColor = effectiveMode === 'inactive'
    ? theme.colors.textMuted
    : theme.colors.accent;

  // Display time (only used for inactive and active, editing shows TextInput)
  const displayTime = effectiveMode === 'active'
    ? formatTime(remainingSeconds)
    : formatTime(restSeconds);

  // --- Handlers ---

  const handleTimeTextPress = useCallback(() => {
    if (isActive) {
      onTimerPause();
      wasActiveBeforeEdit.current = true;
    } else {
      wasActiveBeforeEdit.current = false;
    }
    setEditText(formatTime(restSeconds));
    setMode('editing');
    // Auto-focus via autoFocus prop, plus fallback ref focus
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isActive, restSeconds, onTimerPause]);

  const handleBlur = useCallback(() => {
    const parsed = parseTimeInput(editText);
    if (parsed !== null) {
      const clamped = clampSeconds(parsed, 10, 600);
      onRestTimeChange(clamped);
      if (wasActiveBeforeEdit.current) {
        onTimerRestart(clamped);
        wasActiveBeforeEdit.current = false;
      }
    } else {
      // Unparseable -- revert (don't change rest time)
      if (wasActiveBeforeEdit.current) {
        onTimerRestart(restSeconds);
        wasActiveBeforeEdit.current = false;
      }
    }
    setMode('inactive');
  }, [editText, restSeconds, onRestTimeChange, onTimerRestart]);

  const handleAdjustInEditMode = useCallback((delta: number) => {
    const current = parseTimeInput(editText);
    if (current === null) return; // no-op for unparseable
    const newVal = clampSeconds(current + delta, 10, 600);
    setEditText(formatTime(newVal));
  }, [editText]);

  const handleAdjustNormal = useCallback((delta: number) => {
    const newVal = clampSeconds(restSeconds + delta, 10, 600);
    onRestTimeChange(newVal);
    if (isActive) {
      onAdjust(delta);
    }
  }, [restSeconds, isActive, onRestTimeChange, onAdjust]);

  // Route button press to correct handler based on mode
  const handleButtonPress = useCallback((delta: number) => {
    if (mode === 'editing') {
      handleAdjustInEditMode(delta);
    } else {
      handleAdjustNormal(delta);
    }
  }, [mode, handleAdjustInEditMode, handleAdjustNormal]);

  return (
    <View style={styles.container}>
      {/* -10s button */}
      <Pressable
        onPressIn={() => handleButtonPress(-10)}
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
                backgroundColor: fillColor,
              },
            ]}
          />
        </View>
        <View style={styles.timeOverlay}>
          {effectiveMode === 'editing' ? (
            <TextInput
              ref={inputRef}
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              onBlur={handleBlur}
              autoFocus
              keyboardType="numbers-and-punctuation"
              selectTextOnFocus
              textAlign="center"
              cursorColor={theme.colors.accent}
            />
          ) : (
            <Pressable onPress={handleTimeTextPress} hitSlop={8}>
              <Text style={[
                styles.timeText,
                effectiveMode === 'active' && styles.timeTextActive,
              ]}>
                {displayTime}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* +10s button */}
      <Pressable
        onPressIn={() => handleButtonPress(10)}
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

// ============================================================================
// Styles
// ============================================================================

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
      height: 28,
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
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamilyMono,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textMuted,
    },
    timeTextActive: {
      color: theme.colors.textPrimary,
    },
    editInput: {
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamilyMono,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
      backgroundColor: 'transparent',
      width: 60,
      height: 28,
      padding: 0,
      textAlign: 'center',
    },
  });
}
