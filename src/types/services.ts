/**
 * Service Type Definitions
 *
 * TypeScript interfaces for all service modules (auth, exercises, templates, logging).
 * These types define the contracts for service modules that will be migrated in later phases.
 */

import type { User, Session, AuthChangeEvent, Subscription } from '@supabase/supabase-js';

import type {
  Exercise,
  ExerciseCategory,
  Template,
  TemplateExercise,
  TemplateWithExercises,
  WorkoutLog,
  WorkoutLogWithExercises,
} from './database';

// ============================================================================
// Result Types (standard return patterns)
// ============================================================================

/**
 * Generic service result for operations that return data.
 * Follows the Supabase pattern of { data, error }.
 *
 * @template T - The type of data returned on success
 */
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Service result for operations that only return an error status.
 * Used for delete operations and other void-returning functions.
 */
export interface ServiceError {
  error: Error | null;
}

/**
 * Auth result for authentication operations.
 * Returns the User object on success.
 */
export interface AuthResult {
  user: User | null;
  error: Error | null;
}

/**
 * Success result for operations that return a boolean success status.
 * Used for password reset and update operations.
 */
export interface SuccessResult {
  success: boolean;
  error: Error | null;
}

// ============================================================================
// Auth Service Types
// ============================================================================

/**
 * Auth subscription type for onAuthStateChange.
 * Maps to Supabase's Subscription type.
 */
export type AuthSubscription = Subscription;

/**
 * Auth state change callback function type.
 *
 * @param event - The authentication event that occurred
 * @param session - The current session (null if logged out)
 */
export type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: Session | null
) => void;

/**
 * Authentication service interface.
 * Provides user registration, login, logout, and session management.
 */
export interface AuthService {
  /**
   * Register a new user with email and password.
   *
   * @param email - User's email address
   * @param password - User's password (min 6 characters)
   * @returns Promise resolving to the created user or error
   */
  register(email: string, password: string): Promise<AuthResult>;

  /**
   * Login an existing user with email and password.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise resolving to the authenticated user or error
   */
  login(email: string, password: string): Promise<AuthResult>;

  /**
   * Logout the current user.
   *
   * @returns Promise resolving to error status
   */
  logout(): Promise<ServiceError>;

  /**
   * Send a password reset email to the user.
   *
   * @param email - User's email address
   * @returns Promise resolving to success status
   */
  resetPassword(email: string): Promise<SuccessResult>;

  /**
   * Update the current user's password.
   * Used after PASSWORD_RECOVERY event.
   *
   * @param password - New password (min 6 characters)
   * @returns Promise resolving to success status
   */
  updateUser(password: string): Promise<SuccessResult>;

  /**
   * Get the currently authenticated user.
   *
   * @returns Promise resolving to the current user or null
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Get the current session.
   *
   * @returns Promise resolving to the current session or null
   */
  getSession(): Promise<Session | null>;

  /**
   * Listen for authentication state changes.
   *
   * @param callback - Function to call on auth state change
   * @returns Subscription object for cleanup, or null on error
   */
  onAuthStateChange(callback: AuthStateChangeCallback): AuthSubscription | null;
}

// ============================================================================
// Exercises Service Types
// ============================================================================

/**
 * Parameters for updating an exercise.
 * Supports partial updates -- provide only the fields to change.
 *
 * @property id - Exercise UUID (required)
 * @property name - New exercise name (optional)
 * @property category - New exercise category (optional)
 */
export interface UpdateExerciseParams {
  id: string;
  name?: string;
  category?: ExerciseCategory;
}

/**
 * Typed validation error for exercise update operations.
 * Used instead of generic Error objects for name-related issues.
 */
export type UpdateExerciseError = 'DUPLICATE_NAME' | 'INVALID_NAME' | 'EMPTY_NAME';

/**
 * Result type for updateExercise operation.
 * Dedicated type (not extending ServiceResult) to include typed validation errors.
 *
 * @property data - The updated exercise on success, null on failure
 * @property error - Generic error (auth failure, DB error), null on success or validation error
 * @property validationError - Typed validation error for name issues, undefined if no validation error
 */
export interface UpdateExerciseResult {
  data: Exercise | null;
  error: Error | null;
  validationError?: UpdateExerciseError;
}

