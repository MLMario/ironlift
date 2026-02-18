/**
 * Active Workout Screen
 *
 * Full workout screen that replaces the Phase 1 placeholder.
 * Wires all hooks (useWorkoutState, useRestTimer, useWorkoutBackup) to all
 * components (WorkoutExerciseCard, ConfirmationModal, ExercisePickerModal).
 *
 * Route params:
 * - templateId: string -- template to load from cache
 * - restore: "true" -- resume from crash recovery backup
 *
 * Features:
 * - Exercise list with weight/reps inputs and done checkboxes
 * - Rest timer triggered on set completion
 * - Add/remove sets and exercises mid-workout
 * - Finish flow with template change detection and save
 * - Cancel flow with confirmation and discard
 * - Offline save via write queue
 * - Backup save on meaningful actions (not keystrokes)
 * - Swipe-back gesture disabled (via _layout.tsx gestureEnabled: false)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme, type Theme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { useWorkoutState } from '@/hooks/useWorkoutState';
import type { RestoredWorkoutData } from '@/hooks/useWorkoutState';
import { useRestTimer } from '@/hooks/useRestTimer';
import { useWorkoutBackup } from '@/hooks/useWorkoutBackup';
import { logging } from '@/services/logging';
import { templates as templatesService, updateTemplateExerciseSetValues } from '@/services/templates';
import { enqueue } from '@/services/writeQueue';
import { getCachedTemplates, setCachedTemplates } from '@/lib/cache';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import type { TemplateWithExercises, Exercise } from '@/types/database';
import type { WorkoutLogInput, TemplateExerciseInput } from '@/types/services';

export default function WorkoutScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ templateId?: string; restore?: string }>();

  // ============================================================================
  // Template / Restore loading
  // ============================================================================

  const [template, setTemplate] = useState<TemplateWithExercises | undefined>(undefined);
  const [restoredBackup, setRestoredBackup] = useState<RestoredWorkoutData | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const backup = useWorkoutBackup(user?.id);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Restore path: load backup from AsyncStorage
        if (params.restore === 'true') {
          const backupData = await backup.restore();
          if (backupData && !cancelled) {
            setRestoredBackup({
              activeWorkout: backupData.activeWorkout,
              originalTemplateSnapshot: backupData.originalTemplateSnapshot,
            });
            setIsInitializing(false);
            return;
          }
          // Backup not found -- fall through to template path or error
        }

        // Template path: load template from cache
        if (params.templateId) {
          const cached = await getCachedTemplates();
          const found = cached?.find((t) => t.id === params.templateId);
          if (found && !cancelled) {
            setTemplate(found);
            setIsInitializing(false);
            return;
          }
          // Not in cache -- show error
          if (!cancelled) {
            setInitError('Template not found. Please go back and try again.');
            setIsInitializing(false);
          }
          return;
        }

        // Neither restore nor templateId -- error
        if (!cancelled) {
          setInitError('No template selected. Please go back and try again.');
          setIsInitializing(false);
        }
      } catch {
        if (!cancelled) {
          setInitError('Failed to load workout data.');
          setIsInitializing(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // Only run on mount -- params and backup are initial values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // Hooks
  // ============================================================================

  const {
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
    setRevealedSet,
    closeAllSwipes,
    hasTemplateChanges,
    updateRestSeconds,
    getRestTimeChanges,
    getWeightRepsChanges,
  } = useWorkoutState(template, restoredBackup);

  const {
    timer,
    start: startTimer,
    stop: stopTimer,
    pause: pauseTimer,
    adjust: adjustTimer,
    isActiveForExercise,
  } = useRestTimer();

  // ============================================================================
  // Backup save trigger
  // ============================================================================

  // Counter incremented on meaningful actions. useEffect watches it to save backup.
  const [backupTrigger, setBackupTrigger] = useState(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial render (no meaningful action has occurred yet)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (backupTrigger > 0) {
      backup.save(activeWorkout, originalTemplateSnapshot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupTrigger]);

  const triggerBackup = useCallback(() => {
    setBackupTrigger((prev) => prev + 1);
  }, []);

  // ============================================================================
  // Set done handler (connects state + timer + backup)
  // ============================================================================

  // Ref to exercises for stable handleToggleDone (avoids [activeWorkout.exercises] dep)
  const exercisesRef = useRef(activeWorkout.exercises);
  exercisesRef.current = activeWorkout.exercises;

  const handleToggleDone = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      const result = toggleSetDone(exerciseIndex, setIndex);
      if (!result.wasDone) {
        // Was not done, now is done -> start rest timer
        const exercise = exercisesRef.current[exerciseIndex];
        startTimer(exerciseIndex, exercise.rest_seconds);
      }
      triggerBackup();
    },
    [toggleSetDone, startTimer, triggerBackup]
  );

  // ============================================================================
  // Add/Delete set handlers (with backup trigger)
  // ============================================================================

  const handleAddSet = useCallback(
    (exerciseIndex: number) => {
      addSet(exerciseIndex);
      triggerBackup();
    },
    [addSet, triggerBackup]
  );

  const handleDeleteSet = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      deleteSet(exerciseIndex, setIndex);
      triggerBackup();
    },
    [deleteSet, triggerBackup]
  );

  // ============================================================================
  // Remove exercise handler (connects state + timer + backup)
  // ============================================================================

  const handleRemoveExercise = useCallback(
    (exerciseIndex: number) => {
      // Stop timer if removing exercise that has active timer
      if (isActiveForExercise(exerciseIndex)) {
        stopTimer();
      }
      removeExercise(exerciseIndex);
      triggerBackup();
    },
    [isActiveForExercise, stopTimer, removeExercise, triggerBackup]
  );

  // ============================================================================
  // Exercise picker
  // ============================================================================

  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const handleSelectExercise = useCallback(
    (exercise: Exercise) => {
      addExercise(exercise);
      setShowExercisePicker(false);
      triggerBackup();
    },
    [addExercise, triggerBackup]
  );

  // ============================================================================
  // Timer adjust handler
  // ============================================================================

  const handleAdjustTimer = useCallback(
    (delta: number) => {
      adjustTimer(delta);
    },
    [adjustTimer]
  );

  // ============================================================================
  // Rest time editing handlers
  // ============================================================================

  const handleRestTimeChange = useCallback(
    (exerciseIndex: number, seconds: number) => {
      updateRestSeconds(exerciseIndex, seconds);
      triggerBackup();
    },
    [updateRestSeconds, triggerBackup]
  );

  const handleTimerPause = useCallback(() => {
    pauseTimer();
  }, [pauseTimer]);

  const handleTimerRestart = useCallback(
    (exerciseIndex: number, seconds: number) => {
      startTimer(exerciseIndex, seconds);
    },
    [startTimer]
  );

  // ============================================================================
  // Modal state
  // ============================================================================

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTemplateUpdateModal, setShowTemplateUpdateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // Finish flow
  // ============================================================================

  /**
   * Silent rest time save -- persists per-exercise rest time changes to template.
   * Called on finish when NOT doing a structural update (structural update already
   * includes rest times via activeWorkout.exercises[].rest_seconds).
   * Best-effort: skip silently on failure per locked decision.
   */
  async function saveRestTimeChanges(): Promise<void> {
    const changes = getRestTimeChanges();
    if (changes.length === 0) return;
    if (!activeWorkout.template_id) return;

    for (const change of changes) {
      try {
        await templatesService.updateTemplateExercise(
          activeWorkout.template_id,
          change.exercise_id,
          { default_rest_seconds: change.rest_seconds }
        );
      } catch {
        // Best-effort per locked decision -- skip silently on failure
      }
    }
  }

  /**
   * Silent weight/reps save -- persists per-set weight/reps changes to template.
   * Called on finish when NOT doing a structural update (structural update already
   * includes weight/reps via the full template replace).
   * Best-effort: skip silently on failure per locked decision.
   * After successful saves, refreshes the template cache so next workout uses updated values.
   */
  async function saveWeightRepsChanges(): Promise<void> {
    const changes = getWeightRepsChanges();
    if (changes.length === 0) return;
    if (!activeWorkout.template_id) return;

    let anySaved = false;

    for (const change of changes) {
      try {
        await updateTemplateExerciseSetValues(
          activeWorkout.template_id,
          change.exercise_id,
          change.sets
        );
        anySaved = true;
      } catch {
        // Best-effort per locked decision -- skip silently on failure
      }
    }

    // Refresh template cache after successful saves so next workout uses updated values
    if (anySaved) {
      try {
        const { data: freshTemplates } = await templatesService.getTemplates();
        if (freshTemplates) {
          await setCachedTemplates(freshTemplates);
        }
      } catch {
        // Cache refresh failure is non-critical -- template DB is already updated
      }
    }
  }

  /**
   * Save workout log and clean up.
   * If updateTemplate is true, also update the template with current exercises.
   */
  const saveWorkoutAndCleanup = useCallback(
    async (shouldUpdateTemplate: boolean) => {
      setIsSaving(true);

      const workoutData: WorkoutLogInput = {
        template_id: activeWorkout.template_id,
        started_at: activeWorkout.started_at || new Date().toISOString(),
        exercises: activeWorkout.exercises.map((ex, i) => ({
          exercise_id: ex.exercise_id,
          rest_seconds: ex.rest_seconds,
          order: i,
          sets: ex.sets.map((s) => ({
            set_number: s.set_number,
            weight: s.weight || 0,
            reps: s.reps || 0,
            is_done: s.is_done,
          })),
        })),
      };

      try {
        // Silent rest time save (independent from structural changes)
        // Only needed when NOT doing a structural update (which already includes rest times)
        if (!shouldUpdateTemplate) {
          await saveRestTimeChanges();
          await saveWeightRepsChanges();
        }

        // Update template if requested (best-effort, skip on failure)
        if (shouldUpdateTemplate && activeWorkout.template_id) {
          try {
            const templateExercises: TemplateExerciseInput[] = activeWorkout.exercises.map(
              (ex) => ({
                exercise_id: ex.exercise_id,
                default_rest_seconds: ex.rest_seconds,
                sets: ex.sets.map((s) => ({
                  set_number: s.set_number,
                  weight: s.weight || 0,
                  reps: s.reps || 0,
                })),
              })
            );
            await templatesService.updateTemplate(
              activeWorkout.template_id,
              activeWorkout.template_name,
              templateExercises
            );
          } catch {
            // Template update failed (offline?) -- skip silently
            // Workout save is the priority
          }
        }

        // Try online save first
        const { error } = await logging.createWorkoutLog(workoutData);

        if (error) {
          // Online save failed -- enqueue for offline sync
          await enqueue({
            id: crypto.randomUUID(),
            type: 'workout_log',
            payload: workoutData,
            created_at: new Date().toISOString(),
          });
        }

        // Always: stop timer, clear backup, navigate to dashboard
        stopTimer();
        await backup.clear();
        router.back();
      } catch {
        // Even on unexpected error, enqueue and navigate
        try {
          await enqueue({
            id: crypto.randomUUID(),
            type: 'workout_log',
            payload: workoutData,
            created_at: new Date().toISOString(),
          });
        } catch {
          // Last resort: just navigate away
        }
        stopTimer();
        await backup.clear();
        router.back();
      } finally {
        setIsSaving(false);
      }
    },
    [activeWorkout, stopTimer, backup, router, getRestTimeChanges, getWeightRepsChanges]
  );

  const handleFinishPress = useCallback(() => {
    Keyboard.dismiss();
    if (activeWorkout.exercises.length === 0) {
      Alert.alert('No Exercises', 'Add at least one exercise before finishing.');
      return;
    }
    setShowFinishModal(true);
  }, [activeWorkout.exercises.length]);

  const handleFinishConfirm = useCallback(() => {
    setShowFinishModal(false);
    // Check for template structural changes
    if (hasTemplateChanges() && activeWorkout.template_id) {
      setShowTemplateUpdateModal(true);
    } else {
      saveWorkoutAndCleanup(false);
    }
  }, [hasTemplateChanges, activeWorkout.template_id, saveWorkoutAndCleanup]);

  const handleTemplateUpdateConfirm = useCallback(() => {
    setShowTemplateUpdateModal(false);
    saveWorkoutAndCleanup(true);
  }, [saveWorkoutAndCleanup]);

  const handleTemplateUpdateCancel = useCallback(() => {
    setShowTemplateUpdateModal(false);
    saveWorkoutAndCleanup(false);
  }, [saveWorkoutAndCleanup]);

  // ============================================================================
  // Cancel flow
  // ============================================================================

  const handleCancelPress = useCallback(() => {
    Keyboard.dismiss();
    setShowCancelModal(true);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    setShowCancelModal(false);
    stopTimer();
    await backup.clear();
    router.back();
  }, [stopTimer, backup, router]);

  // ============================================================================
  // Swipe coordination handlers
  // ============================================================================

  const handleSetReveal = useCallback(
    (key: string) => {
      setRevealedSet(key);
    },
    [setRevealedSet]
  );

  const handleSetClose = useCallback(
    (key: string) => {
      // Only close if this is the currently revealed key
      setRevealedSet(null);
    },
    [setRevealedSet]
  );

  // ============================================================================
  // Loading / Error states
  // ============================================================================

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (initError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{initError}</Text>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // Timer props for exercise cards
  // ============================================================================

  function getTimerProps(exerciseIndex: number) {
    const exercise = activeWorkout.exercises[exerciseIndex];
    const restSeconds = exercise.rest_seconds;
    const isActive = isActiveForExercise(exerciseIndex);

    if (isActive && timer.status === 'active') {
      return {
        timerRemaining: timer.remaining,
        timerTotal: timer.duration,
        isTimerActive: true,
        restSeconds,
      };
    }

    // When inactive (not started, or timer completed/idle):
    // Show the full configured rest time so the bar appears full
    return {
      timerRemaining: restSeconds,
      timerTotal: restSeconds,
      isTimerActive: false,
      restSeconds,
    };
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleCancelPress} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeWorkout.template_name || 'Workout'}
        </Text>

        <Pressable
          onPress={handleFinishPress}
          hitSlop={8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Text style={styles.finishText}>Finish</Text>
          )}
        </Pressable>
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {activeWorkout.exercises.map((exercise, exerciseIndex) => {
            const timerProps = getTimerProps(exerciseIndex);
            return (
              <WorkoutExerciseCard
                key={`${exercise.exercise_id}-${exerciseIndex}`}
                exercise={exercise}
                exerciseIndex={exerciseIndex}
                onWeightChange={updateSetWeight}
                onRepsChange={updateSetReps}
                onToggleDone={handleToggleDone}
                onAddSet={handleAddSet}
                onDeleteSet={handleDeleteSet}
                onRemoveExercise={handleRemoveExercise}
                timerRemaining={timerProps.timerRemaining}
                timerTotal={timerProps.timerTotal}
                isTimerActive={timerProps.isTimerActive}
                restSeconds={timerProps.restSeconds}
                onAdjustTimer={handleAdjustTimer}
                onRestTimeChange={handleRestTimeChange}
                onTimerPause={handleTimerPause}
                onTimerRestart={handleTimerRestart}
                revealedSetKey={revealedSetKey}
                onSetReveal={handleSetReveal}
                onSetClose={handleSetClose}
              />
            );
          })}

          {/* Add Exercise button */}
          <Pressable
            style={({ pressed }) => [
              styles.addExerciseButton,
              pressed && styles.addExerciseButtonPressed,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setShowExercisePicker(true);
            }}
          >
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        visible={showExercisePicker}
        excludeIds={activeWorkout.exercises.map((ex) => ex.exercise_id)}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handleSelectExercise}
      />

      {/* Finish Confirmation Modal */}
      <ConfirmationModal
        visible={showFinishModal}
        title="Finish Workout?"
        message="Save this workout and end your session?"
        confirmLabel="Save"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleFinishConfirm}
        onCancel={() => setShowFinishModal(false)}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Workout?"
        message="All progress will be lost."
        confirmLabel="Discard"
        cancelLabel="Go Back"
        confirmVariant="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Template Update Modal */}
      <ConfirmationModal
        visible={showTemplateUpdateModal}
        title="Update Template?"
        message="You made changes during this workout. Update the template with these changes?"
        secondaryMessage="This will update the exercise list and number of sets in your template."
        confirmLabel="Yes, Update"
        cancelLabel="No, Keep Original"
        confirmVariant="primary"
        dismissOnOverlayPress={false}
        onConfirm={handleTemplateUpdateConfirm}
        onCancel={handleTemplateUpdateCancel}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    flex1: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bgPrimary,
    },
    cancelText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
    },
    headerTitle: {
      flex: 1,
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginHorizontal: theme.spacing.sm,
    },
    finishText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.accent,
    },

    // Scroll content
    scrollContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },

    // Add exercise button
    addExerciseButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
    },
    addExerciseButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    addExerciseText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },

    // Error state
    errorText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    backButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.lg,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    backButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
  });
}
