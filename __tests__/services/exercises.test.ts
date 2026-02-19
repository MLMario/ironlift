import { exercises } from '@/services/exercises';
import { supabase } from '@/lib/supabase';
import type { Exercise, ExerciseCategory } from '@/types/database';

// ============================================================================
// Mock Helpers
// ============================================================================

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = jest.fn();

/**
 * Creates a Proxy that mimics a Supabase query builder chain.
 * Every property access returns a jest.fn() returning a new child Proxy (enables chaining).
 * `.then` resolves to the configured `result` (makes `await` yield the result).
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

/**
 * Factory for creating Exercise objects with sensible defaults.
 */
function makeExercise(overrides?: Partial<Exercise>): Exercise {
  return {
    id: 'ex-1',
    user_id: 'user-1',
    name: 'Bench Press',
    category: 'Chest',
    equipment: 'Barbell',
    instructions: null,
    level: null,
    force: null,
    mechanic: null,
    is_system: false,
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
// getCategories
// ============================================================================

describe('getCategories', () => {
  it('returns all 7 categories in expected order', () => {
    expect(exercises.getCategories()).toEqual([
      'Chest',
      'Back',
      'Shoulders',
      'Legs',
      'Arms',
      'Core',
      'Other',
    ]);
  });
});

// ============================================================================
// getExercises
// ============================================================================

describe('getExercises', () => {
  it('returns exercises on success', async () => {
    const data = [makeExercise(), makeExercise({ id: 'ex-2', name: 'Squat' })];
    mockFrom.mockReturnValueOnce(mockQueryResult({ data, error: null }));

    const result = await exercises.getExercises();

    expect(result).toEqual({ data, error: null });
  });

  it('returns error when Supabase query fails', async () => {
    const error = new Error('DB error');
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error }));

    const result = await exercises.getExercises();

    expect(result).toEqual({ data: null, error });
  });

  it('catches unexpected exceptions and wraps in Error', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw 'string error';
    });

    const result = await exercises.getExercises();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });
});

// ============================================================================
// getExercisesByCategory
// ============================================================================

describe('getExercisesByCategory', () => {
  it('returns filtered exercises on success', async () => {
    const data = [makeExercise()];
    mockFrom.mockReturnValueOnce(mockQueryResult({ data, error: null }));

    const result = await exercises.getExercisesByCategory('Chest');

    expect(result).toEqual({ data, error: null });
  });

  it('returns error when Supabase query fails', async () => {
    const error = new Error('DB error');
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error }));

    const result = await exercises.getExercisesByCategory('Chest');

    expect(result).toEqual({ data: null, error });
  });

  it('catches unexpected exceptions', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw 'string error';
    });

    const result = await exercises.getExercisesByCategory('Chest');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});

// ============================================================================
// exerciseExists
// ============================================================================

describe('exerciseExists', () => {
  it('returns true when exercise found', async () => {
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: { id: 'ex-1' }, error: null })
    );

    expect(await exercises.exerciseExists('Bench Press')).toBe(true);
  });

  it('returns false when no exercise found', async () => {
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: null }));

    expect(await exercises.exerciseExists('Nonexistent')).toBe(false);
  });

  it('returns false for empty string input', async () => {
    expect(await exercises.exerciseExists('')).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns false on Supabase error', async () => {
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: null, error: new Error('fail') })
    );

    expect(await exercises.exerciseExists('Test')).toBe(false);
  });

  it('returns false on unexpected exception', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    expect(await exercises.exerciseExists('Test')).toBe(false);
  });
});

// ============================================================================
// createExercise
// ============================================================================

