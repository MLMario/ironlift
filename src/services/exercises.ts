/**
 * Exercises Service Module
 *
 * TypeScript implementation of the ExercisesService interface.
 * Provides CRUD operations for the exercise library.
 *
 * This module migrates js/exercises.js to TypeScript with full type safety.
 */

import type { Exercise, ExerciseCategory } from '@/types/database';
import type {
  ExercisesService,
  ServiceResult,
  ServiceError,
  UpdateExerciseParams,
  UpdateExerciseResult,
  ExerciseDependencies,
} from '@/types/services';

import { supabase } from '@/lib/supabase';

/**
 * Get all exercises for the current user.
 *
 * @returns Promise resolving to array of exercises or error
 */
async function getExercises(): Promise<ServiceResult<Exercise[]>> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching exercises:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in getExercises:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get exercises filtered by category.
 *
 * @param category - Exercise category to filter by
 * @returns Promise resolving to filtered exercises or error
 */
async function getExercisesByCategory(
  category: ExerciseCategory
): Promise<ServiceResult<Exercise[]>> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching exercises for category ${category}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in getExercisesByCategory:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Create a new exercise.
 *
 * @param name - Exercise display name
 * @param category - Exercise muscle group category
 * @param equipment - Optional equipment needed
 * @returns Promise resolving to the created exercise or error
 */
