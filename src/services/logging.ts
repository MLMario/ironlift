/**
 * Logging Service Module
 *
 * TypeScript implementation of the LoggingService interface.
 * Provides workout logging, exercise history, and metrics calculation.
 *
 * Ported from web app (exercise_tracker_app) with import path changes only.
 */

import type {
  LoggingService,
  ServiceResult,
  WorkoutLogInput,
  WorkoutLogSummary,
  ExerciseHistoryOptions,
  ExerciseHistoryData,
  ExerciseHistoryDateData,
  ExerciseHistorySessionData,
  ExerciseMetricsOptions,
  ChartData,
  RecentExerciseData,
  WorkoutHistoryItem,
  PaginatedResult,
  WorkoutSummaryStats,
} from '@/types/services';

import type {
  WorkoutLog,
  WorkoutLogWithExercises,
  WorkoutLogExerciseWithSets,
} from '@/types/database';

import { supabase } from '@/lib/supabase';

/**
 * Internal helper to calculate metrics from workout log exercises with sets.
 * Used by getExerciseHistory for both date and session grouping modes.
 *
 * @param exercises - Array of workout log exercises with their sets
 * @returns Calculated metrics: totalSets, maxWeight, maxVolumeSet
 */
function calculateMetrics(exercises: WorkoutLogExerciseWithSets[]): {
  totalSets: number;
  maxWeight: number;
  maxVolumeSet: number;
} {
  let totalSets = 0;
  let maxWeight = 0;
  let maxVolumeSet = 0;

  exercises.forEach((ex) => {
    const sets = ex.workout_log_sets || [];
    const completedSets = sets.filter((s) => s.is_done);
    totalSets += completedSets.length;

    sets.forEach((set) => {
      if (set.weight > maxWeight) maxWeight = set.weight;
      // Volume: weight x reps for weighted exercises, just reps for bodyweight
      const volume = set.weight > 0 ? set.weight * (set.reps || 0) : set.reps || 0;
      if (volume > maxVolumeSet) maxVolumeSet = volume;
    });
  });

  return { totalSets, maxWeight, maxVolumeSet };
}

/**
 * Create a new workout log with exercises.
 *
 * @param data - Workout data including exercises and sets
 * @returns Promise resolving to the created workout log or error
 */
