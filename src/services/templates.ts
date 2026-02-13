/**
 * Templates Service Module
 *
 * TypeScript implementation of the TemplatesService interface.
 * Provides CRUD operations for workout templates with nested exercises and sets.
 *
 * This module migrates js/templates.js to TypeScript with full type safety.
 */

import type {
  TemplatesService,
  ServiceResult,
  ServiceError,
  TemplateExerciseInput,
  TemplateExerciseDefaults,
} from '@/types/services';

import type {
  Template,
  TemplateExercise,
  TemplateWithExercises,
  TemplateExerciseWithSets,
  TemplateSetData,
  ExerciseCategory,
} from '@/types/database';

import { supabase } from '@/lib/supabase';

/**
 * Raw exercise data from Supabase nested query.
 * Supabase returns this as a single object for foreign key relations.
 */
interface RawExerciseData {
  id: string;
  name: string;
  category: string;
}

/**
 * Raw template exercise set from Supabase query.
 */
interface RawTemplateExerciseSet {
  set_number: number;
  weight: number;
  reps: number;
}

/**
 * Raw template exercise from Supabase query with nested data.
 * Used internally for type-safe transformation.
 */
interface RawTemplateExercise {
  id: string;
  exercise_id: string;
  default_rest_seconds: number;
  order: number;
  exercises: RawExerciseData | null;
  template_exercise_sets: RawTemplateExerciseSet[];
}

/**
 * Raw template from Supabase query with nested data.
 * Used internally for type-safe transformation.
 */
interface RawTemplate {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  template_exercises: RawTemplateExercise[];
}

/**
 * Transform raw template data from Supabase to TemplateWithExercises format.
 *
 * @param template - Raw template data from Supabase query
 * @returns Transformed template with exercises and sets
 */
function transformTemplate(template: RawTemplate): TemplateWithExercises {
  // Filter out deleted exercises (where FK join returns null) and sort by order
  const sortedTemplateExercises = (template.template_exercises || [])
    .filter((te) => te.exercises !== null)
    .sort((a, b) => a.order - b.order);

  // Transform to the format expected by the app
  const exercises: TemplateExerciseWithSets[] = sortedTemplateExercises.map((te) => {
    // Sort sets by set_number
    const sortedSets = (te.template_exercise_sets || []).sort(
      (a, b) => a.set_number - b.set_number
    );

    const sets: TemplateSetData[] = sortedSets.map((set) => ({
      set_number: set.set_number,
      weight: set.weight,
      reps: set.reps,
    }));

    // Cast category string to ExerciseCategory (validated by database constraints)
    const category = (te.exercises?.category || 'Core') as ExerciseCategory;

    return {
      exercise_id: te.exercise_id,
      name: te.exercises?.name || 'Unknown Exercise',
      category,
      default_rest_seconds: te.default_rest_seconds,
      sets,
    };
  });

  return {
    id: template.id,
    name: template.name,
    created_at: template.created_at,
    updated_at: template.updated_at,
    exercises,
  };
}

/**
 * Get all templates for the current user.
 *
 * @returns Promise resolving to templates with exercises or error
 */
