/**
 * useWorkoutState Hook
 *
 * Manages all active workout state and mutations.
 * Port of the web app's WorkoutSurface state management into a standalone hook.
 *
 * All mutations use functional setState for immutability.
 * Does NOT handle AsyncStorage backup -- that is useWorkoutBackup's concern.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TemplateWithExercises, Exercise } from '@/types/database';

// ============================================================================
// Exported Interfaces
// ============================================================================

/**
 * Set within an active workout.
 * Includes is_done flag for tracking completion.
 */
export interface WorkoutSet {
  set_number: number;
  weight: number;
  reps: number;
  is_done: boolean;
}

/**
 * Exercise being tracked in the workout.
 */
export interface WorkoutExercise {
  exercise_id: string;
  name: string;
  category: string;
  order: number;
  rest_seconds: number;
  sets: WorkoutSet[];
}

/**
 * Active workout state.
 */
export interface ActiveWorkout {
  template_id: string | null;
  template_name: string;
  started_at: string | null;
  exercises: WorkoutExercise[];
}

/**
 * Original template snapshot for structural change detection.
 * Only tracks exercise presence and set counts -- not weight/reps values
 * per locked decision (structural changes only).
 */
export interface TemplateSnapshot {
  exercises: {
    exercise_id: string;
    sets: {
      set_number: number;
      weight: number;
      reps: number;
    }[];
  }[];
}

/**
 * Data shape for restored workout (used by useWorkoutBackup).
 * Defined here to avoid circular imports -- useWorkoutBackup imports
 * ActiveWorkout and TemplateSnapshot from this file.
 */