describe('createExercise', () => {
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  });

  it('returns created exercise on success', async () => {
    const created = makeExercise();
    // Dup check → no match
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: null }));
    // Insert → success
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: created, error: null })
    );

    const result = await exercises.createExercise(
      'Bench Press',
      'Chest',
      'Barbell'
    );

    expect(result).toEqual({ data: created, error: null });
  });

  it('trims name and equipment before insert', async () => {
    const created = makeExercise();
    // Dup check
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: null }));
    // Insert — capture the payload
    const { proxy, getCaptured } = mockInsertCapture({
      data: created,
      error: null,
    });
    mockFrom.mockReturnValueOnce(proxy);

    await exercises.createExercise('  Bench Press  ', 'Chest', '  Barbell  ');

    const inserted = getCaptured() as any[];
    expect(inserted[0].name).toBe('Bench Press');
    expect(inserted[0].equipment).toBe('Barbell');
  });

  it('passes null equipment when not provided', async () => {
    const created = makeExercise({ equipment: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: null }));
    const { proxy, getCaptured } = mockInsertCapture({
      data: created,
      error: null,
    });
    mockFrom.mockReturnValueOnce(proxy);

    await exercises.createExercise('Bench Press', 'Chest');

    const inserted = getCaptured() as any[];
    expect(inserted[0].equipment).toBeNull();
  });

  it('returns error when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth error'),
    });

    const result = await exercises.createExercise('Bench Press', 'Chest');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns error when name is empty', async () => {
    const result = await exercises.createExercise('', 'Chest');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('Name and category are required');
  });

  it('returns error when category is empty', async () => {
    const result = await exercises.createExercise(
      'Bench Press',
      '' as ExerciseCategory
    );

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('Name and category are required');
  });

  it('returns error when duplicate name exists', async () => {
    // Dup check → match found
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: { id: 'existing' }, error: null })
    );

    const result = await exercises.createExercise('Bench Press', 'Chest');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe(
      'An exercise with this name already exists'
    );
  });

  it('returns error on unique constraint violation (23505)', async () => {
    // Dup check → no match
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: null }));
    // Insert → DB-level unique violation
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: null,
        error: { code: '23505', message: 'unique_violation' },
      })
    );

    const result = await exercises.createExercise('Bench Press', 'Chest');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe(
      'An exercise with this name already exists'
    );
  });

  it('catches unexpected exceptions', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await exercises.createExercise('Bench Press', 'Chest');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// deleteExercise
// ============================================================================

describe('deleteExercise', () => {
  it('returns { error: null } on success', async () => {
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await exercises.deleteExercise('ex-1');

    expect(result).toEqual({ error: null });
  });

  it('returns error when ID is empty', async () => {
    const result = await exercises.deleteExercise('');

    expect(result.error!.message).toBe('Exercise ID is required');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns error on Supabase delete failure', async () => {
    const error = new Error('DB error');
    mockFrom.mockReturnValueOnce(mockQueryResult({ error }));

    const result = await exercises.deleteExercise('ex-1');

    expect(result.error).toBe(error);
  });

  it('catches unexpected exceptions', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await exercises.deleteExercise('ex-1');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// updateExercise
// ============================================================================

describe('updateExercise', () => {
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  });

  it('updates name only on success', async () => {
    const updated = makeExercise({ name: 'New Name' });
    // Dup check → no match
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: null }));
    // Update → success
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: updated, error: null })
    );

    const result = await exercises.updateExercise({
      id: 'ex-1',
      name: 'New Name',
    });

    expect(result).toEqual({ data: updated, error: null });
  });

  it('updates category only on success', async () => {
    const updated = makeExercise({ category: 'Back' });
    // No dup check needed — straight to update
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: updated, error: null })
    );

    const result = await exercises.updateExercise({
      id: 'ex-1',
      category: 'Back',
    });

    expect(result).toEqual({ data: updated, error: null });
  });

  it('updates both name and category', async () => {
    const updated = makeExercise({ name: 'New Name', category: 'Back' });
    // Dup check
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: null }));
    // Update
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: updated, error: null })
    );

    const result = await exercises.updateExercise({
      id: 'ex-1',
      name: 'New Name',
      category: 'Back',
    });

    expect(result).toEqual({ data: updated, error: null });
  });

  it("returns validationError 'EMPTY_NAME' for whitespace-only name", async () => {
    const result = await exercises.updateExercise({
      id: 'ex-1',
      name: '   ',
    });

    expect(result).toEqual({
      data: null,
      error: null,
      validationError: 'EMPTY_NAME',
    });
  });

  it("returns validationError 'INVALID_NAME' for special characters", async () => {
    const result = await exercises.updateExercise({
      id: 'ex-1',
      name: 'Bench@Press',
    });

    expect(result).toEqual({
      data: null,
      error: null,
      validationError: 'INVALID_NAME',
    });
  });

  it("returns validationError 'DUPLICATE_NAME' for existing name", async () => {
    // Dup check → match found (different exercise)
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: { id: 'other-id' }, error: null })
    );

    const result = await exercises.updateExercise({
      id: 'ex-1',
      name: 'Existing Name',
    });

    expect(result).toEqual({
      data: null,
      error: null,
      validationError: 'DUPLICATE_NAME',
    });
  });

  it('returns error when no fields provided', async () => {
    const result = await exercises.updateExercise({ id: 'ex-1' });

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('No fields to update');
  });

  it('returns error when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth error'),
    });

    const result = await exercises.updateExercise({
      id: 'ex-1',
      name: 'Test',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns error on Supabase update failure', async () => {
    const dbError = { message: 'update failed' };
    // Category-only path → single from() call for the update
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ data: null, error: dbError })
    );

    const result = await exercises.updateExercise({
      id: 'ex-1',
      category: 'Back',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
  });

  it('catches unexpected exceptions', async () => {
    // Name path triggers from() for dup check → throw
    mockFrom.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await exercises.updateExercise({
      id: 'ex-1',
      name: 'Valid Name',
    });

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// getUserExercises
// ============================================================================

describe('getUserExercises', () => {
  it("returns user's custom exercises on success", async () => {
    const data = [makeExercise()];
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data, error: null }));

    const result = await exercises.getUserExercises();

    expect(result).toEqual({ data, error: null });
  });

  it('returns error when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth'),
    });

    const result = await exercises.getUserExercises();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns error on Supabase query failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    const error = new Error('DB error');
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error }));

    const result = await exercises.getUserExercises();

    expect(result).toEqual({ data: null, error });
  });

  it('catches unexpected exceptions', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockImplementationOnce(() => {
      throw 'crash';
    });

    const result = await exercises.getUserExercises();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});