async function createWorkoutLog(data: WorkoutLogInput): Promise<ServiceResult<WorkoutLog>> {
  try {
    const { template_id, started_at, exercises } = data;

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

    // Create workout log
    const { data: workoutLog, error: logError } = await supabase
      .from('workout_logs')
      .insert({
        user_id: user.id,
        template_id: template_id || null,
        started_at,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      return { data: null, error: logError };
    }

    // Insert all workout log exercises and their sets
    if (exercises && exercises.length > 0) {
      for (let index = 0; index < exercises.length; index++) {
        const ex = exercises[index];

        // Get rest_seconds from exercise level (normalized schema)
        const restSeconds = ex.rest_seconds ?? 60;

        // Insert workout_log_exercise (parent record - normalized, no aggregates)
        const { data: logExercise, error: exError } = await supabase
          .from('workout_log_exercises')
          .insert({
            workout_log_id: workoutLog.id,
            exercise_id: ex.exercise_id,
            rest_seconds: restSeconds,
            order: ex.order !== undefined ? ex.order : index,
          })
          .select()
          .single();

        if (exError) {
          // Rollback: delete the workout log if exercises fail
          await supabase.from('workout_logs').delete().eq('id', workoutLog.id);

          return { data: null, error: exError };
        }

        // Insert individual sets (required for normalized schema)
        if (Array.isArray(ex.sets) && ex.sets.length > 0) {
          const setsToInsert = ex.sets.map((set) => ({
            workout_log_exercise_id: logExercise.id,
            set_number: set.set_number,
            weight: set.weight || 0,
            reps: set.reps || 0,
            is_done: set.is_done || false,
          }));

          const { error: setsError } = await supabase
            .from('workout_log_sets')
            .insert(setsToInsert);

          if (setsError) {
            console.error('Failed to insert sets:', setsError);
            // Continue anyway - the parent exercise was saved
          }
        }
      }
    }

    return { data: workoutLog, error: null };
  } catch (err) {
    console.error('Create workout log error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get workout logs for the current user.
 *
 * @param limit - Maximum number of logs to fetch (default 52)
 * @returns Promise resolving to workout log summaries or error
 */
async function getWorkoutLogs(limit: number = 52): Promise<ServiceResult<WorkoutLogSummary[]>> {
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

    // Fetch workout logs with exercise count
    const { data, error } = await supabase
      .from('workout_logs')
      .select(
        `
        id,
        template_id,
        started_at,
        created_at,
        workout_log_exercises (count)
      `
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error };
    }

    // Format the response to include exercise_count
    const formattedData: WorkoutLogSummary[] = data.map((log) => ({
      id: log.id,
      template_id: log.template_id,
      started_at: log.started_at,
      created_at: log.created_at,
      exercise_count:
        (log.workout_log_exercises as unknown as { count: number }[])?.[0]?.count || 0,
    }));

    return { data: formattedData, error: null };
  } catch (err) {
    console.error('Get workout logs error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get detailed workout log with all exercises.
 *
 * @param id - Workout log UUID
 * @returns Promise resolving to the workout log with exercises or error
 */
async function getWorkoutLog(id: string): Promise<ServiceResult<WorkoutLogWithExercises>> {
  try {
    // Fetch workout log with exercises, sets, and exercise details (normalized schema)
    const { data, error } = await supabase
      .from('workout_logs')
      .select(
        `
        id,
        template_id,
        started_at,
        created_at,
        templates (name),
        workout_log_exercises (
          id,
          exercise_id,
          rest_seconds,
          order,
          exercises (
            id,
            name,
            category
          ),
          workout_log_sets (
            id,
            set_number,
            weight,
            reps,
            is_done
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Cast and sort exercises by order and sets by set_number
    const result = data as unknown as WorkoutLogWithExercises;
    // Add template_name from joined data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.template_name = (data as any).templates?.name || null;
    if (result.workout_log_exercises) {
      result.workout_log_exercises.sort((a, b) => a.order - b.order);
      result.workout_log_exercises.forEach((ex) => {
        if (ex.workout_log_sets) {
          ex.workout_log_sets.sort((a, b) => a.set_number - b.set_number);
        }
      });
    }

    return { data: result, error: null };
  } catch (err) {
    console.error('Get workout log error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

// Type for the raw query result from getExerciseHistory
interface ExerciseHistoryQueryResult {
  id: string;
  rest_seconds: number;
  workout_logs: {
    id: string;
    user_id: string;
    started_at: string;
  };
  workout_log_sets: Array<{
    id: string;
    set_number: number;
    weight: number;
    reps: number;
    is_done: boolean;
  }>;
}

/**
 * Get exercise history for charting.
 *
 * @param exerciseId - Exercise UUID
 * @param options - History options (mode, limit)
 * @returns Promise resolving to history data or error
 */
async function getExerciseHistory(
  exerciseId: string,
  options: ExerciseHistoryOptions = {}
): Promise<ServiceResult<ExerciseHistoryData[]>> {
  try {
    const { mode = 'session', limit = 52 } = options;

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

    // Fetch workout log exercises with their sets (normalized schema)
    const { data, error } = await supabase
      .from('workout_log_exercises')
      .select(
        `
        id,
        rest_seconds,
        workout_logs!inner (
          id,
          user_id,
          started_at
        ),
        workout_log_sets (
          id,
          set_number,
          weight,
          reps,
          is_done
        )
      `
      )
      .eq('exercise_id', exerciseId)
      .eq('workout_logs.user_id', user.id);

    if (error) {
      return { data: null, error };
    }

    // Cast the data to our expected type
    const typedData = data as unknown as ExerciseHistoryQueryResult[];

    // Sort by workout started_at in memory (Supabase doesn't support ordering by nested columns)
    typedData.sort(
      (a, b) =>
        new Date(b.workout_logs.started_at).getTime() -
        new Date(a.workout_logs.started_at).getTime()
    );

    // Apply limit
    const limitedData = typedData.slice(0, mode === 'session' ? limit : 365);

    if (mode === 'date') {
      // Group by date
      const dateMap = new Map<string, WorkoutLogExerciseWithSets[]>();

      limitedData.forEach((item) => {
        const date = new Date(item.workout_logs.started_at).toISOString().split('T')[0];

        if (!dateMap.has(date)) {
          dateMap.set(date, []);
        }
        // Convert to WorkoutLogExerciseWithSets format
        dateMap.get(date)!.push({
          id: item.id,
          exercise_id: '', // Not needed for metrics calculation
          rest_seconds: item.rest_seconds,
          order: 0, // Not needed for metrics calculation
          exercises: { id: '', name: '', category: 'Chest' }, // Not needed for metrics calculation
          workout_log_sets: item.workout_log_sets,
        });
      });

      // Convert to array and sort by date
      const groupedData: ExerciseHistoryDateData[] = Array.from(dateMap.entries())
        .map(([date, exercises]) => {
          const metrics = calculateMetrics(exercises);
          return {
            date,
            total_sets: metrics.totalSets,
            max_weight: metrics.maxWeight,
            max_volume_set: metrics.maxVolumeSet,
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      return { data: groupedData, error: null };
    } else {
      // Session mode - group by workout
      const sessionMap = new Map<
        string,
        {
          workout_id: string;
          started_at: string;
          exercises: WorkoutLogExerciseWithSets[];
        }
      >();

      limitedData.forEach((item) => {
        const workoutId = item.workout_logs.id;

        if (!sessionMap.has(workoutId)) {
          sessionMap.set(workoutId, {
            workout_id: workoutId,
            started_at: item.workout_logs.started_at,
            exercises: [],
          });
        }
        // Convert to WorkoutLogExerciseWithSets format
        sessionMap.get(workoutId)!.exercises.push({
          id: item.id,
          exercise_id: '', // Not needed for metrics calculation
          rest_seconds: item.rest_seconds,
          order: 0, // Not needed for metrics calculation
          exercises: { id: '', name: '', category: 'Chest' }, // Not needed for metrics calculation
          workout_log_sets: item.workout_log_sets,
        });
      });

      // Convert to array and calculate metrics
      const sessionData: ExerciseHistorySessionData[] = Array.from(sessionMap.values())
        .map((session, index) => {
          const metrics = calculateMetrics(session.exercises);
          return {
            workout_id: session.workout_id,
            started_at: session.started_at,
            session_number: limitedData.length - index, // Reverse numbering
            total_sets: metrics.totalSets,
            max_weight: metrics.maxWeight,
            max_volume_set: metrics.maxVolumeSet,
          };
        })
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

      return { data: sessionData, error: null };
    }
  } catch (err) {
    console.error('Get exercise history error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Calculate exercise metrics for charting.
 *
 * @param exerciseId - Exercise UUID
 * @param options - Metrics options (metric, mode, limit)
 * @returns Promise resolving to chart data or error
 */
async function getExerciseMetrics(
  exerciseId: string,
  options: ExerciseMetricsOptions = {}
): Promise<ServiceResult<ChartData>> {
  try {
    const { metric = 'total_sets', mode = 'session', limit = 52 } = options;

    // Get exercise history
    const { data: historyData, error } = await getExerciseHistory(exerciseId, { mode, limit });

    if (error) {
      return { data: null, error };
    }

    if (!historyData) {
      return { data: { labels: [], values: [] }, error: null };
    }

    // Transform into chart-friendly format
    const labels: string[] = [];
    const values: number[] = [];

    if (mode === 'date') {
      // Reverse to show oldest to newest
      const reversedData = [...historyData].reverse() as ExerciseHistoryDateData[];

      reversedData.forEach((item) => {
        labels.push(item.date);

        if (metric === 'total_sets') {
          values.push(item.total_sets);
        } else if (metric === 'max_volume_set') {
          values.push(item.max_volume_set);
        }
      });
    } else {
      // Session mode - reverse to show oldest to newest
      const reversedData = [...historyData].reverse() as ExerciseHistorySessionData[];

      reversedData.forEach((item, index) => {
        labels.push(`Session ${index + 1}`);

        if (metric === 'total_sets') {
          values.push(item.total_sets);
        } else if (metric === 'max_volume_set') {
          values.push(item.max_volume_set);
        }
      });
    }

    return {
      data: { labels, values },
      error: null,
    };
  } catch (err) {
    console.error('Get exercise metrics error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

// Type for the raw query result from getRecentExerciseData
interface RecentExerciseQueryResult {
  rest_seconds: number;
  workout_logs: {
    user_id: string;
    started_at: string;
  };
  workout_log_sets: Array<{
    set_number: number;
    weight: number;
    reps: number;
    is_done: boolean;
  }>;
}

/**
 * Get recent workout data for an exercise.
 * Used for pre-filling default values.
 *
 * @param exerciseId - Exercise UUID
 * @returns Promise resolving to recent data or null if none exists
 */
async function getRecentExerciseData(exerciseId: string): Promise<RecentExerciseData | null> {
  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Fetch workout log exercises with their sets (normalized schema)
    const { data, error } = await supabase
      .from('workout_log_exercises')
      .select(
        `
        rest_seconds,
        workout_logs!inner (
          user_id,
          started_at
        ),
        workout_log_sets (
          set_number,
          weight,
          reps,
          is_done
        )
      `
      )
      .eq('exercise_id', exerciseId)
      .eq('workout_logs.user_id', user.id);

    if (error || !data || data.length === 0) {
      return null;
    }

    // Cast the data to our expected type
    const typedData = data as unknown as RecentExerciseQueryResult[];

    // Sort by started_at to get most recent and take first one
    typedData.sort(
      (a, b) =>
        new Date(b.workout_logs.started_at).getTime() -
        new Date(a.workout_logs.started_at).getTime()
    );
    const mostRecent = typedData[0];

    // Calculate aggregates from sets
    const sets = mostRecent.workout_log_sets || [];
    const completedSets = sets.filter((s) => s.is_done);
    const firstSet = sets.find((s) => s.set_number === 1) || sets[0];

    return {
      sets: completedSets.length || sets.length,
      reps: firstSet?.reps || 10,
      weight: firstSet?.weight || 0,
      rest_seconds: mostRecent.rest_seconds || 60,
    };
  } catch (err) {
    console.error('Get recent exercise data error:', err);
    return null;
  }
}

/**
 * Get paginated workout history for list view.
 * Returns summary info per workout including template name, completed sets, and total volume.
 *
 * @param offset - Number of items to skip
 * @param limit - Number of items to return (page size)
 * @returns Promise resolving to paginated history items or error
 */
async function getWorkoutLogsPaginated(
  offset: number,
  limit: number
): Promise<ServiceResult<PaginatedResult<WorkoutHistoryItem>>> {
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

    // Fetch workout logs with template name and nested sets for aggregation
    const { data, error, count } = await supabase
      .from('workout_logs')
      .select(`
        id,
        template_id,
        started_at,
        templates (name),
        workout_log_exercises (
          workout_log_sets (
            weight,
            reps,
            is_done
          )
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);  // Supabase range is inclusive

    if (error) {
      return { data: null, error };
    }

    // Transform to WorkoutHistoryItem with computed fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: WorkoutHistoryItem[] = (data || []).map((log: any) => {
      let completedSets = 0;
      let totalVolume = 0;
      let exerciseCount = 0;

      if (log.workout_log_exercises) {
        exerciseCount = log.workout_log_exercises.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        log.workout_log_exercises.forEach((ex: any) => {
          if (ex.workout_log_sets) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ex.workout_log_sets.forEach((set: any) => {
              if (set.is_done) {
                completedSets++;
                totalVolume += (set.weight || 0) * (set.reps || 0);
              }
            });
          }
        });
      }

      return {
        id: log.id,
        template_id: log.template_id,
        template_name: log.templates?.name || null,
        started_at: log.started_at,
        exercise_count: exerciseCount,
        completed_sets: completedSets,
        total_volume: totalVolume,
      };
    });

    const hasMore = count !== null && count > offset + items.length;

    return {
      data: { data: items, hasMore },
      error: null,
    };
  } catch (err) {
    console.error('Get workout logs paginated error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get all-time workout summary statistics.
 * Returns total workouts, total completed sets, and total volume.
 *
 * @returns Promise resolving to summary stats or error
 */
async function getWorkoutSummaryStats(): Promise<ServiceResult<WorkoutSummaryStats>> {
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

    // Get total workout count
    const { count: workoutCount, error: countError } = await supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      return { data: null, error: countError };
    }

    // Get all sets for aggregation
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('workout_log_exercises')
      .select(`
        workout_log_sets (
          weight,
          reps,
          is_done
        ),
        workout_logs!inner (
          user_id
        )
      `)
      .eq('workout_logs.user_id', user.id);

    if (exercisesError) {
      return { data: null, error: exercisesError };
    }

    // Calculate totals from completed sets
    let totalSets = 0;
    let totalVolume = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exercisesData || []).forEach((ex: any) => {
      if (ex.workout_log_sets) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ex.workout_log_sets.forEach((set: any) => {
          if (set.is_done) {
            totalSets++;
            totalVolume += (set.weight || 0) * (set.reps || 0);
          }
        });
      }
    });

    return {
      data: {
        totalWorkouts: workoutCount || 0,
        totalSets,
        totalVolume,
      },
      error: null,
    };
  } catch (err) {
    console.error('Get workout summary stats error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Logging service object implementing the LoggingService interface.
 * Provides workout logging, exercise history, and metrics calculation.
 */
export const logging: LoggingService = {
  createWorkoutLog,
  getWorkoutLogs,
  getWorkoutLog,
  getExerciseHistory,
  getExerciseMetrics,
  getRecentExerciseData,
  getWorkoutLogsPaginated,
  getWorkoutSummaryStats,
};
