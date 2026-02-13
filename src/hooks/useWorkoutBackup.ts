/**
 * useWorkoutBackup Hook
 *
 * Provides AsyncStorage backup/restore operations for crash recovery.
 * Port of the web app's useWorkoutBackup, adapting localStorage (sync)
 * to AsyncStorage (async).
 *
 * IMPORTANT: This hook does NOT auto-save. The workout screen calls save()
 * explicitly on meaningful actions only:
 * - Set done toggle (checkbox toggled)
 * - Exercise add/remove
 * - Set add/remove
 * NOT on every weight/reps keystroke (locked decision from CONTEXT.md).
 */

import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveWorkout, TemplateSnapshot } from './useWorkoutState';

// ============================================================================
// Exported Types
// ============================================================================

/**
 * Backup data structure stored in AsyncStorage.
 * Contains full workout state needed for crash recovery.
 */
export interface WorkoutBackupData {
  activeWorkout: ActiveWorkout;
  originalTemplateSnapshot: TemplateSnapshot | null;
  last_saved_at: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing workout AsyncStorage backup/restore.
 *
 * All operations are async and wrapped in try/catch.
 * Errors are logged but never thrown (Pitfall 2 from RESEARCH.md).
 *
 * @param userId - Current user ID for scoped storage key
 * @returns Object with save, clear, restore, and getStorageKey functions
 */
export function useWorkoutBackup(userId: string | undefined) {
  /**
   * Get the AsyncStorage key for this user's workout backup.
   * Returns null if no userId is available.
   */
  const getStorageKey = useCallback((): string | null => {
    return userId ? `activeWorkout_${userId}` : null;
  }, [userId]);

  /**
   * Save the current workout state to AsyncStorage.
   *
   * Guards:
   * - Skip if no userId
   * - Skip if no started_at (workout not yet initialized)
   * - Skip if no exercises (nothing to save)
   *
   * Errors are logged but never thrown.
   */
  const save = useCallback(
    async (
      activeWorkout: ActiveWorkout,
      snapshot: TemplateSnapshot | null
    ): Promise<void> => {
      const key = userId ? `activeWorkout_${userId}` : null;
      if (!key) return;
      if (!activeWorkout.started_at) return;
      if (activeWorkout.exercises.length === 0) return;

      const backupData: WorkoutBackupData = {
        activeWorkout,
        originalTemplateSnapshot: snapshot,
        last_saved_at: new Date().toISOString(),
      };

      try {
        await AsyncStorage.setItem(key, JSON.stringify(backupData));
      } catch (error) {
        console.warn('[useWorkoutBackup] Failed to save backup:', error);
      }
    },
    [userId]
  );

  /**
   * Clear the workout backup from AsyncStorage.
   * Called on workout finish or cancel.
   *
   * Errors are logged but never thrown.
   */
  const clear = useCallback(async (): Promise<void> => {
    const key = userId ? `activeWorkout_${userId}` : null;
    if (!key) return;

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('[useWorkoutBackup] Failed to clear backup:', error);
    }
  }, [userId]);

  /**
   * Restore a saved workout from AsyncStorage.
   * Returns the backup data or null if none exists or parsing fails.
   *
   * Errors are logged but never thrown -- returns null on failure.
   */
  const restore = useCallback(async (): Promise<WorkoutBackupData | null> => {
    const key = userId ? `activeWorkout_${userId}` : null;
    if (!key) return null;

    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const data: WorkoutBackupData = JSON.parse(raw);
      return data;
    } catch (error) {
      console.warn('[useWorkoutBackup] Failed to restore backup:', error);
      return null;
    }
  }, [userId]);

  return {
    save,
    clear,
    restore,
    getStorageKey,
  };
}
