/**
 * My Exercises Screen
 *
 * Settings sub-screen for managing user-created custom exercises.
 * Replaces Phase 1 placeholder with full CRUD functionality:
 * - Alphabetical list of user exercises (via MyExercisesList)
 * - Inline edit accordion with validation
 * - Delete with dependency warnings
 * - Create exercise modal
 * - Empty state with Create Exercise button
 *
 * Stack push from dashboard (after settings sheet dismiss).
 * Back button returns to dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, type Theme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { exercises } from '@/services/exercises';
import { MyExercisesList } from '@/components/MyExercisesList';
import { CreateExerciseModal } from '@/components/CreateExerciseModal';
import type { Exercise } from '@/types/database';

export default function ExercisesScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadExercises = useCallback(async () => {
    const { data } = await exercises.getUserExercises();
    setExerciseList(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>My Exercises</Text>
        <Pressable
          onPress={() => setShowCreateModal(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={theme.colors.accent} />
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : exerciseList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            You haven't created any custom exercises yet
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={theme.colors.textPrimary}
            />
            <Text style={styles.createButtonText}>Create Exercise</Text>
          </Pressable>
        </View>
      ) : (
        <MyExercisesList
          exercises={exerciseList}
          onExerciseUpdated={loadExercises}
        />
      )}

      <CreateExerciseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadExercises}
      />
    </SafeAreaView>
  );
}

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
    headerTitle: {
      flex: 1,
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    addButton: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    emptyText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.md,
      minHeight: 44,
    },
    createButtonPressed: {
      opacity: 0.8,
    },
    createButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
  });
}