async function getTemplates(): Promise<ServiceResult<TemplateWithExercises[]>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get templates with their exercises and sets
    const { data, error } = await supabase
      .from('templates')
      .select(
        `
        id,
        name,
        created_at,
        updated_at,
        template_exercises(
          id,
          exercise_id,
          default_rest_seconds,
          order,
          exercises(
            id,
            name,
            category
          ),
          template_exercise_sets(
            set_number,
            weight,
            reps
          )
        )
      `
      )
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    // Transform data to include exercises array with sets
    // Cast through unknown to handle Supabase's complex nested query return type
    const templatesWithExercises = (data as unknown as RawTemplate[]).map(transformTemplate);

    return { data: templatesWithExercises, error: null };
  } catch (err) {
    console.error('Get templates error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get a single template by ID with its exercises.
 *
 * @param id - Template UUID
 * @returns Promise resolving to the template with exercises or error
 */
async function getTemplate(id: string): Promise<ServiceResult<TemplateWithExercises>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get template with its exercises and sets
    const { data, error } = await supabase
      .from('templates')
      .select(
        `
        id,
        name,
        created_at,
        updated_at,
        template_exercises(
          id,
          exercise_id,
          default_rest_seconds,
          order,
          exercises(
            id,
            name,
            category
          ),
          template_exercise_sets(
            set_number,
            weight,
            reps
          )
        )
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Transform to TemplateWithExercises format
    // Cast through unknown to handle Supabase's complex nested query return type
    const templateWithExercises = transformTemplate(data as unknown as RawTemplate);

    return { data: templateWithExercises, error: null };
  } catch (err) {
    console.error('Get template error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Create a new template.
 *
 * @param name - Template display name
 * @param exercises - Optional array of exercises with defaults
 * @returns Promise resolving to the created template or error
 */
async function createTemplate(
  name: string,
  exercises: TemplateExerciseInput[] = []
): Promise<ServiceResult<Template>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Create the template first
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name: name,
      })
      .select()
      .single();

    if (templateError) {
      return { data: null, error: templateError };
    }

    // If exercises are provided, insert them with their sets
    if (exercises && exercises.length > 0) {
      const templateExercises = exercises.map((exercise, index) => ({
        template_id: template.id,
        exercise_id: exercise.exercise_id,
        default_rest_seconds: exercise.default_rest_seconds ?? 90,
        order: index,
      }));

      const { data: insertedExercises, error: exercisesError } = await supabase
        .from('template_exercises')
        .insert(templateExercises)
        .select('id');

      if (exercisesError) {
        // Rollback: delete the template if exercises insertion fails
        await supabase.from('templates').delete().eq('id', template.id);

        return { data: null, error: exercisesError };
      }

      // Insert sets for each exercise
      const allSets: Array<{
        template_exercise_id: string;
        set_number: number;
        weight: number;
        reps: number;
      }> = [];

      exercises.forEach((exercise, index) => {
        const templateExerciseId = insertedExercises[index].id;
        const sets = exercise.sets || [];

        sets.forEach((set) => {
          allSets.push({
            template_exercise_id: templateExerciseId,
            set_number: set.set_number,
            weight: set.weight ?? 0,
            reps: set.reps ?? 10,
          });
        });
      });

      if (allSets.length > 0) {
        const { error: setsError } = await supabase
          .from('template_exercise_sets')
          .insert(allSets);

        if (setsError) {
          // Rollback: delete the template if sets insertion fails
          await supabase.from('templates').delete().eq('id', template.id);

          return { data: null, error: setsError };
        }
      }
    }

    return { data: template as Template, error: null };
  } catch (err) {
    console.error('Create template error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update an existing template.
 * Replaces all exercises with the provided list.
 *
 * @param id - Template UUID
 * @param name - New template name
 * @param exercises - Optional array of exercises with defaults
 * @returns Promise resolving to the updated template or error
 */
async function updateTemplate(
  id: string,
  name: string,
  exercises: TemplateExerciseInput[] = []
): Promise<ServiceResult<Template>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Update template name
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .update({
        name: name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (templateError) {
      return { data: null, error: templateError };
    }

    // Delete existing template_exercises (cascades to delete sets)
    const { error: deleteError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', id);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    // Insert new template_exercises with sets if provided
    if (exercises && exercises.length > 0) {
      const templateExercises = exercises.map((exercise, index) => ({
        template_id: id,
        exercise_id: exercise.exercise_id,
        default_rest_seconds: exercise.default_rest_seconds ?? 90,
        order: index,
      }));

      const { data: insertedExercises, error: exercisesError } = await supabase
        .from('template_exercises')
        .insert(templateExercises)
        .select('id');

      if (exercisesError) {
        return { data: null, error: exercisesError };
      }

      // Insert sets for each exercise
      const allSets: Array<{
        template_exercise_id: string;
        set_number: number;
        weight: number;
        reps: number;
      }> = [];

      exercises.forEach((exercise, index) => {
        const templateExerciseId = insertedExercises[index].id;
        const sets = exercise.sets || [];

        sets.forEach((set) => {
          allSets.push({
            template_exercise_id: templateExerciseId,
            set_number: set.set_number,
            weight: set.weight ?? 0,
            reps: set.reps ?? 10,
          });
        });
      });

      if (allSets.length > 0) {
        const { error: setsError } = await supabase
          .from('template_exercise_sets')
          .insert(allSets);

        if (setsError) {
          return { data: null, error: setsError };
        }
      }
    }

    return { data: template as Template, error: null };
  } catch (err) {
    console.error('Update template error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Delete a template.
 *
 * @param id - Template UUID
 * @returns Promise resolving to error status
 */
async function deleteTemplate(id: string): Promise<ServiceError> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { error: userError };
    }

    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    return { error: error ?? null };
  } catch (err) {
    console.error('Delete template error:', err);
    return {
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Add an exercise to a template.
 * Appends to the end of the exercise list with 3 default sets.
 *
 * @param templateId - Template UUID
 * @param exercise - Exercise input data
 * @returns Promise resolving to the created template exercise or error
 */
async function addExerciseToTemplate(
  templateId: string,
  exercise: TemplateExerciseInput
): Promise<ServiceResult<TemplateExercise>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get current max order for this template
    const { data: existingExercises, error: fetchError } = await supabase
      .from('template_exercises')
      .select('order')
      .eq('template_id', templateId)
      .order('order', { ascending: false })
      .limit(1);

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    const maxOrder =
      existingExercises && existingExercises.length > 0 ? existingExercises[0].order : -1;

    // Insert new template_exercise
    const { data, error } = await supabase
      .from('template_exercises')
      .insert({
        template_id: templateId,
        exercise_id: exercise.exercise_id,
        default_rest_seconds: exercise.default_rest_seconds ?? 90,
        order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Insert 3 default sets for the exercise
    const defaultSets = [
      { template_exercise_id: data.id, set_number: 1, weight: 0, reps: 10 },
      { template_exercise_id: data.id, set_number: 2, weight: 0, reps: 10 },
      { template_exercise_id: data.id, set_number: 3, weight: 0, reps: 10 },
    ];

    const { error: setsError } = await supabase
      .from('template_exercise_sets')
      .insert(defaultSets);

    if (setsError) {
      // Rollback: delete the template_exercise if sets insertion fails
      await supabase.from('template_exercises').delete().eq('id', data.id);

      return { data: null, error: setsError };
    }

    // Update template's updated_at timestamp
    await supabase
      .from('templates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', templateId);

    return { data: data as TemplateExercise, error: null };
  } catch (err) {
    console.error('Add exercise to template error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Remove an exercise from a template.
 *
 * @param templateId - Template UUID
 * @param exerciseId - Exercise UUID
 * @returns Promise resolving to error status
 */
async function removeExerciseFromTemplate(
  templateId: string,
  exerciseId: string
): Promise<ServiceError> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { error: userError };
    }

    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', templateId)
      .eq('exercise_id', exerciseId);

    if (error) {
      return { error };
    }

    // Update template's updated_at timestamp
    await supabase
      .from('templates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', templateId);

    return { error: null };
  } catch (err) {
    console.error('Remove exercise from template error:', err);
    return {
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update exercise defaults in a template.
 *
 * @param templateId - Template UUID
 * @param exerciseId - Exercise UUID
 * @param defaults - New default values
 * @returns Promise resolving to the updated template exercise or error
 */
async function updateTemplateExercise(
  templateId: string,
  exerciseId: string,
  defaults: TemplateExerciseDefaults
): Promise<ServiceResult<TemplateExercise>> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const updateData: { default_rest_seconds?: number } = {};
    // Only default_rest_seconds is stored at exercise level (normalized schema)
    if (defaults.default_rest_seconds !== undefined) {
      updateData.default_rest_seconds = defaults.default_rest_seconds;
    }

    const { data, error } = await supabase
      .from('template_exercises')
      .update(updateData)
      .eq('template_id', templateId)
      .eq('exercise_id', exerciseId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Update template's updated_at timestamp
    await supabase
      .from('templates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', templateId);

    return { data: data as TemplateExercise, error: null };
  } catch (err) {
    console.error('Update template exercise error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Templates service object implementing the TemplatesService interface.
 * Provides all template CRUD operations.
 */
export const templates: TemplatesService = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  updateTemplateExercise,
};
