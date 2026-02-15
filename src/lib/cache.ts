/**
 * Cache Utilities Module
 *
 * Provides AsyncStorage-backed caching for exercise, template, and chart data.
 * All operations are best-effort: errors are logged but never thrown.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise, TemplateWithExercises } from '@/types/database';
import type { UserChartData } from '@/types/services';

const CACHE_KEY_EXERCISES = 'ironlift:exercises';
const CACHE_KEY_TEMPLATES = 'ironlift:templates';
const CACHE_KEY_CHARTS = 'ironlift:charts';

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

// ============================================================================
// Template Cache
// ============================================================================

/**
 * Retrieve cached templates from AsyncStorage.
 *
 * @returns Parsed TemplateWithExercises array, or null on cache miss/error
 */
export async function getCachedTemplates(): Promise<TemplateWithExercises[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY_TEMPLATES);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Store templates in AsyncStorage cache.
 *
 * @param templates - Array of templates to cache
 */
export async function setCachedTemplates(templates: TemplateWithExercises[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to cache templates:', err);
  }
}

/**
 * Remove the templates cache entry from AsyncStorage.
 */
export async function clearTemplateCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY_TEMPLATES);
  } catch (err) {
    console.error('Failed to clear template cache:', err);
  }
}

// ============================================================================
// Chart Cache
// ============================================================================

/**
 * Retrieve cached chart configs from AsyncStorage.
 *
 * @returns Parsed UserChartData array, or null on cache miss/error
 */
export async function getCachedCharts(): Promise<UserChartData[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY_CHARTS);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Store chart configs in AsyncStorage cache.
 *
 * @param charts - Array of chart configs to cache
 */
export async function setCachedCharts(charts: UserChartData[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_CHARTS, JSON.stringify(charts));
  } catch (err) {
    console.error('Failed to cache charts:', err);
  }
}

/**
 * Remove the charts cache entry from AsyncStorage.
 */
export async function clearChartCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY_CHARTS);
  } catch (err) {
    console.error('Failed to clear chart cache:', err);
  }
}
