import { renderHook, act } from '@testing-library/react-native';
import { useExercises } from '@/hooks/useExercises';
import { exercises } from '@/services/exercises';
import { getCachedExercises, setCachedExercises } from '@/lib/cache';
import type { Exercise } from '@/types/database';

// ============================================================================
// Mocks
// ============================================================================

jest.mock('@/services/exercises', () => ({
  exercises: { getExercises: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  getCachedExercises: jest.fn(),
  setCachedExercises: jest.fn(),
}));

// ============================================================================
// Helpers
// ============================================================================

const mockGetExercises = exercises.getExercises as jest.Mock;
const mockGetCached = getCachedExercises as jest.Mock;
const mockSetCached = setCachedExercises as jest.Mock;

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
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
// Tests
// ============================================================================

describe('useExercises', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCached.mockResolvedValue(null);
    mockGetExercises.mockResolvedValue({ data: [], error: null });
    mockSetCached.mockResolvedValue(undefined);
  });

  // --------------------------------------------------------------------------
  // 1. Initial state
  // --------------------------------------------------------------------------
  describe('initial state', () => {
    it('1.1 — starts with empty exercises, isLoading: true, error: null', () => {
      // Prevent async effects from resolving during this test
      mockGetCached.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useExercises());

      expect(result.current.exercises).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Cache hit + network success (happy path)
  // --------------------------------------------------------------------------
  describe('cache hit + network success', () => {
    const cachedData = [makeExercise({ id: 'cached-1', name: 'Cached Exercise' })];
    const freshData = [makeExercise({ id: 'fresh-1', name: 'Fresh Exercise' })];

    beforeEach(() => {
      mockGetCached.mockResolvedValue(cachedData);
      mockGetExercises.mockResolvedValue({ data: freshData, error: null });
    });

    it('2.1 — shows cached exercises immediately, isLoading goes false', async () => {
      let resolveFetch!: (value: unknown) => void;
      mockGetExercises.mockReturnValue(new Promise(r => { resolveFetch = r; }));

      const { result } = renderHook(() => useExercises());

      // Wait for cache to resolve
      await act(async () => {});

      expect(result.current.exercises).toEqual(cachedData);
      expect(result.current.isLoading).toBe(false);

      // Clean up: resolve the hanging fetch
      await act(async () => {
        resolveFetch({ data: freshData, error: null });
      });
    });

    it('2.2 — after network resolves, exercises are updated with fresh data', async () => {
      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises).toEqual(freshData);
    });

    it('2.3 — fresh data is written to cache via setCachedExercises', async () => {
      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(mockSetCached).toHaveBeenCalledWith(freshData);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Cache miss + network success
  // --------------------------------------------------------------------------
  describe('cache miss + network success', () => {
    const freshData = [makeExercise({ id: 'net-1', name: 'Network Exercise' })];

    beforeEach(() => {
      mockGetCached.mockResolvedValue(null);
      mockGetExercises.mockResolvedValue({ data: freshData, error: null });
    });

    it('3.1 — exercises come from network, isLoading goes false', async () => {
      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises).toEqual(freshData);
      expect(result.current.isLoading).toBe(false);
    });

    it('3.2 — fresh data is cached', async () => {
      renderHook(() => useExercises());

      await act(async () => {});

      expect(mockSetCached).toHaveBeenCalledWith(freshData);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Cache miss + network failure
  // --------------------------------------------------------------------------
  describe('cache miss + network failure', () => {
    beforeEach(() => {
      mockGetCached.mockResolvedValue(null);
      mockGetExercises.mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });
    });

    it('4.1 — error is set to failure message', async () => {
      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.error).toBe(
        'Failed to load exercises. Please check your connection.'
      );
    });

    it('4.2 — exercises remain []', async () => {
      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Cache hit + network failure (offline resilience)
  // --------------------------------------------------------------------------
  describe('cache hit + network failure', () => {
    const cachedData = [makeExercise({ id: 'stale-1', name: 'Stale Exercise' })];

    beforeEach(() => {
      mockGetCached.mockResolvedValue(cachedData);
      mockGetExercises.mockResolvedValue({
        data: null,
        error: new Error('Offline'),
      });
    });

    it('5.1 — stale cached data is displayed', async () => {
      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises).toEqual(cachedData);
    });

    it('5.2 — error remains null (no error surfaced to user)', async () => {
      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.error).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Cache read throws
  // --------------------------------------------------------------------------
  describe('cache read throws', () => {
    beforeEach(() => {
      mockGetCached.mockRejectedValue(new Error('AsyncStorage corrupted'));
    });

    it('6.1 — cache error is silently caught; falls through to network', async () => {
      const freshData = [makeExercise({ id: 'net-1', name: 'Fallback' })];
      mockGetExercises.mockResolvedValue({ data: freshData, error: null });

      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises).toEqual(freshData);
      expect(result.current.error).toBeNull();
    });

    it('6.2 — if network also fails, error is set', async () => {
      mockGetExercises.mockRejectedValue(new Error('Network down'));

      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.error).toBe(
        'Failed to load exercises. Please check your connection.'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. Sorting logic (sortExercises)
  // --------------------------------------------------------------------------
  describe('sorting logic', () => {
    it('7.1 — user exercises (is_system: false) appear before system exercises', async () => {
      const data = [
        makeExercise({ id: '1', name: 'Squat', is_system: true }),
        makeExercise({ id: '2', name: 'My Custom', is_system: false }),
      ];
      mockGetExercises.mockResolvedValue({ data, error: null });

      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises[0].is_system).toBe(false);
      expect(result.current.exercises[1].is_system).toBe(true);
    });

    it('7.2 — alphabetical within each group (case-insensitive)', async () => {
      const data = [
        makeExercise({ id: '1', name: 'Zottman Curl', is_system: false }),
        makeExercise({ id: '2', name: 'arnold Press', is_system: false }),
        makeExercise({ id: '3', name: 'Bench Press', is_system: false }),
      ];
      mockGetExercises.mockResolvedValue({ data, error: null });

      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises.map(e => e.name)).toEqual([
        'arnold Press',
        'Bench Press',
        'Zottman Curl',
      ]);
    });

    it('7.3 — empty array returns empty array', async () => {
      mockGetExercises.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Refresh
  // --------------------------------------------------------------------------
  describe('refresh', () => {
    it('8.1 — calling refresh() re-triggers the full load cycle', async () => {
      const initial = [makeExercise({ id: '1', name: 'Initial' })];
      const refreshed = [makeExercise({ id: '2', name: 'Refreshed' })];

      mockGetExercises.mockResolvedValueOnce({ data: initial, error: null });

      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.exercises).toEqual(initial);

      mockGetExercises.mockResolvedValueOnce({ data: refreshed, error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.exercises).toEqual(refreshed);
    });

    it('8.2 — resets error to null on refresh', async () => {
      mockGetCached.mockResolvedValue(null);
      mockGetExercises.mockResolvedValueOnce({
        data: null,
        error: new Error('fail'),
      });

      const { result } = renderHook(() => useExercises());

      await act(async () => {});

      expect(result.current.error).toBe(
        'Failed to load exercises. Please check your connection.'
      );

      // Refresh with successful network
      mockGetExercises.mockResolvedValueOnce({ data: [], error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