/**
 * Dependency counts for an exercise.
 * Shows how many other entities reference a given exercise.
 *
 * @property templateCount - Number of templates containing this exercise
 * @property workoutLogCount - Number of workout logs containing this exercise
 * @property chartCount - Number of charts tracking this exercise
 */
export interface ExerciseDependencies {
  templateCount: number;
  workoutLogCount: number;
  chartCount: number;
}

/**
 * Exercises service interface.
 * Provides CRUD operations for the exercise library.
 */
export interface ExercisesService {
  /**
   * Get all exercises for the current user.
   *
   * @returns Promise resolving to array of exercises or error
   */
  getExercises(): Promise<ServiceResult<Exercise[]>>;

  /**
   * Get exercises filtered by category.
   *
   * @param category - Exercise category to filter by
   * @returns Promise resolving to filtered exercises or error
   */
  getExercisesByCategory(category: ExerciseCategory): Promise<ServiceResult<Exercise[]>>;

  /**
   * Get exercises that have logged workout data for the current user.
   * Used for chart exercise selection - only exercises with data can be charted.
   *
   * @returns Promise resolving to exercises with logged data or error
   */
  getExercisesWithLoggedData(): Promise<ServiceResult<Exercise[]>>;

  /**
   * Create a new exercise.
   *
   * @param name - Exercise display name
   * @param category - Exercise muscle group category
   * @param equipment - Optional equipment needed
   * @returns Promise resolving to the created exercise or error
   */
  createExercise(
    name: string,
    category: ExerciseCategory,
    equipment?: string | null
  ): Promise<ServiceResult<Exercise>>;

  /**
   * Delete an exercise by ID.
   *
   * @param id - Exercise UUID
   * @returns Promise resolving to error status
   */
  deleteExercise(id: string): Promise<ServiceError>;

  /**
   * Check if an exercise with the given name exists.
   *
   * @param name - Exercise name to check
   * @returns Promise resolving to true if exists, false otherwise
   */
  exerciseExists(name: string): Promise<boolean>;

  /**
   * Get the list of predefined exercise categories.
   *
   * @returns Array of category strings
   */
  getCategories(): ExerciseCategory[];

  /**
   * Update an exercise's name and/or category.
   * Returns typed validation errors for name issues.
   *
   * @param params - Update parameters (id required, name and category optional)
   * @returns Promise resolving to the updated exercise, validation error, or generic error
   */
  updateExercise(params: UpdateExerciseParams): Promise<UpdateExerciseResult>;

  /**
   * Get only user-created exercises, sorted alphabetically by name.
   *
   * @returns Promise resolving to user-created exercises or error
   */
  getUserExercises(): Promise<ServiceResult<Exercise[]>>;

  /**
   * Get counts of templates, workout logs, and charts that reference an exercise.
   *
   * @param exerciseId - Exercise UUID to check dependencies for
   * @returns Promise resolving to dependency counts or error
   */
  getExerciseDependencies(exerciseId: string): Promise<ServiceResult<ExerciseDependencies>>;
}

// ============================================================================
// Templates Service Types
// ============================================================================

/**
 * Input data for creating/adding an exercise to a template.
 * Used in createTemplate, updateTemplate, and addExerciseToTemplate.
 */
export interface TemplateExerciseInput {
  /** Exercise UUID */
  exercise_id: string;
  /** Default rest time between sets (defaults to 90) */
  default_rest_seconds?: number;
  /** Set configurations for this exercise */
  sets?: TemplateSetInput[];
}

/**
 * Input data for a template set configuration.
 */
export interface TemplateSetInput {
  /** Set position (1-based) */
  set_number: number;
  /** Default weight value */
  weight?: number;
  /** Default repetition count */
  reps?: number;
}

/**
 * Defaults that can be updated for a template exercise.
 * Currently only supports rest time at the exercise level.
 */
export interface TemplateExerciseDefaults {
  /** Default rest time between sets */
  default_rest_seconds: number;
}

/**
 * Templates service interface.
 * Provides CRUD operations for workout templates.
 */
export interface TemplatesService {
  /**
   * Get all templates for the current user.
   *
   * @returns Promise resolving to templates with exercises or error
   */
  getTemplates(): Promise<ServiceResult<TemplateWithExercises[]>>;

