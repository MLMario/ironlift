/**
 * AddChartSheet Component
 *
 * Half-height bottom sheet for creating a new chart.
 * Uses RN Modal with slide animation (NOT @gorhom/bottom-sheet).
 *
 * Multi-step flow:
 * 1. Form view: exercise selector, metric radio, axis radio, Add Chart button
 * 2. Exercise select view: grouped list of exercises with logged workout data
 *
 * State resets on every open (same pattern as ExercisePickerModal per decision [03-03]).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { exercises } from '@/services/exercises';
import { charts } from '@/services/charts';
import type { Exercise } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

interface AddChartSheetProps {
  visible: boolean;
  onClose: () => void;
  onChartCreated: () => void;
}

type SheetStep = 'form' | 'selectExercise';
type MetricType = 'total_sets' | 'max_volume_set';
type XAxisMode = 'date' | 'session';

// ============================================================================
// Constants
// ============================================================================

const SHEET_HEIGHT = Dimensions.get('window').height * 0.5;

// ============================================================================
// RadioGroup Sub-Component
// ============================================================================

interface RadioOption<T extends string> {
  label: string;
  value: T;
}

interface RadioGroupProps<T extends string> {
  label: string;
  options: RadioOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  theme: Theme;
}

function RadioGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
  theme,
}: RadioGroupProps<T>) {
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text
        style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.xs,
        }}
      >
        {label}
      </Text>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              minHeight: 44,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected
                  ? theme.colors.accent
                  : theme.colors.textMuted,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isSelected && (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.colors.accent,
                  }}
                />
              )}
            </View>
            <Text
              style={{
                fontSize: theme.typography.sizes.base,
                color: theme.colors.textPrimary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================================
// Metric & Axis Options
// ============================================================================

const METRIC_OPTIONS: RadioOption<MetricType>[] = [
  { label: 'Total Sets', value: 'total_sets' },
  { label: 'Max Volume', value: 'max_volume_set' },
];

const AXIS_OPTIONS: RadioOption<XAxisMode>[] = [
  { label: 'By Date', value: 'date' },
  { label: 'By Session', value: 'session' },
];

// ============================================================================
// AddChartSheet Component
// ============================================================================

export function AddChartSheet({
  visible,
  onClose,
  onChartCreated,
}: AddChartSheetProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  // --- State ---
  const [step, setStep] = useState<SheetStep>('form');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [metricType, setMetricType] = useState<MetricType>('total_sets');
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('session');
  const [exercisesWithData, setExercisesWithData] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Load exercises with logged data ---
  const loadExercises = useCallback(async () => {
    setIsLoadingExercises(true);
    try {
      const { data } = await exercises.getExercisesWithLoggedData();
      setExercisesWithData(data ?? []);
    } catch {
      setExercisesWithData([]);
    }
    setIsLoadingExercises(false);
  }, []);

  // --- Reset state on every open ---
  useEffect(() => {
    if (visible) {
      setStep('form');
      setSelectedExercise(null);
      setMetricType('total_sets');
      setXAxisMode('session');
      setError(null);
      setIsSubmitting(false);
      loadExercises();
    }
  }, [visible, loadExercises]);

  // --- Submit handler ---
  const handleAddChart = useCallback(async () => {
    if (!selectedExercise) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: createError } = await charts.createChart({
        exercise_id: selectedExercise.id,
        metric_type: metricType,
        x_axis_mode: xAxisMode,
      });

      if (createError) {
        const msg =
          createError instanceof Error ? createError.message : String(createError);
        // Check for network-related errors
        if (
          msg.includes('network') ||
          msg.includes('Network') ||
          msg.includes('fetch') ||
          msg.includes('Failed to fetch') ||
          msg.includes('NETWORK_ERROR')
        ) {
          setError('Internet connection required to create charts.');
        } else {
          setError(msg || 'Failed to create chart.');
        }
        setIsSubmitting(false);
        return;
      }

      onChartCreated();
      onClose();
    } catch {
      setError('Internet connection required to create charts.');
    }

    setIsSubmitting(false);
  }, [selectedExercise, metricType, xAxisMode, onChartCreated, onClose]);

  // --- Exercise select handler ---
  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedExercise(exercise);
    setStep('form');
  }, []);

  // --- Group exercises by category ---
  const groupedExercises = exercisesWithData.reduce<
    Map<string, Exercise[]>
  >((groups, ex) => {
    const category = ex.category;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(ex);
    return groups;
  }, new Map());

  // --- Render ---
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.sheet, { paddingBottom: theme.spacing.lg + insets.bottom }]}
          onStartShouldSetResponder={() => true}
        >
          {step === 'form' ? (
            // ================================================================
            // Form View
            // ================================================================
            <View style={styles.formContainer}>
              {/* Title */}
              <Text style={styles.title}>Add Chart</Text>

              {/* Exercise Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Exercise</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.exerciseSelector,
                    pressed && styles.exerciseSelectorPressed,
                  ]}
                  onPress={() => setStep('selectExercise')}
                >
                  <Text
                    style={
                      selectedExercise
                        ? styles.exerciseSelectorText
                        : styles.exerciseSelectorPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {selectedExercise
                      ? selectedExercise.name
                      : 'Select Exercise'}
                  </Text>
                </Pressable>
              </View>

              {/* Metric Type Radio */}
              <RadioGroup
                label="Metric"
                options={METRIC_OPTIONS}
                selected={metricType}
                onSelect={setMetricType}
                theme={theme}
              />

              {/* X-Axis Mode Radio */}
              <RadioGroup
                label="X-Axis"
                options={AXIS_OPTIONS}
                selected={xAxisMode}
                onSelect={setXAxisMode}
                theme={theme}
              />

              {/* Error */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Button Row */}
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    pressed && styles.cancelButtonPressed,
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.submitButton,
                    pressed && !(!selectedExercise || isSubmitting) && styles.submitButtonPressed,
                    (!selectedExercise || isSubmitting) &&
                      styles.submitButtonDisabled,
                  ]}
                  onPress={handleAddChart}
                  disabled={!selectedExercise || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textPrimary}
                    />
                  ) : (
                    <Text style={styles.submitButtonText}>Add Chart</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            // ================================================================
            // Exercise Select View
            // ================================================================
            <View style={styles.selectContainer}>
              {/* Header */}
              <View style={styles.selectHeader}>
                <Pressable
                  onPress={() => setStep('form')}
                  hitSlop={8}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <Text style={styles.selectTitle}>Select Exercise</Text>
                <View style={styles.backButton} />
              </View>

              {/* Content */}
              {isLoadingExercises ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.accent}
                  />
                </View>
              ) : exercisesWithData.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No exercise data yet
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.exerciseList}
                  keyboardShouldPersistTaps="handled"
                >
                  {Array.from(groupedExercises.entries()).map(
                    ([category, categoryExercises]) => (
                      <View key={category} style={styles.categoryGroup}>
                        <Text style={styles.categoryHeader}>
                          {category.toUpperCase()}
                        </Text>
                        {categoryExercises.map((exercise) => (
                          <Pressable
                            key={exercise.id}
                            style={({ pressed }) => [
                              styles.exerciseRow,
                              pressed && styles.exerciseRowPressed,
                            ]}
                            onPress={() => handleSelectExercise(exercise)}
                          >
                            <Text style={styles.exerciseName}>
                              {exercise.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

function getStyles(theme: Theme) {
  return StyleSheet.create({
    // Overlay
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },

    // Sheet container
    sheet: {
      height: SHEET_HEIGHT,
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: theme.spacing.lg,
    },

    // Form view
    formContainer: {
      flex: 1,
      gap: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },

    // Field group
    fieldGroup: {
      gap: theme.spacing.xs,
    },
    fieldLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },

    // Exercise selector
    exerciseSelector: {
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    exerciseSelectorPressed: {
      opacity: 0.7,
    },
    exerciseSelectorText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textPrimary,
    },
    exerciseSelectorPlaceholder: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textMuted,
    },

    // Error
    errorText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.danger,
    },

    // Button row
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: 'auto' as const,
    },
    button: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.bgElevated,
    },
    cancelButtonPressed: {
      opacity: 0.7,
    },
    cancelButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    submitButton: {
      backgroundColor: theme.colors.accent,
    },
    submitButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },

    // Exercise select view
    selectContainer: {
      flex: 1,
    },
    selectHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    backButton: {
      minWidth: 50,
    },
    backButtonText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.accent,
    },
    selectTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },

    // Loading & empty
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textMuted,
    },

    // Exercise list
    exerciseList: {
      flex: 1,
    },
    categoryGroup: {
      marginBottom: theme.spacing.md,
    },
    categoryHeader: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xs,
      letterSpacing: 0.5,
    },
    exerciseRow: {
      minHeight: 44,
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radii.md,
    },
    exerciseRowPressed: {
      backgroundColor: theme.colors.bgElevated,
    },
    exerciseName: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textPrimary,
    },
  });
}
