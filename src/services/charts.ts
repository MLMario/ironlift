/**
 * Charts Service Module
 *
 * Handles chart CRUD operations for exercise metrics.
 * Ported from web app (exercise_tracker_app) with import path changes only.
 * Chart.js rendering code discarded -- replaced by declarative <LineChart> in React Native.
 */

import { supabase } from '@/lib/supabase';
import type {
  ServiceResult,
  ServiceError,
  UserChartData,
  CreateChartInput,
} from '@/types/services';

// ============================================================================
// Chart CRUD Operations
// ============================================================================

/**
 * Get all charts for the current user.
 * Queries user_charts with exercises join, ordered by `order` ascending.
 *
 * @returns Promise resolving to user charts or error
 */
async function getUserCharts(): Promise<ServiceResult<UserChartData[]>> {
  try {
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

    const { data, error } = await supabase
      .from('user_charts')
      .select(
        `
        id,
        user_id,
        exercise_id,
        metric_type,
        x_axis_mode,
        order,
        created_at,
        exercises (
          id,
          name,
          category
        )
      `
      )
      .eq('user_id', user.id)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching user charts:', error);
      return { data: null, error };
    }

    return { data: data as unknown as UserChartData[], error: null };
  } catch (err) {
    console.error('Unexpected error in getUserCharts:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Create a new chart.
 * Gets max order value, inserts with nextOrder, then re-fetches with exercises join
 * so the returned UserChartData has the exercises field populated.
 *
 * @param chartData - Chart configuration data
 * @returns Promise resolving to created chart or error
 */
async function createChart(
  chartData: CreateChartInput
): Promise<ServiceResult<UserChartData>> {
  try {
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

    // Get the current max order value
    const { data: existingCharts, error: fetchError } = await supabase
      .from('user_charts')
      .select('order')
      .eq('user_id', user.id)
      .order('order', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing charts for order:', fetchError);
      return { data: null, error: fetchError };
    }

    const nextOrder =
      existingCharts && existingCharts.length > 0
        ? existingCharts[0].order + 1
        : 0;

    // Create the new chart
    const { data: insertedChart, error: insertError } = await supabase
      .from('user_charts')
      .insert([
        {
          user_id: user.id,
          exercise_id: chartData.exercise_id,
          metric_type: chartData.metric_type,
          x_axis_mode: chartData.x_axis_mode,
          order: nextOrder,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating chart:', insertError);
      return { data: null, error: insertError };
    }

    // Re-fetch with exercises join so the returned data has the exercises field populated
    // (the insert .select() returns the chart without the join)
    const { data: chartWithExercise, error: refetchError } = await supabase
      .from('user_charts')
      .select(
        `
        id,
        user_id,
        exercise_id,
        metric_type,
        x_axis_mode,
        order,
        created_at,
        exercises (
          id,
          name,
          category
        )
      `
      )
      .eq('id', insertedChart.id)
      .single();

    if (refetchError) {
      console.error('Error re-fetching chart with exercises:', refetchError);
      // Fall back to insert result without exercises join
      return { data: insertedChart as unknown as UserChartData, error: null };
    }

    return { data: chartWithExercise as unknown as UserChartData, error: null };
  } catch (err) {
    console.error('Unexpected error in createChart:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Delete a chart by ID.
 *
 * @param id - Chart UUID
 * @returns Promise resolving to error status
 */
async function deleteChart(id: string): Promise<ServiceError> {
  try {
    const { error } = await supabase
      .from('user_charts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting chart:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error in deleteChart:', err);
    return {
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Reorder charts based on array position.
 * Updates each chart's order field to match its index in the array.
 *
 * @param chartIds - Array of chart UUIDs in desired order
 * @returns Promise resolving to error status
 */
async function reorderCharts(chartIds: string[]): Promise<ServiceError> {
  try {
    // Update each chart's order based on its position in the array
    const updates = chartIds.map((id, index) => {
      return supabase
        .from('user_charts')
        .update({ order: index })
        .eq('id', id);
    });

    // Execute all updates
    const results = await Promise.all(updates);

    // Check if any updates failed
    const failedResult = results.find((result) => result.error);
    if (failedResult) {
      console.error('Error reordering charts:', failedResult.error);
      return { error: failedResult.error };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error in reorderCharts:', err);
    return {
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

// ============================================================================
// Display Name Helpers
// ============================================================================

/**
 * Get display name for metric type.
 * Shortened from web version for mobile card title display.
 *
 * @param metricType - Metric type string
 * @returns Display name
 */
function getMetricDisplayName(metricType: string): string {
  switch (metricType) {
    case 'total_sets':
      return 'Total Sets';
    case 'max_volume_set':
      return 'Max Volume';
    default:
      return metricType;
  }
}

/**
 * Get display name for x-axis mode.
 *
 * @param mode - X-axis mode string
 * @returns Display name
 */
function getModeDisplayName(mode: string): string {
  switch (mode) {
    case 'date':
      return 'By Date';
    case 'session':
      return 'By Session';
    default:
      return mode;
  }
}

// ============================================================================
// Service Export
// ============================================================================

/**
 * Charts service object.
 * Provides chart CRUD operations and display helpers.
 * Does NOT implement the full ChartsService interface (renderChart/destroyChart
 * are Chart.js-specific and replaced by declarative <LineChart> components).
 */
export const charts = {
  getUserCharts,
  createChart,
  deleteChart,
  reorderCharts,
  getMetricDisplayName,
  getModeDisplayName,
};