  /**
   * Get a single template by ID with its exercises.
   *
   * @param id - Template UUID
   * @returns Promise resolving to the template with exercises or error
   */
  getTemplate(id: string): Promise<ServiceResult<TemplateWithExercises>>;

  /**
   * Create a new template.
   *
   * @param name - Template display name
   * @param exercises - Optional array of exercises with defaults
   * @returns Promise resolving to the created template or error
   */
  createTemplate(
    name: string,
    exercises?: TemplateExerciseInput[]
  ): Promise<ServiceResult<Template>>;

  /**
   * Update an existing template.
   * Replaces all exercises with the provided list.
   *
   * @param id - Template UUID
   * @param name - New template name
   * @param exercises - Optional array of exercises with defaults
   * @returns Promise resolving to the updated template or error
   */
  updateTemplate(
    id: string,
    name: string,
    exercises?: TemplateExerciseInput[]
  ): Promise<ServiceResult<Template>>;

  /**
   * Delete a template.
   *
   * @param id - Template UUID
   * @returns Promise resolving to error status
   */
  deleteTemplate(id: string): Promise<ServiceError>;

  /**
   * Add an exercise to a template.
   * Appends to the end of the exercise list with 3 default sets.
   *
   * @param templateId - Template UUID
   * @param exercise - Exercise input data
   * @returns Promise resolving to the created template exercise or error
   */
  addExerciseToTemplate(
    templateId: string,
    exercise: TemplateExerciseInput
  ): Promise<ServiceResult<TemplateExercise>>;

  /**
   * Remove an exercise from a template.
   *
   * @param templateId - Template UUID
   * @param exerciseId - Exercise UUID
   * @returns Promise resolving to error status
   */
  removeExerciseFromTemplate(templateId: string, exerciseId: string): Promise<ServiceError>;

  /**
   * Update exercise defaults in a template.
   *
   * @param templateId - Template UUID
   * @param exerciseId - Exercise UUID
   * @param defaults - New default values
   * @returns Promise resolving to the updated template exercise or error
   */
  updateTemplateExercise(
    templateId: string,
    exerciseId: string,
    defaults: TemplateExerciseDefaults
  ): Promise<ServiceResult<TemplateExercise>>;
}

// ============================================================================
// Logging Service Types
// ============================================================================

/**
 * Input data for a workout log set.
 */
export interface WorkoutLogSetInput {
  /** Set position (1-based) */
  set_number: number;
  /** Weight used for this set */
  weight?: number;
  /** Repetitions completed */
  reps?: number;
  /** Whether the set was completed */
  is_done?: boolean;
}

/**
 * Input data for a workout log exercise.
 */
export interface WorkoutLogExerciseInput {
  /** Exercise UUID */
  exercise_id: string;
  /** Rest time between sets */
  rest_seconds?: number;
  /** Position in the workout */
  order?: number;
  /** Sets performed for this exercise */
  sets?: WorkoutLogSetInput[];
}

/**
 * Input data for creating a workout log.
 */
export interface WorkoutLogInput {
  /** Source template UUID (null for ad-hoc workouts) */
  template_id?: string | null;
  /** ISO timestamp when workout started */
  started_at: string;
  /** Exercises performed in this workout */
  exercises: WorkoutLogExerciseInput[];
}

/**
 * Summary data for workout log list view.
 * Includes exercise count instead of full exercise data.
 */
export interface WorkoutLogSummary {
  /** Workout log UUID */
  id: string;
  /** Source template UUID (null for ad-hoc workouts) */
  template_id: string | null;
  /** ISO timestamp when workout started */
  started_at: string;
  /** ISO timestamp when record was created */
  created_at: string;
  /** Number of exercises in this workout */
  exercise_count: number;
}

/**
 * History mode for exercise queries.
 */
export type ExerciseHistoryMode = 'date' | 'session';

/**
 * Options for getExerciseHistory.
 */
export interface ExerciseHistoryOptions {
  /** Grouping mode: 'date' groups by calendar date, 'session' groups by workout */
  mode?: ExerciseHistoryMode;
  /** Maximum number of records to return */
  limit?: number;
}

/**
 * Exercise history data grouped by date.
 */
export interface ExerciseHistoryDateData {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Total sets completed on this date */
  total_sets: number;
  /** Maximum weight used on this date */
  max_weight: number;
  /** Maximum volume in a single set (weight x reps) */
  max_volume_set: number;
}

