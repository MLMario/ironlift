/**
 * Database Type Definitions for Supabase
 *
 * This module provides TypeScript type definitions for all database tables,
 * enabling compile-time type safety for database operations.
 */

// ============================================================================
// Enum/Union Types
// ============================================================================

/**
 * Valid exercise categories.
 * Matches the predefined categories in the exercises service.
 */
export type ExerciseCategory =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Legs'
  | 'Arms'
  | 'Core'
  | 'Other';

// ============================================================================
// Row Types (SELECT results)
// ============================================================================

/**
 * Exercise table row.
 * Represents a single exercise in the library.
 *
 * @property id - Unique identifier (UUID)
 * @property user_id - Owner's user ID (null for system exercises)
 * @property name - Display name of the exercise
 * @property category - Exercise muscle group category
 * @property equipment - Optional equipment needed (e.g., "Barbell", "Dumbbell")
 * @property instructions - Step-by-step exercise instructions (system exercises only)
 * @property level - Difficulty level: beginner, intermediate, or expert
 * @property force - Force type: push, pull, or static
 * @property mechanic - Movement type: compound or isolation
 * @property is_system - Whether this is a pre-created system exercise
 */
export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  category: ExerciseCategory;
  equipment: string | null;
  instructions: string[] | null;
  level: 'beginner' | 'intermediate' | 'expert' | null;
  force: 'push' | 'pull' | 'static' | null;
  mechanic: 'compound' | 'isolation' | null;
  is_system: boolean;
}

/**
 * Template table row.
 * Represents a reusable workout template.
 *
 * @property id - Unique identifier (UUID)
 * @property user_id - Owner's user ID
 * @property name - Template display name
 * @property created_at - ISO timestamp of creation
 * @property updated_at - ISO timestamp of last modification
 */
export interface Template {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Template exercise junction table row.
 * Links exercises to templates with ordering and defaults.
 *
 * @property id - Unique identifier (UUID)
 * @property template_id - Parent template ID
 * @property exercise_id - Referenced exercise ID
 * @property default_rest_seconds - Default rest time between sets
 * @property order - Position in the template exercise list
 */
export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  default_rest_seconds: number;
  order: number;
}

/**
 * Template exercise set table row.
 * Defines default set configurations for template exercises.
 *
 * @property template_exercise_id - Parent template exercise ID
 * @property set_number - Set position (1-based)
 * @property weight - Default weight value
 * @property reps - Default repetition count
 */
export interface TemplateExerciseSet {
  template_exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
}

/**
 * Workout log table row.
 * Represents a completed or in-progress workout session.
 *
 * @property id - Unique identifier (UUID)
 * @property user_id - Owner's user ID
 * @property template_id - Source template ID (null for ad-hoc workouts)
 * @property started_at - ISO timestamp when workout began
 * @property created_at - ISO timestamp when record was created
 */
export interface WorkoutLog {
  id: string;
  user_id: string;
  template_id: string | null;
  started_at: string;
  created_at: string;
}

/**
 * Workout log exercise table row.
 * Records an exercise performed during a workout.
 *
 * @property id - Unique identifier (UUID)
 * @property workout_log_id - Parent workout log ID
 * @property exercise_id - Referenced exercise ID
 * @property rest_seconds - Rest time used between sets
 * @property order - Position in the workout exercise list
 */
export interface WorkoutLogExercise {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  rest_seconds: number;
  order: number;
}

/**
 * Workout log set table row.
 * Records an individual set performed during a workout.
 *
 * @property id - Unique identifier (UUID)
 * @property workout_log_exercise_id - Parent workout log exercise ID
 * @property set_number - Set position (1-based)
 * @property weight - Weight used for this set
 * @property reps - Repetitions completed
 * @property is_done - Whether the set was completed
 */
export interface WorkoutLogSet {
  id: string;
  workout_log_exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_done: boolean;
}

// ============================================================================
// Insert Types (CREATE operations - omit auto-generated fields)
// ============================================================================

/**
 * Data required to insert a new exercise.
 * Omits the auto-generated id field.
 */
export type ExerciseInsert = Omit<Exercise, 'id'>;