async function createExercise(
  name: string,
  category: ExerciseCategory,
  equipment?: string | null
): Promise<ServiceResult<Exercise>> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error getting current user:', userError);
      return {
        data: null,
        error: userError || new Error('No authenticated user'),
      };
    }

    // Validate inputs
    if (!name || !category) {
      const validationError = new Error('Name and category are required');
      console.error('Validation error:', validationError);
      return { data: null, error: validationError };
    }

    // Case-insensitive duplicate check, scoped to user's custom exercises
    const trimmedName = name.trim();
    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_system', false)
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: new Error('An exercise with this name already exists'),
      };
    }

    // Insert new exercise
    const { data, error } = await supabase
      .from('exercises')
      .insert([
        {
          user_id: user.id,
          name: trimmedName,
          category: category,
          equipment: equipment ? equipment.trim() : null,
          is_system: false, // User-created exercises are never system exercises
        },
      ])
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        console.error('Exercise with this name already exists');
        return {
          data: null,
          error: new Error('An exercise with this name already exists'),
        };
      }
      console.error('Error creating exercise:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in createExercise:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Delete an exercise by ID.
 *
 * @param id - Exercise UUID
 * @returns Promise resolving to error status
 */
async function deleteExercise(id: string): Promise<ServiceError> {
  try {
    if (!id) {
      const validationError = new Error('Exercise ID is required');
      console.error('Validation error:', validationError);
      return { error: validationError };
    }

    const { error } = await supabase.from('exercises').delete().eq('id', id);

    if (error) {
      console.error('Error deleting exercise:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error in deleteExercise:', err);
    return {
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Check if an exercise with the given name exists.
 *
 * @param name - Exercise name to check
 * @returns Promise resolving to true if exists, false otherwise
 */
async function exerciseExists(name: string): Promise<boolean> {
  try {
    if (!name) {
      return false;
    }

    const { data, error } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle();

    if (error) {
      console.error('Error checking exercise existence:', error);
      return false;
    }

    return data !== null;
  } catch (err) {
    console.error('Unexpected error in exerciseExists:', err);
    return false;
  }
}

/**
 * Get the list of predefined exercise categories.
 *
 * @returns Array of category strings
 */
function getCategories(): ExerciseCategory[] {
  return ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Other'];
}

/**
 * Get exercises that have logged workout data for the current user.
 * Used for chart exercise selection - only exercises with data can be charted.
 *
 * @returns Promise resolving to exercises with logged data or error
 */
async function getExercisesWithLoggedData(): Promise<ServiceResult<Exercise[]>> {
  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: authError || new Error('User not authenticated'),
      };
    }

    // Query exercises via inner join with workout_log_exercises
    // The !inner modifier ensures only exercises with log entries are returned
    const { data, error } = await supabase
      .from('workout_log_exercises')
      .select(`
        exercise_id,
        exercises!inner (
          id,
          name,
          category,
          is_system,
          user_id,
          equipment,
          instructions,
          level,
          force,
          mechanic
        ),
        workout_logs!inner (
          user_id
        )
      `)
      .eq('workout_logs.user_id', user.id);

    if (error) {
      console.error('Error fetching exercises with logged data:', error);
      return { data: null, error };
    }

    // Deduplicate and build exercise array
    const exerciseMap = new Map<string, Exercise>();
    data?.forEach(item => {
      const ex = item.exercises as unknown as Exercise;
      if (ex && !exerciseMap.has(ex.id)) {
        exerciseMap.set(ex.id, ex);
      }
    });

    // Sort by category then name (A-Z per CONTEXT.md)
    const exercisesList = Array.from(exerciseMap.values()).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    return { data: exercisesList, error: null };
  } catch (err) {
    console.error('Unexpected error in getExercisesWithLoggedData:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update an exercise's name and/or category.
 * Returns typed validation errors for name issues.
 *
 * @param params - Update parameters (id required, name and category optional)
 * @returns Promise resolving to the updated exercise, validation error, or generic error
 */
async function updateExercise(
  params: UpdateExerciseParams
): Promise<UpdateExerciseResult> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        data: null,
        error: userError || new Error('No authenticated user'),
      };
    }

    const { id, name, category } = params;

    // Build update object conditionally (only include provided fields)
    const updateData: Record<string, string> = {};

    if (name !== undefined) {
      const trimmedName = name.trim();

      // Reject empty/whitespace-only
      if (!trimmedName) {
        return { data: null, error: null, validationError: 'EMPTY_NAME' };
      }

      // Validate: letters, numbers, spaces only
      if (!/^[a-zA-Z0-9 ]+$/.test(trimmedName)) {
        return { data: null, error: null, validationError: 'INVALID_NAME' };
      }

      // Case-insensitive uniqueness check, scoped to user's exercises, excluding self
      const { data: existing } = await supabase
        .from('exercises')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_system', false)
        .ilike('name', trimmedName)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return { data: null, error: null, validationError: 'DUPLICATE_NAME' };
      }

      updateData.name = trimmedName;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      return { data: null, error: new Error('No fields to update') };
    }

    const { data, error } = await supabase
      .from('exercises')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as Exercise, error: null };
  } catch (err) {
    console.error('Unexpected error in updateExercise:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get only user-created exercises, sorted alphabetically by name.
 *
 * @returns Promise resolving to user-created exercises or error
 */
async function getUserExercises(): Promise<ServiceResult<Exercise[]>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        data: null,
        error: userError || new Error('No authenticated user'),
      };
    }

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_system', false)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching user exercises:', error);
      return { data: null, error };
    }

    return { data: data as Exercise[], error: null };
  } catch (err) {
    console.error('Unexpected error in getUserExercises:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get counts of templates, workout logs, and charts that reference an exercise.
 *
 * @param exerciseId - Exercise UUID to check dependencies for
 * @returns Promise resolving to dependency counts or error
 */
async function getExerciseDependencies(
  exerciseId: string
): Promise<ServiceResult<ExerciseDependencies>> {
  try {
    // Run all three counts in parallel for efficiency
    const [templateResult, workoutLogResult, chartResult] = await Promise.all([
      supabase
        .from('template_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exerciseId),
      supabase
        .from('workout_log_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exerciseId),
      supabase
        .from('user_charts')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exerciseId),
    ]);

    // Check for first error among results
    const firstError =
      templateResult.error || workoutLogResult.error || chartResult.error;
    if (firstError) {
      console.error('Error fetching exercise dependencies:', firstError);
      return { data: null, error: firstError };
    }

    return {
      data: {
        templateCount: templateResult.count ?? 0,
        workoutLogCount: workoutLogResult.count ?? 0,
        chartCount: chartResult.count ?? 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error in getExerciseDependencies:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Exercises service object implementing the ExercisesService interface.
 * Provides all exercise CRUD operations.
 */
export const exercises: ExercisesService = {
  getExercises,
  getExercisesByCategory,
  getExercisesWithLoggedData,
  createExercise,
  deleteExercise,
  exerciseExists,
  getCategories,
  updateExercise,
  getUserExercises,
  getExerciseDependencies,
};