/**
 * Exercise history data grouped by session.
 */
export interface ExerciseHistorySessionData {
  /** Workout UUID */
  workout_id: string;
  /** ISO timestamp when workout started */
  started_at: string;
  /** Session number (reverse chronological) */
  session_number: number;
  /** Total sets completed in this session */
  total_sets: number;
  /** Maximum weight used in this session */
  max_weight: number;
  /** Maximum volume in a single set (weight x reps) */
  max_volume_set: number;
}

/**
 * Union type for exercise history data.
 * Type depends on the mode option.
 */
export type ExerciseHistoryData = ExerciseHistoryDateData | ExerciseHistorySessionData;

/**
 * Metric type for exercise charts.
 */
export type ExerciseMetricType = 'total_sets' | 'max_volume_set';

/**
 * Options for getExerciseMetrics.
 */
export interface ExerciseMetricsOptions {
  /** Metric to calculate: 'total_sets' or 'max_volume_set' */
  metric?: ExerciseMetricType;
  /** Grouping mode: 'date' or 'session' */
  mode?: ExerciseHistoryMode;
  /** Maximum number of data points */
  limit?: number;
}

/**
 * Chart-friendly data format.
 * Contains parallel arrays of labels and values.
 */
export interface ChartData {
  /** X-axis labels (dates or session numbers) */
  labels: string[];
  /** Y-axis values (metric values) */
  values: number[];
}

/**
 * Recent exercise data for pre-filling defaults.
 * Contains the most recent workout data for an exercise.
 */
export interface RecentExerciseData {
  /** Number of sets completed */
  sets: number;
  /** Repetitions from the first set */
  reps: number;
  /** Weight from the first set */
  weight: number;
  /** Rest time between sets */
  rest_seconds: number;
}

/**
 * Summary data for workout history list item.
 * Extended from WorkoutLogSummary with additional computed fields.
 */
export interface WorkoutHistoryItem {
  /** Workout log UUID */
  id: string;
  /** Source template UUID (null for ad-hoc workouts) */
  template_id: string | null;
  /** Template name (null if template was deleted or ad-hoc) */
  template_name: string | null;
  /** ISO timestamp when workout started */
  started_at: string;
  /** Number of exercises in this workout */
  exercise_count: number;
  /** Number of completed sets across all exercises */
  completed_sets: number;
  /** Total volume in lbs (SUM of weight * reps for completed sets) */
  total_volume: number;
}

/**
 * Paginated result wrapper for list endpoints.
 */
export interface PaginatedResult<T> {
  /** Array of items for current page */
  data: T[];
  /** Whether more items exist beyond this page */
  hasMore: boolean;
}

/**
 * All-time workout summary statistics.
 */
export interface WorkoutSummaryStats {
  /** Total number of logged workouts */
  totalWorkouts: number;
  /** Total completed sets across all workouts */
  totalSets: number;
  /** Total volume in lbs across all workouts */
  totalVolume: number;
}

/**
 * Logging service interface.
 * Provides workout logging, exercise history, and metrics calculation.
 */
export interface LoggingService {
  /**
   * Create a new workout log with exercises.
   *
   * @param data - Workout data including exercises and sets
   * @returns Promise resolving to the created workout log or error
   */
  createWorkoutLog(data: WorkoutLogInput): Promise<ServiceResult<WorkoutLog>>;

  /**
   * Get workout logs for the current user.
   *
   * @param limit - Maximum number of logs to fetch (default 52)
   * @returns Promise resolving to workout log summaries or error
   */
  getWorkoutLogs(limit?: number): Promise<ServiceResult<WorkoutLogSummary[]>>;

  /**
   * Get detailed workout log with all exercises.
   *
   * @param id - Workout log UUID
   * @returns Promise resolving to the workout log with exercises or error
   */
  getWorkoutLog(id: string): Promise<ServiceResult<WorkoutLogWithExercises>>;

  /**
   * Get exercise history for charting.
   *
   * @param exerciseId - Exercise UUID
   * @param options - History options (mode, limit)
   * @returns Promise resolving to history data or error
   */
  getExerciseHistory(
    exerciseId: string,
    options?: ExerciseHistoryOptions
  ): Promise<ServiceResult<ExerciseHistoryData[]>>;

