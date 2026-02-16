/**
 * Workout Detail Screen
 *
 * Read-only view of a past workout showing exercise blocks with
 * color-coded category badges and set grids with status indicators.
 * Navigated from History screen; back button returns to History.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme, type Theme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { logging } from '@/services/logging';
import { formatDetailDate } from '@/lib/formatters';
import type { WorkoutLogWithExercises, WorkoutLogExerciseWithSets } from '@/types/database';

// Category badge color palette matching web app design tokens
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Chest:     { bg: 'rgba(239, 68, 68, 0.15)',  text: '#ef4444' },
  Back:      { bg: 'rgba(59, 130, 246, 0.15)',  text: '#3b82f6' },
  Shoulders: { bg: 'rgba(249, 115, 22, 0.15)',  text: '#f97316' },
  Legs:      { bg: 'rgba(34, 197, 94, 0.15)',   text: '#22c55e' },
  Arms:      { bg: 'rgba(168, 85, 247, 0.15)',  text: '#a855f7' },
  Core:      { bg: 'rgba(234, 179, 8, 0.15)',   text: '#eab308' },
  Other:     { bg: 'rgba(161, 161, 170, 0.15)', text: '#a1a1aa' },
};

// ---------------------------------------------------------------------------
// ExerciseBlock - displays one exercise with its set grid
// ---------------------------------------------------------------------------

function ExerciseBlock({
  exercise,
  theme,
}: {
  exercise: WorkoutLogExerciseWithSets;
  theme: Theme;
}) {
  const styles = getExerciseStyles(theme);
  const categoryColor =
    CATEGORY_COLORS[exercise.exercises.category] || CATEGORY_COLORS.Other;

  return (
    <View style={styles.exerciseContainer}>
      {/* Exercise header: name + category badge */}
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.exercises.name}
        </Text>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor.bg }]}>
          <Text style={[styles.categoryText, { color: categoryColor.text }]}>
            {exercise.exercises.category}
          </Text>
        </View>
      </View>

      {/* Set grid header */}
      <View style={styles.setGridHeader}>
        <Text style={[styles.setHeaderCell, styles.setNumberCol]}>Set</Text>
        <Text style={[styles.setHeaderCell, styles.flexCol]}>Weight</Text>
        <Text style={[styles.setHeaderCell, styles.flexCol]}>Reps</Text>
        <Text style={[styles.setHeaderCell, styles.statusCol]}>Status</Text>
      </View>

      {/* Set rows */}
      {exercise.workout_log_sets.map((set) => (
        <View key={set.id} style={styles.setRow}>
          <Text style={[styles.setCell, styles.setNumberCol]}>{set.set_number}</Text>
          <Text style={[styles.setCell, styles.flexCol]}>
            {set.weight > 0 ? `${set.weight} lbs` : '\u2014'}
          </Text>
          <Text style={[styles.setCell, styles.flexCol]}>{set.reps}</Text>
          <View style={styles.statusCol}>
            <Ionicons
              name={set.is_done ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={set.is_done ? theme.colors.success : theme.colors.textMuted}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  const [workout, setWorkout] = useState<WorkoutLogWithExercises | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!workoutId) return;
      const { data, error: loadError } = await logging.getWorkoutLog(workoutId);
      if (loadError) {
        setError('Failed to load workout');
      } else {
        setWorkout(data);
      }
      setIsLoading(false);
    }
    load();
  }, [workoutId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workout?.template_name || 'Untitled Workout'}
          </Text>
          {workout && (
            <Text style={styles.headerDate}>
              {formatDetailDate(workout.started_at)}
            </Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : workout ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {workout.workout_log_exercises.map((exercise) => (
            <ExerciseBlock key={exercise.id} exercise={exercise} theme={theme} />
          ))}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Screen styles
// ---------------------------------------------------------------------------

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    headerDate: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerSpacer: {
      width: 44,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.danger,
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
  });
}

// ---------------------------------------------------------------------------
// Exercise block styles
// ---------------------------------------------------------------------------

function getExerciseStyles(theme: Theme) {
  return StyleSheet.create({
    exerciseContainer: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    exerciseName: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    categoryBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
      marginLeft: theme.spacing.sm,
    },
    categoryText: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
    },
    setGridHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.xs,
    },
    setHeaderCell: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      fontWeight: theme.typography.weights.medium,
      textTransform: 'uppercase',
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    setCell: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    setNumberCol: {
      width: 48,
      textAlign: 'center',
    },
    flexCol: {
      flex: 1,
      textAlign: 'center',
    },
    statusCol: {
      width: 48,
      alignItems: 'center',
    },
  });
}
