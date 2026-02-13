/**
 * Template Editor Screen
 *
 * Full-screen modal for creating and editing workout templates.
 * Assembles ExerciseEditorCard (set table + rest timer) and ExercisePickerModal
 * into a scrollable form with validation and unsaved changes protection.
 *
 * Route params:
 * - templateId (optional): If present, loads template for editing. Otherwise creates new.
 *
 * Presentation: modal (configured in _layout.tsx)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme, type Theme } from '@/theme';
import { templates } from '@/services/templates';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import {
  ExerciseEditorCard,
  type EditingExercise,
  type EditingSet,
} from '@/components/ExerciseEditorCard';
import type { Exercise, TemplateWithExercises } from '@/types/database';
import type { TemplateExerciseInput } from '@/types/services';

// ============================================================================
// Editing State Type
// ============================================================================

interface EditingTemplate {
  id: string | null; // null = create mode
  name: string;
  exercises: EditingExercise[];
}

// ============================================================================
// Helper: Convert loaded template to editing format
// ============================================================================

function templateToEditing(template: TemplateWithExercises): EditingTemplate {
  return {
    id: template.id,
    name: template.name,
    exercises: template.exercises.map((ex) => ({
      exercise_id: ex.exercise_id,
      name: ex.name,
      category: ex.category,
      default_rest_seconds: ex.default_rest_seconds,
      sets: ex.sets.map((set) => ({ ...set })),
    })),
  };
}

// ============================================================================
// Screen Component
// ============================================================================

export default function TemplateEditorScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const isEditing = !!templateId;

  // --- State ---
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate>({
    id: null,
    name: '',
    exercises: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialTemplate, setInitialTemplate] = useState<EditingTemplate | null>(null);

  // --- Edit mode: load existing template ---
  useEffect(() => {
    if (!templateId) return;

    let cancelled = false;

    async function loadTemplate() {
      setIsLoading(true);
      const { data, error: loadError } = await templates.getTemplate(templateId!);

      if (cancelled) return;

      if (loadError || !data) {
        setError('Failed to load template');
        setIsLoading(false);
        return;
      }

      const editing = templateToEditing(data);
      setEditingTemplate(editing);
      setInitialTemplate(editing);
      setIsLoading(false);
    }

    loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  // --- Helpers to update template with change tracking ---
  const updateTemplate = useCallback(
    (updater: (prev: EditingTemplate) => EditingTemplate) => {
      setEditingTemplate((prev) => {
        const next = updater(prev);
        setHasChanges(true);
        return next;
      });
    },
    []
  );

  // --- Exercise picker integration ---
  const handleExerciseSelect = useCallback(
    (exercise: Exercise) => {
      const defaultSets: EditingSet[] = [
        { set_number: 1, weight: 0, reps: 10 },
        { set_number: 2, weight: 0, reps: 10 },
        { set_number: 3, weight: 0, reps: 10 },
      ];

      const newEditingExercise: EditingExercise = {
        exercise_id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        default_rest_seconds: 90,
        sets: defaultSets,
      };

      updateTemplate((prev) => ({
        ...prev,
        exercises: [...prev.exercises, newEditingExercise],
      }));

      setPickerVisible(false);
    },
    [updateTemplate]
  );

  // --- Exercise management callbacks ---
  const handleExerciseUpdate = useCallback(
    (index: number, updated: EditingExercise) => {
      updateTemplate((prev) => {
        const exercises = [...prev.exercises];
        exercises[index] = updated;
        return { ...prev, exercises };
      });
    },
    [updateTemplate]
  );

  const handleExerciseRemove = useCallback(
    (index: number) => {
      updateTemplate((prev) => ({
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== index),
      }));
    },
    [updateTemplate]
  );

  const handleExerciseMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      updateTemplate((prev) => {
        const exercises = [...prev.exercises];
        [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]];
        return { ...prev, exercises };
      });
    },
    [updateTemplate]
  );

  const handleExerciseMoveDown = useCallback(
    (index: number) => {
      updateTemplate((prev) => {
        if (index >= prev.exercises.length - 1) return prev;
        const exercises = [...prev.exercises];
        [exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]];
        return { ...prev, exercises };
      });
    },
    [updateTemplate]
  );

  // --- Name change handler ---
  const handleNameChange = useCallback(
    (text: string) => {
      updateTemplate((prev) => ({ ...prev, name: text }));
      if (error) setError(null);
    },
    [updateTemplate, error]
  );

  // --- Validation ---
  const validate = useCallback((): boolean => {
    const trimmedName = editingTemplate.name.trim();
    if (!trimmedName) {
      setError('Template name is required');
      return false;
    }
    if (editingTemplate.exercises.length === 0) {
      setError('Add at least one exercise');
      return false;
    }
    setError(null);
    return true;
  }, [editingTemplate]);

  // --- Save flow ---
  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsSaving(true);
    setError(null);

    const exerciseInputs: TemplateExerciseInput[] = editingTemplate.exercises.map((ex) => ({
      exercise_id: ex.exercise_id,
      default_rest_seconds: ex.default_rest_seconds,
      sets: ex.sets.map((set) => ({
        set_number: set.set_number,
        weight: set.weight,
        reps: set.reps,
      })),
    }));

    try {
      if (editingTemplate.id) {
        // Update existing template
        const { error: saveError } = await templates.updateTemplate(
          editingTemplate.id,
          editingTemplate.name.trim(),
          exerciseInputs
        );
        if (saveError) {
          setError('Failed to save template');
          setIsSaving(false);
          return;
        }
      } else {
        // Create new template
        const { error: saveError } = await templates.createTemplate(
          editingTemplate.name.trim(),
          exerciseInputs
        );
        if (saveError) {
          setError('Failed to create template');
          setIsSaving(false);
          return;
        }
      }

      router.back();
    } catch {
      setError('An unexpected error occurred');
      setIsSaving(false);
    }
  }, [editingTemplate, validate, router]);

  // --- Cancel flow ---
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes that will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }, [hasChanges, router]);

  // --- Exclude IDs for exercise picker (prevent duplicates) ---
  const excludeIds = editingTemplate.exercises.map((ex) => ex.exercise_id);

  // --- Loading state ---
  if (isEditing && isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header row */}
        <View style={styles.header}>
          <Pressable
            onPress={handleCancel}
            style={styles.headerButton}
            hitSlop={8}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Template' : 'New Template'}
          </Text>

          <Pressable
            onPress={handleSave}
            style={[styles.headerButton, isSaving && styles.headerButtonDisabled]}
            disabled={isSaving}
            hitSlop={8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Scrollable form */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Template name input */}
          <TextInput
            style={styles.nameInput}
            placeholder="e.g., Upper Body Day"
            placeholderTextColor={theme.colors.textMuted}
            value={editingTemplate.name}
            onChangeText={handleNameChange}
            autoCapitalize="words"
            returnKeyType="done"
          />

          {/* Exercise list */}
          {editingTemplate.exercises.map((exercise, index) => (
            <ExerciseEditorCard
              key={`${exercise.exercise_id}-${index}`}
              exercise={exercise}
              index={index}
              totalExercises={editingTemplate.exercises.length}
              onUpdate={(updated) => handleExerciseUpdate(index, updated)}
              onRemove={() => handleExerciseRemove(index)}
              onMoveUp={() => handleExerciseMoveUp(index)}
              onMoveDown={() => handleExerciseMoveDown(index)}
            />
          ))}

          {/* Add Exercise button */}
          <Pressable
            style={({ pressed }) => [
              styles.addExerciseButton,
              pressed && styles.addExerciseButtonPressed,
            ]}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </Pressable>

          {/* Bottom spacer for keyboard avoidance */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        visible={pickerVisible}
        excludeIds={excludeIds}
        onClose={() => setPickerVisible(false)}
        onSelect={handleExerciseSelect}
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
    flex: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      minWidth: 60,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerButtonDisabled: {
      opacity: 0.5,
    },
    headerTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    cancelText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
    },
    saveText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.accent,
    },

    // Error banner
    errorBanner: {
      backgroundColor: 'rgba(248, 113, 113, 0.15)',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    errorText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.danger,
      textAlign: 'center',
    },

    // Scroll content
    scrollContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },

    // Name input
    nameInput: {
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      height: 48,
      fontSize: theme.typography.sizes.lg,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },

    // Add Exercise button
    addExerciseButton: {
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    addExerciseButtonPressed: {
      backgroundColor: 'rgba(79, 158, 255, 0.1)',
    },
    addExerciseText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.accent,
    },

    // Bottom spacer
    bottomSpacer: {
      height: 100,
    },
  });
}
