import { templates, updateTemplateExerciseSetValues } from '@/services/templates';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Mock Helpers
// ============================================================================

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = jest.fn();

/**
 * Proxy that mimics a Supabase query builder chain.
 * Every property access returns a jest.fn() -> new child Proxy (enables chaining).
 * `.then` resolves to `result` (makes `await` yield the result).
 */
function mockQueryResult(result: Record<string, unknown>) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === 'then') return (resolve: (v: any) => void) => resolve(result);
      return jest.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

/**
 * Like mockQueryResult but captures the argument passed to `insert()`.
 */
function mockInsertCapture(result: Record<string, unknown>) {
  let captured: unknown;
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === 'then') return (resolve: (v: any) => void) => resolve(result);
      if (prop === 'insert') {
        return (data: unknown) => {
          captured = data;
          return new Proxy({}, handler);
        };
      }
      return jest.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return { proxy: new Proxy({}, handler), getCaptured: () => captured };
}

// ============================================================================
// Factory Helpers
// ============================================================================

function makeUser(overrides?: Record<string, unknown>) {
  return { id: 'user-1', ...overrides };
}

interface RawExerciseData {
  id: string;
  name: string;
  category: string;
}

interface RawTemplateExerciseSet {
  set_number: number;
  weight: number;
  reps: number;
}

interface RawTemplateExercise {
  id: string;
  exercise_id: string;
  default_rest_seconds: number;
  order: number;
  exercises: RawExerciseData | null;
  template_exercise_sets: RawTemplateExerciseSet[];
}

interface RawTemplate {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  template_exercises: RawTemplateExercise[];
}

function makeRawTemplate(overrides?: Partial<RawTemplate>): RawTemplate {
  return {
    id: 'tmpl-1',
    name: 'Push Day',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    template_exercises: [],
    ...overrides,
  };
}

function makeRawTemplateExercise(overrides?: Partial<RawTemplateExercise>): RawTemplateExercise {
  return {
    id: 'te-1',
    exercise_id: 'ex-1',
    default_rest_seconds: 90,
    order: 0,
    exercises: { id: 'ex-1', name: 'Bench Press', category: 'Chest' },
    template_exercise_sets: [],
    ...overrides,
  };
}

// ============================================================================
// Setup / Teardown
// ============================================================================

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth as any).getUser = mockGetUser;
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ============================================================================
// getTemplates
// ============================================================================

describe('getTemplates', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.getTemplates();

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.getTemplates();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('User not authenticated');
  });

  it('returns transformed templates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    const raw = makeRawTemplate({
      template_exercises: [
        makeRawTemplateExercise({
          order: 1,
          exercises: { id: 'ex-2', name: 'Squat', category: 'Legs' },
          template_exercise_sets: [
            { set_number: 2, weight: 100, reps: 8 },
            { set_number: 1, weight: 100, reps: 10 },
          ],
        }),
        makeRawTemplateExercise({
          id: 'te-0',
          order: 0,
          exercises: { id: 'ex-1', name: 'Bench Press', category: 'Chest' },
          template_exercise_sets: [{ set_number: 1, weight: 80, reps: 12 }],
        }),
      ],
    });

    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [raw], error: null }));

    const result = await templates.getTemplates();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    const tmpl = result.data![0];
    // Exercises sorted by order
    expect(tmpl.exercises[0].name).toBe('Bench Press');
    expect(tmpl.exercises[1].name).toBe('Squat');
    // Sets sorted by set_number
    expect(tmpl.exercises[1].sets[0].set_number).toBe(1);
    expect(tmpl.exercises[1].sets[1].set_number).toBe(2);
  });

  it('filters out exercises with null FK join (deleted exercises)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    const raw = makeRawTemplate({
      template_exercises: [
        makeRawTemplateExercise({ exercises: null }),
        makeRawTemplateExercise({
          id: 'te-2',
          exercise_id: 'ex-2',
          exercises: { id: 'ex-2', name: 'Squat', category: 'Legs' },
        }),
      ],
    });

    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [raw], error: null }));

    const result = await templates.getTemplates();

    expect(result.data![0].exercises).toHaveLength(1);
    expect(result.data![0].exercises[0].name).toBe('Squat');
  });

  it('defaults category to Core when exercises FK is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    // exercises is NOT null but has null category
    const raw = makeRawTemplate({
      template_exercises: [
        makeRawTemplateExercise({
          exercises: { id: 'ex-1', name: 'Bench Press', category: '' },
        }),
      ],
    });

    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [raw], error: null }));

    const result = await templates.getTemplates();

    // Empty string is falsy → defaults to 'Core'
    expect(result.data![0].exercises[0].category).toBe('Core');
  });

  it('defaults name to Unknown Exercise when exercises name is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    const raw = makeRawTemplate({
      template_exercises: [
        makeRawTemplateExercise({
          exercises: { id: 'ex-1', name: '', category: 'Chest' },
        }),
      ],
    });

    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [raw], error: null }));

    const result = await templates.getTemplates();

    expect(result.data![0].exercises[0].name).toBe('Unknown Exercise');
  });

  it('handles empty template_exercises array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    const raw = makeRawTemplate({ template_exercises: [] });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [raw], error: null }));

    const result = await templates.getTemplates();

    expect(result.data![0].exercises).toEqual([]);
  });

  it('handles null/undefined template_exercises', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    const raw = makeRawTemplate({ template_exercises: null as any });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [raw], error: null }));

    const result = await templates.getTemplates();

    expect(result.data![0].exercises).toEqual([]);
  });

  it('returns Supabase query error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    const dbError = new Error('DB error');
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: dbError }));

    const result = await templates.getTemplates();

    expect(result).toEqual({ data: null, error: dbError });
  });

  it('catches unexpected exception and wraps non-Error', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'string error';
    });

    const result = await templates.getTemplates();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });
});

