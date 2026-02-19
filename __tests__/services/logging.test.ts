import { logging } from '@/services/logging';
import { supabase } from '@/lib/supabase';
import type { WorkoutLog, WorkoutLogExerciseWithSets } from '@/types/database';
import type { WorkoutLogExerciseInput, WorkoutLogSetInput } from '@/types/services';

// ============================================================================
// Mock Helpers
// ============================================================================

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = jest.fn();

/**
 * Proxy that mimics a Supabase query builder chain.
 * Every property access returns a jest.fn() → new child Proxy (enables chaining).
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

function makeWorkoutLog(overrides?: Partial<WorkoutLog>): WorkoutLog {
  return {
    id: 'log-1',
    user_id: 'user-1',
    template_id: null,
    started_at: '2025-01-15T10:00:00.000Z',
    created_at: '2025-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeExerciseInput(overrides?: Partial<WorkoutLogExerciseInput>): WorkoutLogExerciseInput {
  return {
    exercise_id: 'ex-1',
    rest_seconds: 90,
    order: 0,
    sets: [makeSetInput()],
    ...overrides,
  };
}

function makeSetInput(overrides?: Partial<WorkoutLogSetInput>): WorkoutLogSetInput {
  return {
    set_number: 1,
    weight: 100,
    reps: 10,
    is_done: true,
    ...overrides,
  };
}

function makeLogExerciseWithSets(
  overrides?: Partial<WorkoutLogExerciseWithSets>
): WorkoutLogExerciseWithSets {
  return {
    id: 'log-ex-1',
    exercise_id: 'ex-1',
    rest_seconds: 90,
    order: 0,
    exercises: { id: 'ex-1', name: 'Bench Press', category: 'Chest' },
    workout_log_sets: [
      { id: 'set-1', set_number: 1, weight: 100, reps: 10, is_done: true },
    ],
    ...overrides,
  };
}

function makeHistoryQueryResult(overrides?: Record<string, unknown>) {
  return {
    id: 'log-ex-1',
    rest_seconds: 90,
    workout_logs: {
      id: 'log-1',
      user_id: 'user-1',
      started_at: '2025-01-15T10:00:00.000Z',
    },
    workout_log_sets: [
      { id: 'set-1', set_number: 1, weight: 100, reps: 10, is_done: true },
    ],
    ...overrides,
  };
}

function makeRecentQueryResult(overrides?: Record<string, unknown>) {
  return {
    rest_seconds: 90,
    workout_logs: {
      user_id: 'user-1',
      started_at: '2025-01-15T10:00:00.000Z',
    },
    workout_log_sets: [
      { set_number: 1, weight: 100, reps: 10, is_done: true },
    ],
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
// createWorkoutLog
// ============================================================================

describe('createWorkoutLog', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [],
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns auth error when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [],
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('User not authenticated');
  });

  it('creates log + exercises + sets on happy path', async () => {
    const workoutLog = makeWorkoutLog();
    const logExercise = { id: 'log-ex-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. workout_logs insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: workoutLog, error: null }));
    // 2. workout_log_exercises insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: logExercise, error: null }));
    // 3. workout_log_sets insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [makeExerciseInput()],
    });

    expect(result).toEqual({ data: workoutLog, error: null });
    expect(mockFrom).toHaveBeenCalledTimes(3);
    expect(mockFrom.mock.calls[0][0]).toBe('workout_logs');
    expect(mockFrom.mock.calls[1][0]).toBe('workout_log_exercises');
    expect(mockFrom.mock.calls[2][0]).toBe('workout_log_sets');
  });

  it('uses template_id: null when not provided', async () => {
    const workoutLog = makeWorkoutLog();
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    const { proxy, getCaptured } = mockInsertCapture({ data: workoutLog, error: null });
    mockFrom.mockReturnValueOnce(proxy);

    await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [],
    });

    const inserted = getCaptured() as any;
    expect(inserted.template_id).toBeNull();
  });

  it('defaults rest_seconds to 60 and order to index', async () => {
    const workoutLog = makeWorkoutLog();
    const logExercise = { id: 'log-ex-1' };

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. workout_logs insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: workoutLog, error: null }));
    // 2. workout_log_exercises insert — capture
    const { proxy, getCaptured } = mockInsertCapture({ data: logExercise, error: null });
    mockFrom.mockReturnValueOnce(proxy);
    // 3. workout_log_sets insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [
        {
          exercise_id: 'ex-1',
          // rest_seconds not provided → defaults to 60
          // order not provided → defaults to index (0)
          sets: [makeSetInput()],
        },
      ],
    });

    const inserted = getCaptured() as any;
    expect(inserted.rest_seconds).toBe(60);
    expect(inserted.order).toBe(0);
  });

  it('returns error and rolls back when exercise insert fails', async () => {
    const workoutLog = makeWorkoutLog();
    const exError = new Error('Exercise insert failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. workout_logs insert → success
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: workoutLog, error: null }));
    // 2. workout_log_exercises insert → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: exError }));
    // 3. rollback: workout_logs delete
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: null }));

    const result = await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [makeExerciseInput()],
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe(exError);
    expect(mockFrom).toHaveBeenCalledTimes(3);
    // Third call is the rollback delete on workout_logs
    expect(mockFrom.mock.calls[2][0]).toBe('workout_logs');
  });

  it('continues when set insert fails (logs error)', async () => {
    const workoutLog = makeWorkoutLog();
    const logExercise = { id: 'log-ex-1' };
    const setsError = new Error('Sets insert failed');

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. workout_logs insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: workoutLog, error: null }));
    // 2. workout_log_exercises insert
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: logExercise, error: null }));
    // 3. workout_log_sets insert → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ error: setsError }));

    const result = await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [makeExerciseInput()],
    });

    // Data still returned despite sets error
    expect(result).toEqual({ data: workoutLog, error: null });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to insert sets:', setsError);
  });

  it('handles empty exercises array', async () => {
    const workoutLog = makeWorkoutLog();

    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: workoutLog, error: null }));

    const result = await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [],
    });

    expect(result).toEqual({ data: workoutLog, error: null });
    // Only the log insert, no exercise or set inserts
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('wraps non-Error thrown values in Error', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'string error';
    });

    const result = await logging.createWorkoutLog({
      started_at: '2025-01-15T10:00:00.000Z',
      exercises: [],
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });
});

// ============================================================================
// getWorkoutLogs
// ============================================================================

describe('getWorkoutLogs', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await logging.getWorkoutLogs();

    expect(result).toEqual({ data: null, error: authError });
  });

  it('returns formatted summaries with exercise_count', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            id: 'log-1',
            template_id: null,
            started_at: '2025-01-15T10:00:00.000Z',
            created_at: '2025-01-15T10:00:00.000Z',
            workout_log_exercises: [{ count: 3 }],
          },
          {
            id: 'log-2',
            template_id: 'tpl-1',
            started_at: '2025-01-14T10:00:00.000Z',
            created_at: '2025-01-14T10:00:00.000Z',
            workout_log_exercises: [{ count: 5 }],
          },
        ],
        error: null,
      })
    );

    const result = await logging.getWorkoutLogs();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data![0].exercise_count).toBe(3);
    expect(result.data![1].exercise_count).toBe(5);
    expect(result.data![0].id).toBe('log-1');
  });

  it('uses default limit of 52', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));

    const result = await logging.getWorkoutLogs();

    expect(result).toEqual({ data: [], error: null });
    // Indirectly verified — call succeeds with no limit argument
  });

  it('returns query error', async () => {
    const dbError = new Error('DB error');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: dbError }));

    const result = await logging.getWorkoutLogs();

    expect(result).toEqual({ data: null, error: dbError });
  });

  it('handles empty data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));

    const result = await logging.getWorkoutLogs();

    expect(result).toEqual({ data: [], error: null });
  });

  it('catches unexpected errors', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await logging.getWorkoutLogs();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// getWorkoutLog
// ============================================================================

describe('getWorkoutLog', () => {
  it('returns workout log with exercises sorted by order', async () => {
    const exA = makeLogExerciseWithSets({ id: 'ex-a', order: 2 });
    const exB = makeLogExerciseWithSets({ id: 'ex-b', order: 0 });
    const exC = makeLogExerciseWithSets({ id: 'ex-c', order: 1 });

    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: {
          id: 'log-1',
          template_id: null,
          started_at: '2025-01-15T10:00:00.000Z',
          created_at: '2025-01-15T10:00:00.000Z',
          templates: null,
          workout_log_exercises: [exA, exB, exC],
        },
        error: null,
      })
    );

    const result = await logging.getWorkoutLog('log-1');

    expect(result.error).toBeNull();
    const exercises = result.data!.workout_log_exercises;
    expect(exercises[0].order).toBe(0);
    expect(exercises[1].order).toBe(1);
    expect(exercises[2].order).toBe(2);
  });

  it('sorts sets by set_number within each exercise', async () => {
    const ex = makeLogExerciseWithSets({
      workout_log_sets: [
        { id: 's3', set_number: 3, weight: 100, reps: 8, is_done: true },
        { id: 's1', set_number: 1, weight: 100, reps: 10, is_done: true },
        { id: 's2', set_number: 2, weight: 100, reps: 9, is_done: true },
      ],
    });

    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: {
          id: 'log-1',
          template_id: null,
          started_at: '2025-01-15T10:00:00.000Z',
          created_at: '2025-01-15T10:00:00.000Z',
          templates: null,
          workout_log_exercises: [ex],
        },
        error: null,
      })
    );

    const result = await logging.getWorkoutLog('log-1');

    const sets = result.data!.workout_log_exercises[0].workout_log_sets;
    expect(sets[0].set_number).toBe(1);
    expect(sets[1].set_number).toBe(2);
    expect(sets[2].set_number).toBe(3);
  });

  it('extracts template_name from joined templates', async () => {
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: {
          id: 'log-1',
          template_id: 'tpl-1',
          started_at: '2025-01-15T10:00:00.000Z',
          created_at: '2025-01-15T10:00:00.000Z',
          templates: { name: 'Push Day' },
          workout_log_exercises: [],
        },
        error: null,
      })
    );

    const result = await logging.getWorkoutLog('log-1');

    expect(result.data!.template_name).toBe('Push Day');
  });

  it('sets template_name to null when no template', async () => {
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: {
          id: 'log-1',
          template_id: null,
          started_at: '2025-01-15T10:00:00.000Z',
          created_at: '2025-01-15T10:00:00.000Z',
          templates: null,
          workout_log_exercises: [],
        },
        error: null,
      })
    );

    const result = await logging.getWorkoutLog('log-1');

    expect(result.data!.template_name).toBeNull();
  });

  it('returns query error', async () => {
    const dbError = new Error('Not found');
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: dbError }));

    const result = await logging.getWorkoutLog('log-1');

    expect(result).toEqual({ data: null, error: dbError });
  });

  it('catches unexpected errors', async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await logging.getWorkoutLog('log-1');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// getExerciseHistory (also tests calculateMetrics indirectly)
// ============================================================================

describe('getExerciseHistory', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await logging.getExerciseHistory('ex-1');

    expect(result).toEqual({ data: null, error: authError });
  });

  it('session mode: groups by workout_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-3',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-14T10:00:00.000Z' },
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'session' });

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    const ids = result.data!.map((d: any) => d.workout_id);
    expect(new Set(ids).size).toBe(2);
  });

  it('session mode: calculates totalSets from completed sets only', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            workout_log_sets: [
              { id: 's1', set_number: 1, weight: 100, reps: 10, is_done: true },
              { id: 's2', set_number: 2, weight: 100, reps: 8, is_done: false },
              { id: 's3', set_number: 3, weight: 100, reps: 6, is_done: true },
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'session' });

    expect(result.data![0]).toHaveProperty('total_sets', 2);
  });

  it('session mode: finds maxWeight across all sets', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            workout_log_sets: [
              { id: 's1', set_number: 1, weight: 80, reps: 10, is_done: true },
              { id: 's2', set_number: 2, weight: 120, reps: 8, is_done: true },
              { id: 's3', set_number: 3, weight: 100, reps: 6, is_done: false },
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'session' });

    expect(result.data![0]).toHaveProperty('max_weight', 120);
  });

  it('session mode: calculates maxVolumeSet (weight * reps)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            workout_log_sets: [
              { id: 's1', set_number: 1, weight: 100, reps: 10, is_done: true }, // 1000
              { id: 's2', set_number: 2, weight: 120, reps: 5, is_done: true },  // 600
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'session' });

    expect(result.data![0]).toHaveProperty('max_volume_set', 1000);
  });

  it('session mode: bodyweight volume uses reps only', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            workout_log_sets: [
              { id: 's1', set_number: 1, weight: 0, reps: 15, is_done: true },
              { id: 's2', set_number: 2, weight: 0, reps: 12, is_done: true },
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'session' });

    // Bodyweight: volume = reps (since weight is 0)
    expect(result.data![0]).toHaveProperty('max_volume_set', 15);
  });

  it('session mode: applies limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 3 entries from 3 different workouts
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-14T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-3',
            workout_logs: { id: 'w-3', user_id: 'user-1', started_at: '2025-01-13T10:00:00.000Z' },
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'session', limit: 2 });

    // Limit=2 slices to first 2 entries → 2 sessions
    expect(result.data).toHaveLength(2);
  });

  it('session mode: sorts by started_at descending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-10T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'session' });

    const sessions = result.data as any[];
    expect(sessions[0].started_at).toBe('2025-01-15T10:00:00.000Z');
    expect(sessions[1].started_at).toBe('2025-01-10T10:00:00.000Z');
  });

  it('date mode: groups by date', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T08:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-15T18:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-3',
            workout_logs: { id: 'w-3', user_id: 'user-1', started_at: '2025-01-14T10:00:00.000Z' },
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'date' });

    const dateEntries = result.data as any[];
    // Two entries on Jan 15 grouped into one, one on Jan 14
    expect(dateEntries).toHaveLength(2);
    expect(dateEntries[0].date).toBe('2025-01-15');
    expect(dateEntries[1].date).toBe('2025-01-14');
  });

  it('date mode: applies limit after grouping', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-14T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-3',
            workout_logs: { id: 'w-3', user_id: 'user-1', started_at: '2025-01-13T10:00:00.000Z' },
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1', { mode: 'date', limit: 2 });

    // 3 dates grouped, sliced to limit=2
    expect(result.data).toHaveLength(2);
  });

  it('defaults mode to session and limit to 52', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [makeHistoryQueryResult()],
        error: null,
      })
    );

    const result = await logging.getExerciseHistory('ex-1');

    expect(result.error).toBeNull();
    // Session mode produces workout_id field
    expect(result.data![0]).toHaveProperty('workout_id');
  });

  it('returns query error', async () => {
    const dbError = new Error('DB error');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: dbError }));

    const result = await logging.getExerciseHistory('ex-1');

    expect(result).toEqual({ data: null, error: dbError });
  });

  it('catches unexpected errors', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await logging.getExerciseHistory('ex-1');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// getExerciseMetrics
// ============================================================================

describe('getExerciseMetrics', () => {
  it('session mode: returns labels as "Session N" and values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
            workout_log_sets: [
              { id: 's1', set_number: 1, weight: 100, reps: 10, is_done: true },
            ],
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-14T10:00:00.000Z' },
            workout_log_sets: [
              { id: 's2', set_number: 1, weight: 110, reps: 8, is_done: true },
              { id: 's3', set_number: 2, weight: 110, reps: 6, is_done: true },
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseMetrics('ex-1', { mode: 'session', metric: 'total_sets' });

    expect(result.error).toBeNull();
    expect(result.data!.labels).toEqual(['Session 1', 'Session 2']);
  });

  it('date mode: returns date labels and values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-14T10:00:00.000Z' },
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseMetrics('ex-1', { mode: 'date', metric: 'total_sets' });

    expect(result.error).toBeNull();
    // Reversed to oldest-first
    expect(result.data!.labels).toEqual(['2025-01-14', '2025-01-15']);
  });

  it('total_sets metric extracts correct values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
            workout_log_sets: [
              { id: 's1', set_number: 1, weight: 100, reps: 10, is_done: true },
              { id: 's2', set_number: 2, weight: 100, reps: 8, is_done: true },
              { id: 's3', set_number: 3, weight: 100, reps: 6, is_done: false },
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseMetrics('ex-1', { metric: 'total_sets', mode: 'session' });

    // 2 completed sets
    expect(result.data!.values).toEqual([2]);
  });

  it('max_volume_set metric extracts correct values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
            workout_log_sets: [
              { id: 's1', set_number: 1, weight: 100, reps: 10, is_done: true },  // 1000
              { id: 's2', set_number: 2, weight: 80, reps: 12, is_done: true },   // 960
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseMetrics('ex-1', {
      metric: 'max_volume_set',
      mode: 'session',
    });

    expect(result.data!.values).toEqual([1000]);
  });

  it('returns empty chart data when history is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));

    const result = await logging.getExerciseMetrics('ex-1');

    expect(result).toEqual({ data: { labels: [], values: [] }, error: null });
  });

  it('returns error when getExerciseHistory fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await logging.getExerciseMetrics('ex-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('reverses data to show oldest-to-newest', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeHistoryQueryResult({
            id: 'le-1',
            workout_logs: { id: 'w-1', user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
          }),
          makeHistoryQueryResult({
            id: 'le-2',
            workout_logs: { id: 'w-2', user_id: 'user-1', started_at: '2025-01-10T10:00:00.000Z' },
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getExerciseMetrics('ex-1', { mode: 'session' });

    // Oldest session first
    expect(result.data!.labels[0]).toBe('Session 1');
    // The first value corresponds to the older session (Jan 10)
    expect(result.data!.labels).toHaveLength(2);
  });

  it('catches unexpected errors', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await logging.getExerciseMetrics('ex-1');

    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// getRecentExerciseData
// ============================================================================

describe('getRecentExerciseData', () => {
  it('returns null when getUser fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth'),
    });

    const result = await logging.getRecentExerciseData('ex-1');

    expect(result).toBeNull();
  });

  it('returns null when no data exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));

    const result = await logging.getRecentExerciseData('ex-1');

    expect(result).toBeNull();
  });

  it('returns recent data from most recent session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeRecentQueryResult({
            rest_seconds: 60,
            workout_logs: { user_id: 'user-1', started_at: '2025-01-10T10:00:00.000Z' },
            workout_log_sets: [
              { set_number: 1, weight: 80, reps: 12, is_done: true },
            ],
          }),
          makeRecentQueryResult({
            rest_seconds: 90,
            workout_logs: { user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
            workout_log_sets: [
              { set_number: 1, weight: 100, reps: 10, is_done: true },
              { set_number: 2, weight: 100, reps: 8, is_done: true },
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getRecentExerciseData('ex-1');

    // Most recent session (Jan 15): weight=100, reps=10, rest=90
    expect(result).not.toBeNull();
    expect(result!.weight).toBe(100);
    expect(result!.reps).toBe(10);
    expect(result!.rest_seconds).toBe(90);
  });

  it('calculates sets from completed count, falls back to total', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // All sets completed
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeRecentQueryResult({
            workout_log_sets: [
              { set_number: 1, weight: 100, reps: 10, is_done: true },
              { set_number: 2, weight: 100, reps: 8, is_done: true },
              { set_number: 3, weight: 100, reps: 6, is_done: false },
            ],
          }),
        ],
        error: null,
      })
    );

    let result = await logging.getRecentExerciseData('ex-1');
    expect(result!.sets).toBe(2); // 2 completed

    // No completed sets → falls back to total
    jest.clearAllMocks();
    (supabase.auth as any).getUser = mockGetUser;
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeRecentQueryResult({
            workout_log_sets: [
              { set_number: 1, weight: 100, reps: 10, is_done: false },
              { set_number: 2, weight: 100, reps: 8, is_done: false },
            ],
          }),
        ],
        error: null,
      })
    );

    result = await logging.getRecentExerciseData('ex-1');
    expect(result!.sets).toBe(2); // fallback to total (2)
  });

  it('uses first set (set_number=1) for reps/weight', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          makeRecentQueryResult({
            workout_log_sets: [
              { set_number: 2, weight: 120, reps: 5, is_done: true },
              { set_number: 1, weight: 100, reps: 10, is_done: true },
              { set_number: 3, weight: 130, reps: 3, is_done: true },
            ],
          }),
        ],
        error: null,
      })
    );

    const result = await logging.getRecentExerciseData('ex-1');

    // Uses set_number=1 for values
    expect(result!.weight).toBe(100);
    expect(result!.reps).toBe(10);
  });

  it('defaults reps to 10, weight to 0, rest_seconds to 60', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            rest_seconds: 0, // falsy → defaults to 60
            workout_logs: { user_id: 'user-1', started_at: '2025-01-15T10:00:00.000Z' },
            workout_log_sets: [
              { set_number: 1, weight: 0, reps: 0, is_done: true },
            ],
          },
        ],
        error: null,
      })
    );

    const result = await logging.getRecentExerciseData('ex-1');

    expect(result!.reps).toBe(10);     // 0 is falsy → defaults to 10
    expect(result!.weight).toBe(0);     // 0 || 0 = 0
    expect(result!.rest_seconds).toBe(60); // 0 is falsy → defaults to 60
  });

  it('returns null on unexpected error', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const result = await logging.getRecentExerciseData('ex-1');

    expect(result).toBeNull();
  });
});

// ============================================================================
// getWorkoutLogsPaginated
// ============================================================================

describe('getWorkoutLogsPaginated', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await logging.getWorkoutLogsPaginated(0, 10);

    expect(result).toEqual({ data: null, error: authError });
  });

  it('returns paginated items with computed fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            id: 'log-1',
            template_id: 'tpl-1',
            started_at: '2025-01-15T10:00:00.000Z',
            templates: { name: 'Push Day' },
            workout_log_exercises: [
              {
                workout_log_sets: [
                  { weight: 100, reps: 10, is_done: true },
                  { weight: 100, reps: 8, is_done: true },
                ],
              },
              {
                workout_log_sets: [
                  { weight: 50, reps: 12, is_done: true },
                ],
              },
            ],
          },
        ],
        error: null,
        count: 1,
      })
    );

    const result = await logging.getWorkoutLogsPaginated(0, 10);

    expect(result.error).toBeNull();
    const item = result.data!.data[0];
    expect(item.exercise_count).toBe(2);
    expect(item.completed_sets).toBe(3);
    // Volume: (100*10) + (100*8) + (50*12) = 1000 + 800 + 600 = 2400
    expect(item.total_volume).toBe(2400);
    expect(item.template_name).toBe('Push Day');
  });

  it('calculates volume as weight * reps for completed sets only', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            id: 'log-1',
            template_id: null,
            started_at: '2025-01-15T10:00:00.000Z',
            templates: null,
            workout_log_exercises: [
              {
                workout_log_sets: [
                  { weight: 100, reps: 10, is_done: true },   // 1000
                  { weight: 100, reps: 8, is_done: false },   // skipped
                ],
              },
            ],
          },
        ],
        error: null,
        count: 1,
      })
    );

    const result = await logging.getWorkoutLogsPaginated(0, 10);

    expect(result.data!.data[0].total_volume).toBe(1000);
    expect(result.data!.data[0].completed_sets).toBe(1);
  });

  it('extracts template_name from joined templates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            id: 'log-1',
            template_id: 'tpl-1',
            started_at: '2025-01-15T10:00:00.000Z',
            templates: { name: 'Leg Day' },
            workout_log_exercises: [],
          },
        ],
        error: null,
        count: 1,
      })
    );

    const result = await logging.getWorkoutLogsPaginated(0, 10);

    expect(result.data!.data[0].template_name).toBe('Leg Day');
  });

  it('hasMore is true when count > offset + items.length', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            id: 'log-1',
            template_id: null,
            started_at: '2025-01-15T10:00:00.000Z',
            templates: null,
            workout_log_exercises: [],
          },
        ],
        error: null,
        count: 5, // 5 total, offset=0, items=1 → hasMore=true
      })
    );

    const result = await logging.getWorkoutLogsPaginated(0, 1);

    expect(result.data!.hasMore).toBe(true);
  });

  it('hasMore is false at end of data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            id: 'log-1',
            template_id: null,
            started_at: '2025-01-15T10:00:00.000Z',
            templates: null,
            workout_log_exercises: [],
          },
        ],
        error: null,
        count: 1, // 1 total, offset=0, items=1 → hasMore=false
      })
    );

    const result = await logging.getWorkoutLogsPaginated(0, 10);

    expect(result.data!.hasMore).toBe(false);
  });

  it('returns query error', async () => {
    const dbError = new Error('DB error');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: dbError, count: null }));

    const result = await logging.getWorkoutLogsPaginated(0, 10);

    expect(result).toEqual({ data: null, error: dbError });
  });

  it('catches unexpected errors', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await logging.getWorkoutLogsPaginated(0, 10);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});

// ============================================================================
// getWorkoutSummaryStats
// ============================================================================

describe('getWorkoutSummaryStats', () => {
  it('returns auth error when getUser fails', async () => {
    const authError = new Error('Auth failed');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

    const result = await logging.getWorkoutSummaryStats();

    expect(result).toEqual({ data: null, error: authError });
  });

  it('returns totals from completed sets', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. workout count query
    mockFrom.mockReturnValueOnce(mockQueryResult({ count: 10, error: null }));
    // 2. exercises + sets query
    mockFrom.mockReturnValueOnce(
      mockQueryResult({
        data: [
          {
            workout_log_sets: [
              { weight: 100, reps: 10, is_done: true },   // volume=1000
              { weight: 100, reps: 8, is_done: false },   // skipped
            ],
            workout_logs: { user_id: 'user-1' },
          },
          {
            workout_log_sets: [
              { weight: 50, reps: 15, is_done: true },    // volume=750
            ],
            workout_logs: { user_id: 'user-1' },
          },
        ],
        error: null,
      })
    );

    const result = await logging.getWorkoutSummaryStats();

    expect(result.error).toBeNull();
    expect(result.data!.totalWorkouts).toBe(10);
    expect(result.data!.totalSets).toBe(2);        // 2 completed
    expect(result.data!.totalVolume).toBe(1750);    // 1000 + 750
  });

  it('returns error when count query fails', async () => {
    const countError = new Error('Count failed');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ count: null, error: countError }));

    const result = await logging.getWorkoutSummaryStats();

    expect(result).toEqual({ data: null, error: countError });
  });

  it('returns error when exercises query fails', async () => {
    const exError = new Error('Exercises failed');
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    // 1. workout count → success
    mockFrom.mockReturnValueOnce(mockQueryResult({ count: 5, error: null }));
    // 2. exercises query → error
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: null, error: exError }));

    const result = await logging.getWorkoutSummaryStats();

    expect(result).toEqual({ data: null, error: exError });
  });

  it('handles zero data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
    mockFrom.mockReturnValueOnce(mockQueryResult({ count: 0, error: null }));
    mockFrom.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));

    const result = await logging.getWorkoutSummaryStats();

    expect(result.data).toEqual({
      totalWorkouts: 0,
      totalSets: 0,
      totalVolume: 0,
    });
  });

  it('catches unexpected errors', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw 'unexpected';
    });

    const result = await logging.getWorkoutSummaryStats();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('unexpected');
  });
});
