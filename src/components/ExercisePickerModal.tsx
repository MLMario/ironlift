/**
 * ExercisePickerModal Component
 *
 * Reusable exercise picker presented as a near-full iOS sheet (pageSheet).
 * Assembles all Phase 3 sub-components: search, category chips, exercise list,
 * and inline create form.
 *
 * Consumers: template editor (Phase 4), active workout (Phase 5), My Exercises (Phase 7).
 *
 * The modal manages its own data via useExercises hook and its own create flow
 * via exercises.createExercise. It does NOT receive exercises as a prop.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/theme';
import { useExercises } from '@/hooks/useExercises';
import { exercises as exercisesService } from '@/services/exercises';
import { CategoryChips, FORM_CATEGORIES } from '@/components/CategoryChips';
import { ExerciseListItem, ITEM_HEIGHT } from '@/components/ExerciseListItem';
import type { Exercise, ExerciseCategory } from '@/types/database';

interface ExercisePickerModalProps {
  visible: boolean;
  excludeIds?: string[];
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePickerModal({
  visible,
  excludeIds = [],
  onClose,
  onSelect,
}: ExercisePickerModalProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const { exercises: allExercises, isLoading, refresh } = useExercises();

  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>('Chest');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // --- State reset on open ---
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedCategory('All');
      setShowCreateForm(false);
      setNewExerciseName('');
      setNewExerciseCategory('Chest');
      setCreateError(null);
      setIsCreating(false);
      setShowCategoryDropdown(false);
    }
  }, [visible]);

  // --- Filtering logic ---
  const filteredExercises = useMemo(() => {
    let result = allExercises;

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter((ex) => ex.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((ex) => ex.name.toLowerCase().includes(query));
    }

    return result;
  }, [allExercises, selectedCategory, searchQuery]);

  // --- Exclude IDs set for O(1) lookup ---
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  // --- Create exercise handler ---
  const handleCreateExercise = useCallback(async () => {
    const trimmedName = newExerciseName.trim();

    if (!trimmedName) {
      setCreateError('Exercise name is required');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    const { data, error } = await exercisesService.createExercise(trimmedName, newExerciseCategory);

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        setCreateError('An exercise with this name already exists');
      } else {
        setCreateError('Failed to create exercise');
      }
      setIsCreating(false);
      return;
    }

    if (data) {
      // Refresh the cached list so the new exercise appears on next open
      await refresh();
      // Auto-select the newly created exercise
      onSelect(data);
    }

    setIsCreating(false);
  }, [newExerciseName, newExerciseCategory, onSelect, refresh]);

  // --- FlatList getItemLayout ---
  const getItemLayout = useCallback(
    (_data: ArrayLike<Exercise> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // --- Render exercise item ---
  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseListItem
        exercise={item}
        isDisabled={excludeSet.has(item.id)}
        onPress={onSelect}
      />
    ),
    [excludeSet, onSelect]
  );

  // --- Key extractor ---
  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  // --- Empty component ---
  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No exercises found</Text>
      </View>
    ),
    [styles.emptyContainer, styles.emptyText]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Exercise</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          {/* Category chips */}
          <View style={styles.chipsContainer}>
            <CategoryChips
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </View>

          {/* Exercise list */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              removeClippedSubviews={true}
              maxToRenderPerBatch={15}
              windowSize={11}
              initialNumToRender={15}
              ListEmptyComponent={ListEmptyComponent}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Create New Exercise button */}
          <View style={styles.bottomSection}>
            <Pressable
              style={({ pressed }) => [
                styles.createToggleButton,
                pressed && styles.createToggleButtonPressed,
              ]}
              onPress={() => {
                setShowCreateForm(!showCreateForm);
                setCreateError(null);
                setNewExerciseName('');
                setNewExerciseCategory('Chest');
                setShowCategoryDropdown(false);
              }}
            >
              <Text style={styles.createToggleText}>
                {showCreateForm ? 'Cancel New Exercise' : 'Create New Exercise'}
              </Text>
            </Pressable>

            {/* Inline create form */}
            {showCreateForm && (
              <View style={styles.createForm}>
                {/* Exercise name input */}
                <TextInput
                  style={styles.formInput}
                  placeholder="Exercise name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newExerciseName}
                  onChangeText={(text) => {
                    setNewExerciseName(text);
                    if (createError) setCreateError(null);
                  }}
                  autoCapitalize="words"
                  returnKeyType="done"
                />

                {/* Category dropdown */}
                <Pressable
                  style={styles.dropdownTrigger}
                  onPress={() => setShowCategoryDropdown(true)}
                >
                  <Text style={styles.dropdownText}>{newExerciseCategory}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>

                {/* Error message */}
                {createError && (
                  <Text style={styles.errorText}>{createError}</Text>
                )}

                {/* Create button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && styles.submitButtonPressed,
                    isCreating && styles.submitButtonDisabled,
                  ]}
                  onPress={handleCreateExercise}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color={theme.colors.textPrimary} />
                  ) : (
                    <Text style={styles.submitButtonText}>Create</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Category dropdown modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.dropdownMenu}>
            {FORM_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  newExerciseCategory === category && styles.dropdownItemSelected,
                  pressed && styles.dropdownItemPressed,
                ]}
                onPress={() => {
                  setNewExerciseCategory(category as ExerciseCategory);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    newExerciseCategory === category && styles.dropdownItemTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    container: {
      flex: 1,
    },
    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    headerTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    closeButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Search
    searchContainer: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      height: 44,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchIcon: {
      position: 'absolute',
      left: theme.spacing.md,
      zIndex: 1,
    },
    searchInput: {
      flex: 1,
      height: 44,
      paddingLeft: theme.spacing.md + 18 + theme.spacing.sm, // icon offset + icon size + gap
      paddingRight: theme.spacing.md,
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textPrimary,
    },
    // Chips
    chipsContainer: {
      marginBottom: theme.spacing.sm,
    },
    // List
    list: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: theme.spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textMuted,
    },
    // Bottom section
    bottomSection: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    createToggleButton: {
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    createToggleButtonPressed: {
      backgroundColor: 'rgba(79, 158, 255, 0.1)',
    },
    createToggleText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.accent,
    },
    // Create form
    createForm: {
      backgroundColor: theme.colors.bgSurface,
      padding: theme.spacing.md,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    formInput: {
      height: 44,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textPrimary,
    },
    // Dropdown trigger
    dropdownTrigger: {
      height: 44,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdownText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textPrimary,
    },
    // Error
    errorText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.danger,
    },
    // Submit button
    submitButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
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
    // Dropdown overlay
    dropdownOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    dropdownMenu: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.sm,
      width: 240,
      ...theme.shadows.md,
    },
    dropdownItem: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 4,
    },
    dropdownItemSelected: {
      backgroundColor: theme.colors.bgElevated,
    },
    dropdownItemPressed: {
      backgroundColor: theme.colors.bgElevated,
    },
    dropdownItemText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
    },
    dropdownItemTextSelected: {
      color: theme.colors.accent,
      fontWeight: theme.typography.weights.medium,
    },
  });
}
