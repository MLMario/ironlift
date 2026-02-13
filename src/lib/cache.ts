/**
 * Cache Utilities Module
 *
 * Provides AsyncStorage-backed caching for exercise data.
 * All operations are best-effort: errors are logged but never thrown.
 * Future phases will extend this module with additional cache keys
 * (templates, workout history).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise } from '@/types/database';

const CACHE_KEY_EXERCISES = 'ironlift:exercises';

/**
 * Retrieve cached exercises from AsyncStorage.
 *
 * @returns Parsed Exercise array, or null on cache miss/error
 */
export async function getCachedExercises(): Promise<Exercise[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY_EXERCISES);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Store exercises in AsyncStorage cache.
 *
 * @param exercises - Array of exercises to cache
 */
export async function setCachedExercises(exercises: Exercise[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_EXERCISES, JSON.stringify(exercises));
  } catch (err) {
    console.error('Failed to cache exercises:', err);
  }
}

/**
 * Remove the exercises cache entry from AsyncStorage.
 */
export async function clearExerciseCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY_EXERCISES);
  } catch (err) {
    console.error('Failed to clear exercise cache:', err);
  }
}
