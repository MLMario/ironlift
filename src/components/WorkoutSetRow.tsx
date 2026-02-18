/**
 * WorkoutSetRow Component
 *
 * A single set row in the active workout screen with swipe-to-delete gesture.
 * Extends the template editor's SetRow concept with:
 * - Done checkbox (replaces delete button)
 * - Swipe-to-delete gesture using react-native-gesture-handler + reanimated
 * - Done state visual treatment (60% opacity, green set number badge)
 *
 * Layout (4-column grid matching web):
 * Column 1: Set number badge (32px)
 * Column 2: Weight input (flex:1, decimal-pad)
 * Column 3: Reps input (flex:1, numeric)
 * Column 4: Done checkbox (44x44px)
 *
 * Swipe-to-delete:
 * - Left swipe reveals a 70px delete button behind the row
 * - Rubberband resistance past -80px
 * - Snap threshold at -40px or velocity < -500
 * - Only one row can be revealed at a time (coordinated via isRevealed prop)
 */

import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

// ============================================================================
// Types
// ============================================================================

interface WorkoutSetRowProps {
  setNumber: number;
  weight: number;
  reps: number;
  isDone: boolean;
  isRevealed: boolean;
  onWeightChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onReveal: () => void;
  onClose: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DELETE_BUTTON_WIDTH = 70;
const MAX_DRAG = -80;
const SNAP_THRESHOLD = -40;
const VELOCITY_THRESHOLD = -500;
const RUBBERBAND_FACTOR = 0.2;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format weight for display: round to 1 decimal, keep as string.
 */
function formatWeight(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

// ============================================================================
// Component
// ============================================================================

function WorkoutSetRowInner({
  setNumber,
  weight,
  reps,
  isDone,
  isRevealed,
  onWeightChange,
  onRepsChange,
  onToggleDone,
  onDelete,
  onReveal,
  onClose,
}: WorkoutSetRowProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Shared value for swipe translation
  const translateX = useSharedValue(0);

  // Local text buffer for weight input -- prevents controlled input loop
  // from destroying trailing decimals (e.g., "72." -> parseFloat -> 72 -> "72")
  const [editingWeight, setEditingWeight] = useState<string | null>(null);

  // When another row opens (isRevealed becomes false externally),
  // animate this row back to closed position
  useEffect(() => {
    if (!isRevealed && translateX.value !== 0) {
      translateX.value = withSpring(0, SPRING_CONFIG);
    }
  }, [isRevealed, translateX]);

  // --- Swipe gesture ---

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // 10px dead zone before activating
    .failOffsetY([-5, 5]) // Fail if vertical movement > 5px (let ScrollView take over)
    .onUpdate((e) => {
      'worklet';
      if (e.translationX > 0) {
        // Don't allow right swipe beyond 0
        translateX.value = 0;
        return;
      }

      if (e.translationX < MAX_DRAG) {
        // Rubberband resistance past MAX_DRAG
        const overDrag = MAX_DRAG - e.translationX;
        translateX.value = MAX_DRAG - overDrag * RUBBERBAND_FACTOR;
      } else {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      'worklet';
      const shouldReveal =
        translateX.value < SNAP_THRESHOLD || e.velocityX < VELOCITY_THRESHOLD;

      if (shouldReveal) {
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH, SPRING_CONFIG);
        runOnJS(onReveal)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        runOnJS(onClose)();
      }
    });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // --- Weight input handlers (same pattern as SetRow) ---

  const handleWeightFocus = () => {
    setEditingWeight(formatWeight(weight));
  };

  const handleWeightChange = (text: string) => {
    setEditingWeight(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      onWeightChange(Math.round(parsed * 10) / 10);
    }
  };

  const handleWeightBlur = () => {
    const text = editingWeight ?? '';
    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      onWeightChange(0);
    } else {
      onWeightChange(Math.round(parsed * 10) / 10);
    }
    setEditingWeight(null);
  };

  // --- Reps input handler ---

  const handleRepsChange = (text: string) => {
    const parsed = parseInt(text, 10);
    onRepsChange(isNaN(parsed) ? 0 : parsed);
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button positioned behind the row */}
      <View style={styles.deleteButtonBehind}>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButtonInner,
            pressed && styles.deleteButtonPressed,
          ]}
        >
          <Ionicons name="trash-outline" size={20} color="#ffffff" />
        </Pressable>
      </View>

      {/* Swipeable row content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.rowOuter,
            animatedRowStyle,
          ]}
        >
          <View style={[styles.row, isDone && styles.rowContentDone]}>
            {/* Column 1: Set number badge */}
            <View
              style={[
                styles.setNumberBadge,
                isDone && {
                  backgroundColor: theme.colors.success,
                },
              ]}
            >
              <Text
                style={[
                  styles.setNumberText,
                  isDone && styles.setNumberTextDone,
                ]}
              >
                {setNumber}
              </Text>
            </View>

            {/* Column 2: Weight input */}
            <TextInput
              style={styles.input}
              value={
                editingWeight !== null ? editingWeight : formatWeight(weight)
              }
              onChangeText={handleWeightChange}
              onFocus={handleWeightFocus}
              onBlur={handleWeightBlur}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Column 3: Reps input */}
            <TextInput
              style={styles.input}
              value={String(reps)}
              onChangeText={handleRepsChange}
              keyboardType="numeric"
              selectTextOnFocus
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Column 4: Done checkbox */}
            <Pressable
              onPress={onToggleDone}
              style={styles.checkboxButton}
              hitSlop={4}
            >
              <Ionicons
                name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={isDone ? theme.colors.success : theme.colors.textMuted}
              />
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const WorkoutSetRow = React.memo(WorkoutSetRowInner);

// ============================================================================
// Styles
// ============================================================================

function getStyles(theme: Theme) {
  return StyleSheet.create({
    swipeContainer: {
      position: 'relative',
      overflow: 'hidden',
    },
    deleteButtonBehind: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: DELETE_BUTTON_WIDTH,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.danger,
    },
    deleteButtonInner: {
      width: DELETE_BUTTON_WIDTH,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButtonPressed: {
      backgroundColor: theme.colors.dangerHover,
    },
    rowOuter: {
      backgroundColor: theme.colors.bgSurface,
    },
    rowContentDone: {
      opacity: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    setNumberBadge: {
      width: 32,
      height: 32,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    setNumberText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textMuted,
    },
    setNumberTextDone: {
      color: theme.colors.textPrimary,
    },
    input: {
      flex: 1,
      height: 40,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      textAlign: 'center',
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamilyMono,
      color: theme.colors.textPrimary,
      paddingHorizontal: theme.spacing.sm,
    },
    checkboxButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
