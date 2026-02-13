/**
 * useExercises Hook
 *
 * Encapsulates exercise data loading with cache-first strategy.
 * Loads exercises from AsyncStorage cache first for instant display,
 * then fetches fresh data from Supabase in the background.
 *
 * Exercises are always pre-sorted: user exercises first (is_system === false),
 * then system exercises (is_system === true), alphabetical within each group.
 *
 * This hook does NOT handle search or category filtering --
 * callers (e.g., ExercisePickerModal) apply their own filters on the sorted data.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Exercise } from '@/types/database';
import { exercises } from '@/services/exercises';
import { getCachedExercises, setCachedExercises } from '@/lib/cache';

/**
 * Sort exercises: user exercises first, then system exercises.
 * Alphabetical by name (case-insensitive) within each group.
 */
function sortExercises(data: Exercise[]): Exercise[] {
  return [...data].sort((a, b) => {
    // User exercises (is_system === false) come first
    if (a.is_system !== b.is_system) {
      return a.is_system ? 1 : -1;
    }
    // Alphabetical within each group (case-insensitive)
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/**
 * Hook for loading and managing exercise data.
 *
 * Strategy:
 * 1. On mount, try cache first for instant display
 * 2. Fetch fresh data from Supabase
 * 3. Update cache with fresh data
 * 4. If network fails and no cache, show error
 *
 * @returns exercises (sorted), loading state, error, and refresh function
 */
export function useExercises(): {
  exercises: Exercise[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let hasCachedData = false;

    // Step 1: Try cache first for instant display
    try {
      const cached = await getCachedExercises();
      if (cached) {
        setExerciseList(sortExercises(cached));
        setIsLoading(false);
        hasCachedData = true;
      }
    } catch {
      // Cache read failed silently -- continue to network
    }

    // Step 2: Fetch fresh data from Supabase
    try {
      const { data, error: fetchError } = await exercises.getExercises();

      if (data) {
        setExerciseList(sortExercises(data));
        // Update cache with fresh data
        await setCachedExercises(data);
      } else if (fetchError && !hasCachedData) {
        // Network failed AND no cached data available
        setError('Failed to load exercises. Please check your connection.');
      }
    } catch {
      if (!hasCachedData) {
        setError('Failed to load exercises. Please check your connection.');
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return {
    exercises: exerciseList,
    isLoading,
    error,
    refresh: loadExercises,
  };
}