export interface RestoredWorkoutData {
  activeWorkout: ActiveWorkout;
  originalTemplateSnapshot: TemplateSnapshot | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing all active workout state and mutations.
 *
 * @param template - Template to initialize workout from
 * @param restoredWorkout - Restored workout data from crash recovery (takes precedence)
 * @returns Workout state and all mutation functions
 */
export function useWorkoutState(
  template?: TemplateWithExercises,
  restoredWorkout?: RestoredWorkoutData
) {
  // ==================== STATE ====================

  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout>({
    template_id: null,
    template_name: '',
    started_at: null,
    exercises: [],
  });

  const [originalTemplateSnapshot, setOriginalTemplateSnapshot] =
    useState<TemplateSnapshot | null>(null);

  // Swipe coordination -- only one set row revealed at a time
  const [revealedSetKey, setRevealedSetKey] = useState<string | null>(null);

  // ==================== INITIALIZATION ====================
  // Priority: restoredWorkout > template (matching web)
  // Deps include [template, restoredWorkout] because they arrive async from
  // AsyncStorage in app/workout.tsx. isInitialized ref prevents re-init once active.

  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;

    if (restoredWorkout) {
      setActiveWorkout(restoredWorkout.activeWorkout);
      setOriginalTemplateSnapshot(restoredWorkout.originalTemplateSnapshot);
      isInitialized.current = true;
      return;
    }

    if (template) {
      const initialWorkout: ActiveWorkout = {
        template_id: template.id,
        template_name: template.name,
        started_at: new Date().toISOString(),
        exercises: template.exercises.map((te, exIndex) => ({
          exercise_id: te.exercise_id,
          name: te.name,
          category: te.category,
          order: exIndex,
          rest_seconds: te.default_rest_seconds || 90,
          sets: te.sets.map((set) => ({
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            is_done: false,
          })),
        })),
      };

      setActiveWorkout(initialWorkout);

      // Store deep copy for change detection
      const snapshot: TemplateSnapshot = {
        exercises: template.exercises.map((te) => ({
          exercise_id: te.exercise_id,
          sets: te.sets.map((set) => ({
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
          })),
        })),
      };
      setOriginalTemplateSnapshot(snapshot);
      isInitialized.current = true;
    }
  }, [template, restoredWorkout]);

  // ==================== MUTATION FUNCTIONS ====================
  // All use functional setState for immutability

  /**
   * Update the weight value for a specific set.
   */
  const updateSetWeight = useCallback(
    (exerciseIndex: number, setIndex: number, weight: number): void => {
      setActiveWorkout((prev) => {
        const exercises = [...prev.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], weight };
        exercise.sets = sets;
        exercises[exerciseIndex] = exercise;
        return { ...prev, exercises };
      });
    },
    []
  );

  /**
   * Update the reps value for a specific set.
   */
  const updateSetReps = useCallback(
    (exerciseIndex: number, setIndex: number, reps: number): void => {
      setActiveWorkout((prev) => {
        const exercises = [...prev.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], reps };
        exercise.sets = sets;
        exercises[exerciseIndex] = exercise;
        return { ...prev, exercises };
      });
    },
    []
  );

  /**
   * Toggle the is_done state of a set.
   * Returns whether the set was previously done (for timer trigger logic).
   */
  const toggleSetDone = useCallback(
    (exerciseIndex: number, setIndex: number): { wasDone: boolean } => {
      let wasDone = false;

      setActiveWorkout((prev) => {
        const exercises = [...prev.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const sets = [...exercise.sets];
        wasDone = sets[setIndex].is_done;
        sets[setIndex] = { ...sets[setIndex], is_done: !sets[setIndex].is_done };
        exercise.sets = sets;
        exercises[exerciseIndex] = exercise;
        return { ...prev, exercises };
      });

      return { wasDone };
    },
    []
  );

  /**
   * Add a new set to an exercise.
   * Copies weight/reps from the last set (matching web behavior).
   */
  const addSet = useCallback((exerciseIndex: number): void => {
    setActiveWorkout((prev) => {
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIndex] };
      const lastSet = exercise.sets[exercise.sets.length - 1];
      exercise.sets = [
        ...exercise.sets,
        {
          set_number: exercise.sets.length + 1,
          weight: lastSet?.weight || 0,
          reps: lastSet?.reps || 10,
          is_done: false,
        },
      ];
      exercises[exerciseIndex] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  /**
   * Delete a set from an exercise.
   * Enforces minimum 1 set. Renumbers remaining sets. Closes revealed swipe row.
   */
  const deleteSet = useCallback(
    (exerciseIndex: number, setIndex: number): void => {
      // Close any revealed swipe row
      setRevealedSetKey(null);

      setActiveWorkout((prev) => {
        const exercises = [...prev.exercises];
        const exercise = { ...exercises[exerciseIndex] };

        // Enforce minimum 1 set
        if (exercise.sets.length <= 1) return prev;

        exercise.sets = exercise.sets
          .filter((_, i) => i !== setIndex)
          .map((set, i) => ({ ...set, set_number: i + 1 }));

        exercises[exerciseIndex] = exercise;
        return { ...prev, exercises };
      });
    },
    []
  );

  /**
   * Add an exercise to the workout with 3 default sets.
   * Returns false if the exercise already exists in the workout.
   */
  const addExercise = useCallback(
    (exercise: Exercise): boolean => {
      // Check for duplicates
      const exists = activeWorkout.exercises.some(
        (ex) => ex.exercise_id === exercise.id
      );
      if (exists) return false;

      setActiveWorkout((prev) => ({
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            exercise_id: exercise.id,
            name: exercise.name,
            category: exercise.category,
            order: prev.exercises.length,
            rest_seconds: 90,
            sets: [
              { set_number: 1, weight: 0, reps: 10, is_done: false },
              { set_number: 2, weight: 0, reps: 10, is_done: false },
              { set_number: 3, weight: 0, reps: 10, is_done: false },
            ],
          },
        ],
      }));

      return true;
    },
    [activeWorkout.exercises]
  );

  /**
   * Remove an exercise by index.
   * Returns the removed exercise for timer cleanup by the caller.
   */
  const removeExercise = useCallback(
    (index: number): WorkoutExercise | undefined => {
      const removed = activeWorkout.exercises[index];

      setActiveWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== index),
      }));

      return removed;
    },
    [activeWorkout.exercises]
  );

  /**
   * Set the currently revealed swipe row key.
   * Pass null to close all swipe rows.
   */
  const setRevealed = useCallback((key: string | null): void => {
    setRevealedSetKey(key);
  }, []);

  /**
   * Close all revealed swipe rows.
   */
  const closeAllSwipes = useCallback((): void => {
    setRevealedSetKey(null);
  }, []);

  /**
   * Detect structural changes between current workout and original template.
   * Only checks exercise count, set count per exercise, and exercise presence.
   * Does NOT compare weight/reps values (locked decision).
   */
  const hasTemplateChanges = useCallback((): boolean => {
    if (!originalTemplateSnapshot || !activeWorkout.template_id) {
      return false;
    }

    const original = originalTemplateSnapshot.exercises;
    const current = activeWorkout.exercises;

    // Check exercise count
    if (original.length !== current.length) return true;

    // Check each exercise for structural changes
    for (const currEx of current) {
      const origEx = original.find(
        (e) => e.exercise_id === currEx.exercise_id
      );
      if (!origEx) return true; // New exercise added
      if (origEx.sets.length !== currEx.sets.length) return true; // Set count changed
    }

    // Check if any original exercises were removed
    for (const origEx of original) {
      if (!current.find((e) => e.exercise_id === origEx.exercise_id)) {
        return true;
      }
    }

    return false;
  }, [originalTemplateSnapshot, activeWorkout.template_id, activeWorkout.exercises]);

  // ==================== RETURN ====================

  return {
    activeWorkout,
    originalTemplateSnapshot,
    revealedSetKey,
    updateSetWeight,
    updateSetReps,
    toggleSetDone,
    addSet,
    deleteSet,
    addExercise,
    removeExercise,
    setRevealedSet: setRevealed,
    closeAllSwipes,
    hasTemplateChanges,
  };
}