// ============================================================================
// getExercisesWithLoggedData
// ============================================================================

describe('getExercisesWithLoggedData', () => {
  it('returns deduplicated exercises sorted by category then name', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const ex1 = makeExercise({ id: 'ex-1', name: 'Squat', category: 'Legs' });
    const ex2 = makeExercise({
      id: 'ex-2',
      name: 'Bench Press',
      category: 'Chest',
    });
    const ex3 = makeExercise({
      id: 'ex-3',
      name: 'Incline Press',
      category: 'Chest',
    });

    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          { exercise_id: 'ex-1', exercises: ex1 },
          { exercise_id: 'ex-2', exercises: ex2 },
          { exercise_id: 'ex-1', exercises: ex1 }, // duplicate
          { exercise_id: 'ex-3', exercises: ex3 },
        ],
        error: null,
      })
    );

    const result = await exercises.getExercisesWithLoggedData();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(3);
    // Sorted: Chest (Bench Press, Incline Press), then Legs (Squat)
    expect(result.data![0]).toEqual(ex2);
    expect(result.data![1]).toEqual(ex3);
    expect(result.data![2]).toEqual(ex1);
  });

  it('returns empty array when no logged data', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));

    const result = await exercises.getExercisesWithLoggedData();

    expect(result).toEqual({ data: [], error: null });
  });

  it('returns error when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth'),
    });

    const result = await exercises.getExercisesWithLoggedData();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns error on Supabase query failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    const error = new Error('query failed');
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error }));

    const result = await exercises.getExercisesWithLoggedData();

    expect(result).toEqual({ data: null, error });
  });

  it('catches unexpected exceptions', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockFrom.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await exercises.getExercisesWithLoggedData();

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// getExerciseDependencies
// ============================================================================

describe('getExerciseDependencies', () => {
  it('returns correct counts from all three tables', async () => {
    mockFrom.mockReturnValueOnce(mockQueryResult({ count: 5, error: null }));
    mockFrom.mockReturnValueOnce(mockQueryResult({ count: 3, error: null }));
    mockFrom.mockReturnValueOnce(mockQueryResult({ count: 1, error: null }));

    const result = await exercises.getExerciseDependencies('ex-1');

    expect(result).toEqual({
      data: { templateCount: 5, workoutLogCount: 3, chartCount: 1 },
      error: null,
    });
  });

  it('defaults null counts to 0', async () => {
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ count: null, error: null })
    );
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ count: null, error: null })
    );
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ count: null, error: null })
    );

    const result = await exercises.getExerciseDependencies('ex-1');

    expect(result).toEqual({
      data: { templateCount: 0, workoutLogCount: 0, chartCount: 0 },
      error: null,
    });
  });

  it('returns error if any query fails', async () => {
    const error = new Error('query failed');
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ count: null, error: null })
    );
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ count: null, error })
    );
    mockFrom.mockReturnValueOnce(
      mockQueryResult({ count: null, error: null })
    );

    const result = await exercises.getExerciseDependencies('ex-1');

    expect(result).toEqual({ data: null, error });
  });

  it('catches unexpected exceptions', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await exercises.getExerciseDependencies('ex-1');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});