/**
 * Data required to insert a new template.
 * Omits auto-generated id, created_at, and updated_at fields.
 */
export type TemplateInsert = Omit<Template, 'id' | 'created_at' | 'updated_at'>;

/**
 * Data required to insert a new template exercise.
 * Omits the auto-generated id field.
 */
export type TemplateExerciseInsert = Omit<TemplateExercise, 'id'>;

/**
 * Data required to insert a new template exercise set.
 * All fields are required as there's no auto-generated id.
 */
export type TemplateExerciseSetInsert = TemplateExerciseSet;

/**
 * Data required to insert a new workout log.
 * Omits the auto-generated id field.
 */
export type WorkoutLogInsert = Omit<WorkoutLog, 'id'>;

/**
 * Data required to insert a new workout log exercise.
 * Omits the auto-generated id field.
 */
export type WorkoutLogExerciseInsert = Omit<WorkoutLogExercise, 'id'>;

/**
 * Data required to insert a new workout log set.
 * Omits the auto-generated id field.
 */
export type WorkoutLogSetInsert = Omit<WorkoutLogSet, 'id'>;

// ============================================================================
// Update Types (UPDATE operations - partial of insertable fields)
// ============================================================================

/**
 * Data allowed when updating an exercise.
 * All insertable fields are optional.
 */
export type ExerciseUpdate = Partial<ExerciseInsert>;

/**
 * Data allowed when updating a template.
 * All insertable fields are optional.
 */
export type TemplateUpdate = Partial<TemplateInsert>;

/**
 * Data allowed when updating a template exercise.
 * All insertable fields are optional.
 */
export type TemplateExerciseUpdate = Partial<TemplateExerciseInsert>;

/**
 * Data allowed when updating a template exercise set.
 * All fields are optional.
 */
export type TemplateExerciseSetUpdate = Partial<TemplateExerciseSetInsert>;

/**
 * Data allowed when updating a workout log.
 * All insertable fields are optional.
 */
export type WorkoutLogUpdate = Partial<WorkoutLogInsert>;

/**
 * Data allowed when updating a workout log exercise.
 * All insertable fields are optional.
 */
export type WorkoutLogExerciseUpdate = Partial<WorkoutLogExerciseInsert>;

/**
 * Data allowed when updating a workout log set.
 * All insertable fields are optional.
 */
export type WorkoutLogSetUpdate = Partial<WorkoutLogSetInsert>;

// ============================================================================
// Joined/Nested Types (complex queries with relations)
// ============================================================================

/**
 * Set data within a template exercise context.
 * Used in nested template queries.
 */
export interface TemplateSetData {
  set_number: number;
  weight: number;
  reps: number;
}

/**
 * Exercise data with its sets within a template context.
 * Includes exercise details and configured sets.
 */
export interface TemplateExerciseWithSets {
  exercise_id: string;
  name: string;
  category: ExerciseCategory;
  default_rest_seconds: number;
  sets: TemplateSetData[];
}

/**
 * Template with all its exercises and their sets.
 * Result type for getTemplates() and getTemplate() queries.
 */
export interface TemplateWithExercises extends Omit<Template, 'user_id'> {
  exercises: TemplateExerciseWithSets[];
}

/**
 * Set data within a workout log exercise context.
 * Used in nested workout log queries.
 */
export interface WorkoutLogSetData {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_done: boolean;
}

/**
 * Exercise details embedded in workout log queries.
 * Minimal exercise info for display purposes.
 */
export interface WorkoutLogExerciseDetails {
  id: string;
  name: string;
  category: ExerciseCategory;
}

/**
 * Workout log exercise with its sets and exercise details.
 * Used in nested workout log queries.
 */
export interface WorkoutLogExerciseWithSets {
  id: string;
  exercise_id: string;
  rest_seconds: number;
  order: number;
  exercises: WorkoutLogExerciseDetails;
  workout_log_sets: WorkoutLogSetData[];
}

/**
 * Workout log with all its exercises and their sets.
 * Result type for getWorkoutLog() query.
 */
export interface WorkoutLogWithExercises extends Omit<WorkoutLog, 'user_id'> {
  template_name?: string | null;
  workout_log_exercises: WorkoutLogExerciseWithSets[];
}