// ============================================================================
// getTemplate
// ============================================================================

describe('getTemplate', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.getTemplate('tmpl-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.getTemplate('tmpl-1');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('User not authenticated');
  });

  it('returns single transformed template on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    const raw = makeRawTemplate({
      template_exercises: [
        makeRawTemplateExercise({
          template_exercise_sets: [{ set_number: 1, weight: 100, reps: 10 }],
        }),
      ],
    });

    mockFrom.mockReturnValueOnce(mockQueryResult({ data: raw, error: null }));

    const result = await templates.getTemplate('tmpl-1');

    expect(result.error).toBeNull();
    expect(result.data!.id).toBe('tmpl-1');
    expect(result.data!.exercises).toHaveLength(1);
    expect(result.data!.exercises[0].sets).toHaveLength(1);
  });

  it('returns Supabase query error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    const dbError = new Error('Not found');
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: dbError }));

    const result = await templates.getTemplate('tmpl-1');

    expect(result).toEqual({ data: null, error: dbError });
  });

  it('catches unexpected exception', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await templates.getTemplate('tmpl-1');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// createTemplate
// ============================================================================

describe('createTemplate', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.createTemplate('Push Day');

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.createTemplate('Push Day');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('User not authenticated');
  });

  it('creates template with no exercises', async () => {
    const template = { id: 'tmpl-1', name: 'Push Day', user_id: 'user-1' };
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));

    const result = await templates.createTemplate('Push Day');

    expect(result).toEqual({ data: template, error: null });
    // Only 1 from() call for template insert, no exercises
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom.mock.calls[0][0]).toBe('templates');
  });

  it('creates template with exercises and sets, verifying insert data', async () => {
    const template = { id: 'tmpl-1', name: 'Push Day', user_id: 'user-1' };
    const insertedExercises = [{ id: 'te-1' }];

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. exercises insert — capture
    const { proxy: exProxy, getCaptured: getExCaptured } = mockInsertCapture({
      data: insertedExercises,
      error: null,
    });
    mockFrom.mockReturnValueOnce(exProxy);
    // 3. sets insert — capture
    const { proxy: setsProxy, getCaptured: getSetsCaptured } = mockInsertCapture({
      error: null,
    });
    mockFrom.mockReturnValueOnce(setsProxy);

    const result = await templates.createTemplate('Push Day', [
      {
        exercise_id: 'ex-1',
        default_rest_seconds: 120,
        sets: [
          { set_number: 1, weight: 100, reps: 8 },
          { set_number: 2, weight: 110, reps: 6 },
        ],
      },
    ]);

    expect(result).toEqual({ data: template, error: null });

    // Verify exercise insert data
    const exInserted = getExCaptured() as any[];
    expect(exInserted).toHaveLength(1);
    expect(exInserted[0].template_id).toBe('tmpl-1');
    expect(exInserted[0].exercise_id).toBe('ex-1');
    expect(exInserted[0].default_rest_seconds).toBe(120);
    expect(exInserted[0].order).toBe(0);

    // Verify sets insert data
    const setsInserted = getSetsCaptured() as any[];
    expect(setsInserted).toHaveLength(2);
    expect(setsInserted[0].template_exercise_id).toBe('te-1');
    expect(setsInserted[0].weight).toBe(100);
    expect(setsInserted[1].reps).toBe(6);
  });

  it('applies defaults: default_rest_seconds=90, weight=0, reps=10', async () => {
    const template = { id: 'tmpl-1', name: 'Push Day', user_id: 'user-1' };
    const insertedExercises = [{ id: 'te-1' }];

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. exercises insert — capture
    const { proxy: exProxy, getCaptured: getExCaptured } = mockInsertCapture({
      data: insertedExercises,
      error: null,
    });
    mockFrom.mockReturnValueOnce(exProxy);
    // 3. sets insert — capture
    const { proxy: setsProxy, getCaptured: getSetsCaptured } = mockInsertCapture({
      error: null,
    });
    mockFrom.mockReturnValueOnce(setsProxy);

    await templates.createTemplate('Push Day', [
      {
        exercise_id: 'ex-1',
        // no default_rest_seconds → should default to 90
        sets: [
          { set_number: 1 },
          // no weight → 0, no reps → 10
        ],
      },
    ]);

    const exInserted = getExCaptured() as any[];
    expect(exInserted[0].default_rest_seconds).toBe(90);

    const setsInserted = getSetsCaptured() as any[];
    expect(setsInserted[0].weight).toBe(0);
    expect(setsInserted[0].reps).toBe(10);
  });

  it('rolls back template on exercise insert failure', async () => {
    const template = { id: 'tmpl-1', name: 'Push Day', user_id: 'user-1' };
    const exError = new Error('Exercise insert failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template insert → success
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. exercise insert → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: exError }));
    // 3. rollback: template delete
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.createTemplate('Push Day', [
      { exercise_id: 'ex-1', sets: [] },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toBe(exError);
    // Third from() call is the rollback delete
    expect(mockFrom).toHaveBeenCalledTimes(3);
    expect(mockFrom.mock.calls[2][0]).toBe('templates');
  });

  it('rolls back template on sets insert failure', async () => {
    const template = { id: 'tmpl-1', name: 'Push Day', user_id: 'user-1' };
    const insertedExercises = [{ id: 'te-1' }];
    const setsError = new Error('Sets insert failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. exercises insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: insertedExercises, error: null }));
    // 3. sets insert → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: setsError }));
    // 4. rollback: template delete
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.createTemplate('Push Day', [
      {
        exercise_id: 'ex-1',
        sets: [{ set_number: 1, weight: 100, reps: 10 }],
      },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toBe(setsError);
    expect(mockFrom).toHaveBeenCalledTimes(4);
    expect(mockFrom.mock.calls[3][0]).toBe('templates');
  });

  it('returns error on template insert failure', async () => {
    const templateError = new Error('Template insert failed');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: templateError }));

    const result = await templates.createTemplate('Push Day');

    expect(result.data).toBeNull();
    expect(result.error).toBe(templateError);
  });

  it('skips set insert when exercises have no sets', async () => {
    const template = { id: 'tmpl-1', name: 'Push Day', user_id: 'user-1' };
    const insertedExercises = [{ id: 'te-1' }];

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. exercises insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: insertedExercises, error: null }));
    // No third call for sets since allSets is empty

    const result = await templates.createTemplate('Push Day', [
      { exercise_id: 'ex-1', sets: [] },
    ]);

    expect(result).toEqual({ data: template, error: null });
    // Only 2 from() calls — no sets insert
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('catches unexpected exception', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await templates.createTemplate('Push Day');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// updateTemplate
// ============================================================================

describe('updateTemplate', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.updateTemplate('tmpl-1', 'New Name');

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.updateTemplate('tmpl-1', 'New Name');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('User not authenticated');
  });

  it('updates name, deletes old exercises, inserts new ones with sets', async () => {
    const template = { id: 'tmpl-1', name: 'Updated', user_id: 'user-1' };
    const insertedExercises = [{ id: 'te-new' }];

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template update
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. delete old exercises
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 3. insert new exercises
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: insertedExercises, error: null }));
    // 4. insert sets
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.updateTemplate('tmpl-1', 'Updated', [
      {
        exercise_id: 'ex-1',
        sets: [{ set_number: 1, weight: 100, reps: 10 }],
      },
    ]);

    expect(result).toEqual({ data: template, error: null });
    expect(mockFrom).toHaveBeenCalledTimes(4);
    expect(mockFrom.mock.calls[0][0]).toBe('templates');
    expect(mockFrom.mock.calls[1][0]).toBe('template_exercises');
    expect(mockFrom.mock.calls[2][0]).toBe('template_exercises');
    expect(mockFrom.mock.calls[3][0]).toBe('template_exercise_sets');
  });

  it('handles update with no exercises (delete-only, no re-insert)', async () => {
    const template = { id: 'tmpl-1', name: 'Updated', user_id: 'user-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template update
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. delete old exercises
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.updateTemplate('tmpl-1', 'Updated');

    expect(result).toEqual({ data: template, error: null });
    // Only 2 calls: update + delete, no insert
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('returns error on template update failure', async () => {
    const updateError = new Error('Update failed');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: updateError }));

    const result = await templates.updateTemplate('tmpl-1', 'New Name');

    expect(result.data).toBeNull();
    expect(result.error).toBe(updateError);
  });

  it('returns error on exercise delete failure', async () => {
    const template = { id: 'tmpl-1', name: 'Updated', user_id: 'user-1' };
    const deleteError = new Error('Delete failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template update → success
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. delete exercises → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: deleteError }));

    const result = await templates.updateTemplate('tmpl-1', 'Updated');

    expect(result.data).toBeNull();
    expect(result.error).toBe(deleteError);
  });

  it('returns error on exercise insert failure', async () => {
    const template = { id: 'tmpl-1', name: 'Updated', user_id: 'user-1' };
    const insertError = new Error('Insert failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template update
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. delete old exercises
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 3. insert new exercises → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: insertError }));

    const result = await templates.updateTemplate('tmpl-1', 'Updated', [
      { exercise_id: 'ex-1', sets: [] },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toBe(insertError);
  });

  it('returns error on sets insert failure', async () => {
    const template = { id: 'tmpl-1', name: 'Updated', user_id: 'user-1' };
    const insertedExercises = [{ id: 'te-new' }];
    const setsError = new Error('Sets failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. template update
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: template, error: null }));
    // 2. delete old exercises
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 3. insert new exercises
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: insertedExercises, error: null }));
    // 4. insert sets → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: setsError }));

    const result = await templates.updateTemplate('tmpl-1', 'Updated', [
      { exercise_id: 'ex-1', sets: [{ set_number: 1, weight: 100, reps: 10 }] },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toBe(setsError);
  });

  it('catches unexpected exception', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await templates.updateTemplate('tmpl-1', 'New Name');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// deleteTemplate
// ============================================================================

describe('deleteTemplate', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.deleteTemplate('tmpl-1');

    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.deleteTemplate('tmpl-1');

    expect(result.error!.message).toBe('User not authenticated');
  });

  it('deletes template successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.deleteTemplate('tmpl-1');

    expect(result).toEqual({ error: null });
  });

  it('returns Supabase delete error', async () => {
    const dbError = new Error('Delete failed');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: dbError }));

    const result = await templates.deleteTemplate('tmpl-1');

    expect(result.error).toBe(dbError);
  });

  it('catches unexpected exception', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await templates.deleteTemplate('tmpl-1');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// addExerciseToTemplate
// ============================================================================

describe('addExerciseToTemplate', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
    });

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('User not authenticated');
  });

  it('computes order = maxOrder + 1 from existing exercises', async () => {
    const exerciseData = { id: 'te-new', template_id: 'tmpl-1', exercise_id: 'ex-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. fetch existing exercises → has order=2 as max
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: [{ order: 2 }], error: null })
    );
    // 2. insert new exercise — capture
    const { proxy: exProxy, getCaptured } = mockInsertCapture({
      data: exerciseData,
      error: null,
    });
    mockFrom.mockReturnValueOnce(exProxy);
    // 3. insert default sets
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 4. update template updated_at
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    await templates.addExerciseToTemplate('tmpl-1', { exercise_id: 'ex-1' });

    const inserted = getCaptured() as any;
    expect(inserted.order).toBe(3); // maxOrder(2) + 1
  });

  it('uses order = 0 when no existing exercises', async () => {
    const exerciseData = { id: 'te-new', template_id: 'tmpl-1', exercise_id: 'ex-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. fetch existing exercises → empty
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));
    // 2. insert new exercise — capture
    const { proxy: exProxy, getCaptured } = mockInsertCapture({
      data: exerciseData,
      error: null,
    });
    mockFrom.mockReturnValueOnce(exProxy);
    // 3. insert default sets
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 4. update template updated_at
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    await templates.addExerciseToTemplate('tmpl-1', { exercise_id: 'ex-1' });

    const inserted = getCaptured() as any;
    expect(inserted.order).toBe(0); // -1 + 1 = 0
  });

  it('inserts 3 default sets with weight=0, reps=10', async () => {
    const exerciseData = { id: 'te-new', template_id: 'tmpl-1', exercise_id: 'ex-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. fetch existing
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));
    // 2. insert exercise
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: exerciseData, error: null }));
    // 3. insert sets — capture
    const { proxy: setsProxy, getCaptured: getSetsCaptured } = mockInsertCapture({
      error: null,
    });
    mockFrom.mockReturnValueOnce(setsProxy);
    // 4. update template
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    await templates.addExerciseToTemplate('tmpl-1', { exercise_id: 'ex-1' });

    const setsInserted = getSetsCaptured() as any[];
    expect(setsInserted).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(setsInserted[i].template_exercise_id).toBe('te-new');
      expect(setsInserted[i].set_number).toBe(i + 1);
      expect(setsInserted[i].weight).toBe(0);
      expect(setsInserted[i].reps).toBe(10);
    }
  });

  it('applies default_rest_seconds=90 default', async () => {
    const exerciseData = { id: 'te-new', template_id: 'tmpl-1', exercise_id: 'ex-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. fetch existing
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));
    // 2. insert exercise — capture
    const { proxy: exProxy, getCaptured } = mockInsertCapture({
      data: exerciseData,
      error: null,
    });
    mockFrom.mockReturnValueOnce(exProxy);
    // 3. insert sets
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 4. update template
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
      // no default_rest_seconds provided
    });

    const inserted = getCaptured() as any;
    expect(inserted.default_rest_seconds).toBe(90);
  });

  it('updates template updated_at timestamp', async () => {
    const exerciseData = { id: 'te-new', template_id: 'tmpl-1', exercise_id: 'ex-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. fetch existing
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));
    // 2. insert exercise
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: exerciseData, error: null }));
    // 3. insert sets
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 4. update template updated_at
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
    });

    expect(result.data).toEqual(exerciseData);
    expect(result.error).toBeNull();
    // 4th call updates templates table
    expect(mockFrom).toHaveBeenCalledTimes(4);
    expect(mockFrom.mock.calls[3][0]).toBe('templates');
  });

  it('returns error on fetch of existing exercises', async () => {
    const fetchError = new Error('Fetch failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: fetchError }));

    const result = await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(fetchError);
  });

  it('returns error on exercise insert failure', async () => {
    const insertError = new Error('Insert failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. fetch existing
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));
    // 2. insert exercise → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: insertError }));

    const result = await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(insertError);
  });

  it('rolls back exercise on sets insert failure', async () => {
    const exerciseData = { id: 'te-new', template_id: 'tmpl-1', exercise_id: 'ex-1' };
    const setsError = new Error('Sets failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. fetch existing
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));
    // 2. insert exercise → success
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: exerciseData, error: null }));
    // 3. insert sets → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: setsError }));
    // 4. rollback: delete exercise
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(setsError);
    // 4th call is rollback delete on template_exercises
    expect(mockFrom).toHaveBeenCalledTimes(4);
    expect(mockFrom.mock.calls[3][0]).toBe('template_exercises');
  });

  it('catches unexpected exception', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await templates.addExerciseToTemplate('tmpl-1', {
      exercise_id: 'ex-1',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// removeExerciseFromTemplate
// ============================================================================

describe('removeExerciseFromTemplate', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.removeExerciseFromTemplate('tmpl-1', 'ex-1');

    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.removeExerciseFromTemplate('tmpl-1', 'ex-1');

    expect(result.error!.message).toBe('User not authenticated');
  });

  it('removes exercise and updates updated_at timestamp', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. delete exercise
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 2. update template updated_at
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.removeExerciseFromTemplate('tmpl-1', 'ex-1');

    expect(result).toEqual({ error: null });
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom.mock.calls[0][0]).toBe('template_exercises');
    expect(mockFrom.mock.calls[1][0]).toBe('templates');
  });

  it('returns Supabase delete error', async () => {
    const dbError = new Error('Delete failed');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: dbError }));

    const result = await templates.removeExerciseFromTemplate('tmpl-1', 'ex-1');

    expect(result.error).toBe(dbError);
    // Should not update timestamp if delete failed
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('catches unexpected exception', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await templates.removeExerciseFromTemplate('tmpl-1', 'ex-1');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// updateTemplateExercise
// ============================================================================

describe('updateTemplateExercise', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await templates.updateTemplateExercise('tmpl-1', 'ex-1', {
      default_rest_seconds: 120,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await templates.updateTemplateExercise('tmpl-1', 'ex-1', {
      default_rest_seconds: 120,
    });

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('User not authenticated');
  });

  it('updates default_rest_seconds and updated_at timestamp', async () => {
    const updatedExercise = {
      id: 'te-1',
      template_id: 'tmpl-1',
      exercise_id: 'ex-1',
      default_rest_seconds: 120,
    };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. update exercise
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: updatedExercise, error: null }));
    // 2. update template updated_at
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await templates.updateTemplateExercise('tmpl-1', 'ex-1', {
      default_rest_seconds: 120,
    });

    expect(result.data).toEqual(updatedExercise);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom.mock.calls[0][0]).toBe('template_exercises');
    expect(mockFrom.mock.calls[1][0]).toBe('templates');
  });

  it('only includes default_rest_seconds in update when defined', async () => {
    const updatedExercise = { id: 'te-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. update exercise
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: updatedExercise, error: null }));
    // 2. update template updated_at
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    // Pass empty defaults — default_rest_seconds is undefined
    const result = await templates.updateTemplateExercise('tmpl-1', 'ex-1', {});

    expect(result.data).toEqual(updatedExercise);
    expect(result.error).toBeNull();
  });

  it('returns Supabase update error', async () => {
    const dbError = new Error('Update failed');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: dbError }));

    const result = await templates.updateTemplateExercise('tmpl-1', 'ex-1', {
      default_rest_seconds: 120,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
  });

  it('catches unexpected exception', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await templates.updateTemplateExercise('tmpl-1', 'ex-1', {
      default_rest_seconds: 120,
    });

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// updateTemplateExerciseSetValues (standalone export)
// ============================================================================

describe('updateTemplateExerciseSetValues', () => {
  it('returns immediately when setUpdates is empty', async () => {
    await updateTemplateExerciseSetValues('tmpl-1', 'ex-1', []);

    // No Supabase calls at all
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('looks up template_exercise_id, then updates each set', async () => {
    // 1. lookup template_exercise
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: { id: 'te-1' }, error: null })
    );
    // 2. update set 1
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    // 3. update set 2
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    await updateTemplateExerciseSetValues('tmpl-1', 'ex-1', [
      { set_number: 1, weight: 100, reps: 10 },
      { set_number: 2, weight: 110, reps: 8 },
    ]);

    expect(mockFrom).toHaveBeenCalledTimes(3);
    expect(mockFrom.mock.calls[0][0]).toBe('template_exercises');
    expect(mockFrom.mock.calls[1][0]).toBe('template_exercise_sets');
    expect(mockFrom.mock.calls[2][0]).toBe('template_exercise_sets');
  });

  it('returns silently on lookup error', async () => {
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: null, error: new Error('Lookup failed') })
    );

    // Should not throw
    await updateTemplateExerciseSetValues('tmpl-1', 'ex-1', [
      { set_number: 1, weight: 100, reps: 10 },
    ]);

    // Only the lookup call, no set updates
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns silently when lookup returns no data', async () => {
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: null, error: null })
    );

    await updateTemplateExerciseSetValues('tmpl-1', 'ex-1', [
      { set_number: 1, weight: 100, reps: 10 },
    ]);

    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('iterates and updates each set individually', async () => {
    // 1. lookup
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: { id: 'te-1' }, error: null })
    );
    // 2-4. three set updates
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    await updateTemplateExerciseSetValues('tmpl-1', 'ex-1', [
      { set_number: 1, weight: 100, reps: 10 },
      { set_number: 2, weight: 110, reps: 8 },
      { set_number: 3, weight: 120, reps: 6 },
    ]);

    // 1 lookup + 3 updates = 4
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });
});
