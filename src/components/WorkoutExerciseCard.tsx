/**
 * WorkoutExerciseCard Component
 *
 * Collapsible accordion card for a single exercise in the active workout.
 * Composes ProgressRing (header), WorkoutSetRow (set table), and RestTimerBar (timer).
 *
 * Features:
 * - Tappable header with ProgressRing, exercise name, category badge, chevron
 * - Smooth expand/collapse via LayoutAnimation
 * - Column headers for the set table ("#", "lbs", "Reps", checkmark)
 * - WorkoutSetRow for each set with swipe coordination
 * - RestTimerBar for inline rest timer
 * - Add Set button (accent border, copies last set values)
 * - Remove Exercise button with Alert.alert confirmation
 *
 * No reorder controls (per research discretion: no mid-workout exercise reordering).
 */

import { ProgressRing } from "@/components/ProgressRing";
import { RestTimerBar } from "@/components/RestTimerBar";
import { WorkoutSetRow } from "@/components/WorkoutSetRow";
import type { WorkoutExercise } from "@/hooks/useWorkoutState";
import type { Theme } from "@/theme";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ============================================================================
// Types
// ============================================================================

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  // Set handlers
  onWeightChange: (
    exerciseIndex: number,
    setIndex: number,
    weight: number,
  ) => void;
  onRepsChange: (exerciseIndex: number, setIndex: number, reps: number) => void;
  onToggleDone: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onDeleteSet: (exerciseIndex: number, setIndex: number) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  // Timer props
  timerRemaining: number;
  timerTotal: number;
  isTimerActive: boolean;
  onAdjustTimer: (delta: number) => void;
  restSeconds: number;
  onRestTimeChange: (seconds: number) => void;
  onTimerPause: () => void;
  onTimerRestart: (seconds: number) => void;
  // Swipe coordination
  revealedSetKey: string | null;
  onSetReveal: (key: string) => void;
  onSetClose: (key: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function WorkoutExerciseCard({
  exercise,
  exerciseIndex,
  onWeightChange,
  onRepsChange,
  onToggleDone,
  onAddSet,
  onDeleteSet,
  onRemoveExercise,
  timerRemaining,
  timerTotal,
  isTimerActive,
  onAdjustTimer,
  restSeconds,
  onRestTimeChange,
  onTimerPause,
  onTimerRestart,
  revealedSetKey,
  onSetReveal,
  onSetClose,
}: WorkoutExerciseCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  // All cards start expanded (user collapses manually, matching web behavior)
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate progress for the header ring
  const completedSets = exercise.sets.filter((s) => s.is_done).length;
  const totalSets = exercise.sets.length;

  // --- Toggle expand/collapse with LayoutAnimation ---
  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  // --- Remove exercise with confirmation ---
  const handleRemoveExercise = useCallback(() => {
    Alert.alert(
      "Remove Exercise?",
      `Remove ${exercise.name} from this workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemoveExercise(exerciseIndex),
        },
      ],
    );
  }, [exercise.name, exerciseIndex, onRemoveExercise]);

  return (
    <View style={styles.card}>
      {/* ============================================================ */}
      {/* Header (always visible, tappable) */}
      {/* ============================================================ */}
      <Pressable onPress={toggleExpanded} style={styles.header}>
        <ProgressRing completed={completedSets} total={totalSets} size={40} />

        <View style={styles.headerInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={styles.categoryBadge}>{exercise.category}</Text>
        </View>

        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </Pressable>

      {/* ============================================================ */}
      {/* Expanded body */}
      {/* ============================================================ */}
      {isExpanded && (
        <View style={styles.body}>
          {/* Column headers */}
          <View style={styles.tableHeader}>
            <View style={styles.setNumberColumn}>
              <Text style={styles.tableHeaderText}>#</Text>
            </View>
            <Text style={[styles.tableHeaderText, styles.flexColumn]}>lbs</Text>
            <Text style={[styles.tableHeaderText, styles.flexColumn]}>
              Reps
            </Text>
            <View style={styles.checkboxColumn}>
              <Ionicons
                name="checkmark"
                size={14}
                color={theme.colors.textMuted}
              />
            </View>
          </View>

          {/* Set rows */}
          {exercise.sets.map((set, setIndex) => {
            const setKey = `${exerciseIndex}-${setIndex}`;
            return (
              <WorkoutSetRow
                key={setKey}
                setNumber={set.set_number}
                weight={set.weight}
                reps={set.reps}
                isDone={set.is_done}
                isRevealed={revealedSetKey === setKey}
                onWeightChange={(value) =>
                  onWeightChange(exerciseIndex, setIndex, value)
                }
                onRepsChange={(value) =>
                  onRepsChange(exerciseIndex, setIndex, value)
                }
                onToggleDone={() => onToggleDone(exerciseIndex, setIndex)}
                onDelete={() => onDeleteSet(exerciseIndex, setIndex)}
                onReveal={() => onSetReveal(setKey)}
                onClose={() => onSetClose(setKey)}
              />
            );
          })}

          {/* Rest timer bar */}
          <RestTimerBar
            remainingSeconds={timerRemaining}
            totalSeconds={timerTotal}
            isActive={isTimerActive}
            restSeconds={restSeconds}
            onAdjust={onAdjustTimer}
            onRestTimeChange={onRestTimeChange}
            onTimerPause={onTimerPause}
            onTimerRestart={onTimerRestart}
          />

          {/* Add Set button */}
          <Pressable
            onPress={() => onAddSet(exerciseIndex)}
            style={styles.addSetButton}
          >
            <Text style={styles.addSetText}>+ Add Set</Text>
          </Pressable>

          {/* Remove Exercise button */}
          <Pressable
            onPress={handleRemoveExercise}
            style={styles.removeExerciseButton}
          >
            <Text style={styles.removeExerciseText}>Remove Exercise</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

function getStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    headerInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    exerciseName: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    categoryBadge: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
    },

    // Expanded body
    body: {
      marginTop: theme.spacing.sm,
    },

    // Table header
    tableHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    tableHeaderText: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    setNumberColumn: {
      width: 32,
      alignItems: "center",
    },
    flexColumn: {
      flex: 1,
    },
    checkboxColumn: {
      width: 44,
      alignItems: "center",
    },

    // Add Set button (matching ExerciseEditorCard style)
    addSetButton: {
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.sm,
    },
    addSetText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.accent,
    },

    // Remove Exercise button
    removeExerciseButton: {
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.xs,
    },
    removeExerciseText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.danger,
    },
  });
}