  /**
   * Calculate exercise metrics for charting.
   *
   * @param exerciseId - Exercise UUID
   * @param options - Metrics options (metric, mode, limit)
   * @returns Promise resolving to chart data or error
   */
  getExerciseMetrics(
    exerciseId: string,
    options?: ExerciseMetricsOptions
  ): Promise<ServiceResult<ChartData>>;

  /**
   * Get recent workout data for an exercise.
   * Used for pre-filling default values.
   *
   * @param exerciseId - Exercise UUID
   * @returns Promise resolving to recent data or null if none exists
   */
  getRecentExerciseData(exerciseId: string): Promise<RecentExerciseData | null>;

  /**
   * Get paginated workout history for list view.
   *
   * @param offset - Number of items to skip
   * @param limit - Number of items to return
   * @returns Promise resolving to paginated history items or error
   */
  getWorkoutLogsPaginated(
    offset: number,
    limit: number
  ): Promise<ServiceResult<PaginatedResult<WorkoutHistoryItem>>>;

  /**
   * Get all-time workout summary statistics.
   *
   * @returns Promise resolving to summary stats or error
   */
  getWorkoutSummaryStats(): Promise<ServiceResult<WorkoutSummaryStats>>;
}

// ============================================================================
// Charts Service Types
// ============================================================================

/**
 * User chart configuration data.
 * Returned by getUserCharts() with joined exercise info.
 */
export interface UserChartData {
  /** Chart UUID */
  id: string;
  /** User UUID */
  user_id: string;
  /** Exercise UUID */
  exercise_id: string;
  /** Metric type for the chart */
  metric_type: 'total_sets' | 'max_volume_set';
  /** X-axis grouping mode */
  x_axis_mode: 'date' | 'session';
  /** Display order */
  order: number;
  /** ISO timestamp when created */
  created_at: string;
  /** Joined exercise data */
  exercises: {
    id: string;
    name: string;
    category: string;
  };
}

/**
 * Input data for creating a chart.
 */
export interface CreateChartInput {
  /** Exercise UUID */
  exercise_id: string;
  /** Metric type for the chart */
  metric_type: string;
  /** X-axis grouping mode */
  x_axis_mode: string;
}

/**
 * Options for rendering a chart.
 */
export interface RenderChartOptions {
  /** Metric type for y-axis label */
  metricType: string;
  /** Exercise name for chart title */
  exerciseName: string;
}

/**
 * Charts service interface.
 * Provides chart CRUD operations and Chart.js rendering.
 */
export interface ChartsService {
  /**
   * Get all charts for the current user.
   *
   * @returns Promise resolving to user charts or error
   */
  getUserCharts(): Promise<ServiceResult<UserChartData[]>>;

  /**
   * Create a new chart.
   *
   * @param chartData - Chart configuration data
   * @returns Promise resolving to created chart or error
   */
  createChart(chartData: CreateChartInput): Promise<ServiceResult<UserChartData>>;

  /**
   * Delete a chart by ID.
   *
   * @param id - Chart UUID
   * @returns Promise resolving to error status
   */
  deleteChart(id: string): Promise<ServiceError>;

  /**
   * Reorder charts based on array position.
   *
   * @param chartIds - Array of chart UUIDs in desired order
   * @returns Promise resolving to error status
   */
  reorderCharts(chartIds: string[]): Promise<ServiceError>;

  /**
   * Render a Chart.js line chart.
   *
   * @param canvasId - ID of the canvas element
   * @param chartData - Chart data with labels and values
   * @param options - Rendering options
   * @returns Promise resolving to Chart.js instance or null if error
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderChart(canvasId: string, chartData: ChartData, options: RenderChartOptions): Promise<any>;

  /**
   * Destroy a Chart.js instance.
   *
   * @param chartInstance - The Chart.js instance to destroy
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  destroyChart(chartInstance: any): void;

  /**
   * Get display name for metric type.
   *
   * @param metricType - Metric type string
   * @returns Display name
   */
  getMetricDisplayName(metricType: string): string;

  /**
   * Get display name for x-axis mode.
   *
   * @param mode - X-axis mode string
   * @returns Display name
   */
  getModeDisplayName(mode: string): string;
}
