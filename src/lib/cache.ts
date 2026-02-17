/**
 * Cache Utilities Module
 *
 * Provides AsyncStorage-backed caching for exercise, template, and chart data.
 * All operations are best-effort: errors are logged but never thrown.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise, TemplateWithExercises } from '@/types/database';
import type { ChartData, UserChartData } from '@/types/services';

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

// ============================================================================
// Chart Metrics Cache
// ============================================================================

const CACHE_KEY_CHART_METRICS = 'ironlift:chart-metrics';

type ChartMetricsMap = Record<string, ChartData>;

/**
 * Build a composite cache key for a chart's metrics data.
 *
 * @param exerciseId - Exercise UUID
 * @param metricType - Metric type (e.g., 'total_sets', 'max_volume_set')
 * @param xAxisMode - X-axis mode ('date' or 'session')
 * @returns Composite key string
 */
export function chartMetricsCacheKey(
  exerciseId: string,
  metricType: string,
  xAxisMode: string
): string {
  return `${exerciseId}:${metricType}:${xAxisMode}`;
}

/**
 * Retrieve a single chart's cached metrics data from AsyncStorage.
 *
 * @param key - Composite cache key from chartMetricsCacheKey()
 * @returns Parsed ChartData, or null on cache miss/error
 */
export async function getCachedChartMetrics(key: string): Promise<ChartData | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY_CHART_METRICS);
    if (!json) return null;
    const map: ChartMetricsMap = JSON.parse(json);
    return map[key] ?? null;
  } catch {
    return null;
  }
}

/**
 * Store a single chart's metrics data in the AsyncStorage map.
 * Reads the existing map, merges the new entry, and writes back.
 *
 * @param key - Composite cache key from chartMetricsCacheKey()
 * @param data - Chart data to cache
 */
export async function setCachedChartMetrics(key: string, data: ChartData): Promise<void> {
  try {
    let map: ChartMetricsMap = {};
    const json = await AsyncStorage.getItem(CACHE_KEY_CHART_METRICS);
    if (json) {
      map = JSON.parse(json);
    }
    map[key] = data;
    await AsyncStorage.setItem(CACHE_KEY_CHART_METRICS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to cache chart metrics:', err);
  }
}

/**
 * Remove the entire chart metrics cache entry from AsyncStorage.
 */
export async function clearChartMetricsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY_CHART_METRICS);
  } catch (err) {
    console.error('Failed to clear chart metrics cache:', err);
  }
}
