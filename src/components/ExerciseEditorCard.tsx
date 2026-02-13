/**
 * ExerciseEditorCard Component
 *
 * A card for configuring one exercise within the template editor.
 * Composes SetRow (set table) and RestTimerInline (rest timer) with
 * a header showing exercise name, category, reorder arrows, and remove button.
 *
 * Exports EditingSet and EditingExercise types for reuse by the template editor screen.
 *
 * Features:
 * - Set table with add/remove (minimum 1 set enforced)
 * - "Add Set" copies last set's weight/reps values
 * - Up/down reorder arrows (disabled at boundaries)
 * - Remove exercise button (danger color)
 * - Inline rest timer configuration
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { SetRow } from '@/components/SetRow';
import { RestTimerInline } from '@/components/RestTimerInline';

// ============================================================================
// Editing Types (exported for template editor screen)
// ============================================================================

/**
 * A set being edited in the template editor.
 * Lightweight subset of TemplateExerciseSet -- no IDs needed during editing.
 */
export interface EditingSet {
  set_number: number;
  weight: number;
  reps: number;
}

/**
 * An exercise being edited in the template editor.
 * Contains the exercise identity, rest timer config, and editable sets.
 */
export interface EditingExercise {
  exercise_id: string;
  name: string;
  category: string;
  default_rest_seconds: number;
  sets: EditingSet[];
}

// ============================================================================
// Component
// ============================================================================

interface ExerciseEditorCardProps {
  exercise: EditingExercise;
  index: number;
  totalExercises: number;
  onUpdate: (updated: EditingExercise) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function ExerciseEditorCard({
  exercise,
  index,
  totalExercises,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ExerciseEditorCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const isFirst = index === 0;
  const isLast = index === totalExercises - 1;

  // --- Set handlers ---

  const handleWeightChange = (setIndex: number, value: number) => {
    const updatedSets = [...exercise.sets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], weight: value };
    onUpdate({ ...exercise, sets: updatedSets });
  };

  const handleRepsChange = (setIndex: number, value: number) => {
    const updatedSets = [...exercise.sets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], reps: value };
    onUpdate({ ...exercise, sets: updatedSets });
  };

  const handleDeleteSet = (setIndex: number) => {
    const updatedSets = exercise.sets
      .filter((_, i) => i !== setIndex)
      .map((set, i) => ({ ...set, set_number: i + 1 }));
    onUpdate({ ...exercise, sets: updatedSets });
  };

  const handleAddSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: EditingSet = {
      set_number: exercise.sets.length + 1,
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 10,
    };
    onUpdate({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const handleRestChange = (value: number) => {
    onUpdate({ ...exercise, default_rest_seconds: value });
  };

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={styles.categoryBadge}>{exercise.category}</Text>
        </View>

        <View style={styles.headerControls}>
          <Pressable
            onPress={onMoveUp}
            disabled={isFirst}
            style={[styles.controlButton, isFirst && styles.controlButtonDisabled]}
            hitSlop={4}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={onMoveDown}
            disabled={isLast}
            style={[styles.controlButton, isLast && styles.controlButtonDisabled]}
            hitSlop={4}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={onRemove}
            style={styles.controlButton}
            hitSlop={4}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.danger}
            />
          </Pressable>
        </View>
      </View>

      {/* Set table header */}
      <View style={styles.tableHeader}>
        <View style={styles.setNumberColumn}>
          <Text style={styles.tableHeaderText}>Set</Text>
        </View>
        <Text style={[styles.tableHeaderText, styles.flexColumn]}>Weight</Text>
        <Text style={[styles.tableHeaderText, styles.flexColumn]}>Reps</Text>
        <View style={styles.deleteColumn} />
      </View>

      {/* Set rows */}
      {exercise.sets.map((set, setIndex) => (
        <SetRow
          key={set.set_number}
          setNumber={set.set_number}
          weight={set.weight}
          reps={set.reps}
          onWeightChange={(value) => handleWeightChange(setIndex, value)}
          onRepsChange={(value) => handleRepsChange(setIndex, value)}
          onDelete={() => handleDeleteSet(setIndex)}
          canDelete={exercise.sets.length > 1}
        />
      ))}

      {/* Add Set button */}
      <Pressable onPress={handleAddSet} style={styles.addSetButton}>
        <Text style={styles.addSetText}>+ Add Set</Text>
      </Pressable>

      {/* Rest timer */}
      <RestTimerInline
        seconds={exercise.default_rest_seconds}
        onSecondsChange={handleRestChange}
      />
    </View>
  );
}

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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    headerInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginRight: theme.spacing.sm,
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
    headerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    controlButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlButtonDisabled: {
      opacity: 0.3,
    },

    // Set table header
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    tableHeaderText: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    setNumberColumn: {
      width: 32,
      alignItems: 'center',
    },
    flexColumn: {
      flex: 1,
    },
    deleteColumn: {
      width: 44,
    },

    // Add Set button
    addSetButton: {
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
    },
    addSetText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.accent,
    },
  });
}
