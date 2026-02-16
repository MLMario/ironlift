/**
 * MyExercisesList Component
 *
 * Renders an alphabetical list of user-created exercises with:
 * - Inline edit accordion (LayoutAnimation) with name input, category dropdown, cancel/save
 * - Only one exercise expanded for editing at a time
 * - Delete with dependency check and ConfirmationModal warning
 * - Validation: empty name, invalid characters, duplicate name
 *
 * Uses ScrollView with .map() (not FlatList) since the list of user exercises
 * won't be huge and nesting FlatLists causes issues.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/theme';
import { exercises } from '@/services/exercises';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import type { Exercise, ExerciseCategory } from '@/types/database';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const CATEGORIES: ExerciseCategory[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
  'Other',
];

interface MyExercisesListProps {
  exercises: Exercise[];
  onExerciseUpdated: () => void;
}

export function MyExercisesList({
  exercises: exerciseList,
  onExerciseUpdated,
}: MyExercisesListProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Edit accordion state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ExerciseCategory>('Chest');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function handleEditPress(exercise: Exercise) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedId === exercise.id) {
      setExpandedId(null);
    } else {
      setExpandedId(exercise.id);
      setEditName(exercise.name);
      setEditCategory(exercise.category);
      setEditError(null);
      setShowCategoryDropdown(false);
    }
  }

  async function handleSave() {
    if (!expandedId) return;
    setEditError(null);
    setIsSaving(true);

    const result = await exercises.updateExercise({
      id: expandedId,
      name: editName,
      category: editCategory,
    });

    setIsSaving(false);

    if (result.validationError) {
      switch (result.validationError) {
        case 'EMPTY_NAME':
          setEditError('Name cannot be empty');
          break;
        case 'INVALID_NAME':
          setEditError('Name can only contain letters, numbers, and spaces');
          break;
        case 'DUPLICATE_NAME':
          setEditError('An exercise with this name already exists');
          break;
      }
      return;
    }

    if (result.error) {
      setEditError('Failed to update exercise');
      return;
    }

    setExpandedId(null);
    onExerciseUpdated();
  }

  async function handleDeletePress(exercise: Exercise) {
    const { data: deps } = await exercises.getExerciseDependencies(exercise.id);

    if (
      deps &&
      (deps.templateCount > 0 || deps.workoutLogCount > 0 || deps.chartCount > 0)
    ) {
      const parts: string[] = [];
      if (deps.templateCount > 0) {
        parts.push(
          `${deps.templateCount} template${deps.templateCount > 1 ? 's' : ''}`
        );
      }
      if (deps.workoutLogCount > 0) {
        parts.push(
          `${deps.workoutLogCount} workout log${deps.workoutLogCount > 1 ? 's' : ''}`
        );
      }
      if (deps.chartCount > 0) {
        parts.push(
          `${deps.chartCount} chart${deps.chartCount > 1 ? 's' : ''}`
        );
      }
      setDeleteMessage(
        `This exercise is used in ${parts.join(', ')}. Deleting it may affect these items.`
      );
    } else {
      setDeleteMessage('This action cannot be undone.');
    }

    setDeleteTarget(exercise);
    setShowDeleteModal(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await exercises.deleteExercise(deleteTarget.id);
    setShowDeleteModal(false);
    setDeleteTarget(null);
    onExerciseUpdated();
  }

  return (
    <>
      <ScrollView style={styles.list}>
        {exerciseList.map((exercise) => (
          <View key={exercise.id}>
            {/* Exercise row */}
            <View style={styles.row}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {exercise.name}
              </Text>
              <Text style={styles.exerciseCategory}>{exercise.category}</Text>
              <Pressable
                onPress={() => handleEditPress(exercise)}
                style={styles.iconButton}
                hitSlop={4}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={
                    expandedId === exercise.id
                      ? theme.colors.accent
                      : theme.colors.textSecondary
                  }
                />
              </Pressable>
              <Pressable
                onPress={() => handleDeletePress(exercise)}
                style={styles.iconButton}
                hitSlop={4}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={theme.colors.danger}
                />
              </Pressable>
            </View>

            {/* Expanded edit form */}
            {expandedId === exercise.id && (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Exercise name"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                {/* Category dropdown */}
                <Pressable
                  style={styles.categoryDropdownTrigger}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={styles.categoryDropdownText}>{editCategory}</Text>
                  <Ionicons
                    name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>

                {showCategoryDropdown && (
                  <View style={styles.categoryDropdownList}>
                    {CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        style={[
                          styles.categoryOption,
                          editCategory === cat && styles.categoryOptionSelected,
                        ]}
                        onPress={() => {
                          setEditCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            editCategory === cat &&
                              styles.categoryOptionTextSelected,
                          ]}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {editError && <Text style={styles.errorText}>{editError}</Text>}

                <View style={styles.buttonRow}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut
                      );
                      setExpandedId(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.textPrimary}
                      />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        title={`Delete "${deleteTarget?.name}"?`}
        message={deleteMessage}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    exerciseName: {
      flex: 1,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
    exerciseCategory: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.sm,
    },
    iconButton: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editForm: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.bgElevated,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    nameInput: {
      backgroundColor: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontSize: theme.typography.sizes.base,
    },
    categoryDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.bgPrimary,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.sm,
    },
    categoryDropdownText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textPrimary,
    },
    categoryDropdownList: {
      backgroundColor: theme.colors.bgPrimary,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.xs,
      overflow: 'hidden',
    },
    categoryOption: {
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.sm,
    },
    categoryOptionSelected: {
      backgroundColor: theme.colors.accent,
    },
    categoryOptionText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },
    categoryOptionTextSelected: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.weights.medium,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.sizes.sm,
      marginTop: theme.spacing.xs,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
      borderRadius: theme.radii.md,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
    },
    saveButton: {
      flex: 1,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
  });
}
