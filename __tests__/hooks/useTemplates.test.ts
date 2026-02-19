import { renderHook, act } from '@testing-library/react-native';
import { useTemplates } from '@/hooks/useTemplates';
import { templates } from '@/services/templates';
import { getCachedTemplates, setCachedTemplates } from '@/lib/cache';
import type {
  TemplateWithExercises,
  TemplateExerciseWithSets,
} from '@/types/database';

// ============================================================================
// Mocks
// ============================================================================

jest.mock('@/services/templates', () => ({
  templates: { getTemplates: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  getCachedTemplates: jest.fn(),
  setCachedTemplates: jest.fn(),
}));

// ============================================================================
// Helpers
// ============================================================================

const mockGetTemplates = templates.getTemplates as jest.Mock;
const mockGetCached = getCachedTemplates as jest.Mock;
const mockSetCached = setCachedTemplates as jest.Mock;

function makeTemplateExercise(
  overrides: Partial<TemplateExerciseWithSets> = {}
): TemplateExerciseWithSets {
  return {
    exercise_id: 'ex-1',
    name: 'Bench Press',
    category: 'Chest',
    default_rest_seconds: 90,
    sets: [{ set_number: 1, weight: 60, reps: 10 }],
    ...overrides,
  };
}

function makeTemplate(
  overrides: Partial<TemplateWithExercises> = {}
): TemplateWithExercises {
  return {
    id: 'tpl-1',
    name: 'Push Day',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    exercises: [makeTemplateExercise()],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCached.mockResolvedValue(null);
    mockGetTemplates.mockResolvedValue({ data: [], error: null });
    mockSetCached.mockResolvedValue(undefined);
  });

  // --------------------------------------------------------------------------
  // 1. Initial state
  // --------------------------------------------------------------------------
  describe('initial state', () => {
    it('1.1 — starts with empty templates, isLoading: true, error: null', () => {
      mockGetCached.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useTemplates());

      expect(result.current.templates).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Cache hit + network success (happy path)
  // --------------------------------------------------------------------------
  describe('cache hit + network success', () => {
    const cachedData = [makeTemplate({ id: 'cached-1', name: 'Cached Template' })];
    const freshData = [makeTemplate({ id: 'fresh-1', name: 'Fresh Template' })];

    beforeEach(() => {
      mockGetCached.mockResolvedValue(cachedData);
      mockGetTemplates.mockResolvedValue({ data: freshData, error: null });
    });

    it('2.1 — shows cached templates immediately, isLoading goes false', async () => {
      let resolveFetch!: (value: unknown) => void;
      mockGetTemplates.mockReturnValue(new Promise(r => { resolveFetch = r; }));

      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual(cachedData);
      expect(result.current.isLoading).toBe(false);

      // Clean up
      await act(async () => {
        resolveFetch({ data: freshData, error: null });
      });
    });

    it('2.2 — after network resolves, templates are updated with fresh data', async () => {
      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual(freshData);
    });

    it('2.3 — fresh data is written to cache via setCachedTemplates', async () => {
      renderHook(() => useTemplates());

      await act(async () => {});

      expect(mockSetCached).toHaveBeenCalledWith(freshData);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Cache miss + network success
  // --------------------------------------------------------------------------
  describe('cache miss + network success', () => {
    const freshData = [makeTemplate({ id: 'net-1', name: 'Network Template' })];

    beforeEach(() => {
      mockGetCached.mockResolvedValue(null);
      mockGetTemplates.mockResolvedValue({ data: freshData, error: null });
    });

    it('3.1 — templates come from network, isLoading goes false', async () => {
      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual(freshData);
      expect(result.current.isLoading).toBe(false);
    });

    it('3.2 — fresh data is cached', async () => {
      renderHook(() => useTemplates());

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
      mockGetTemplates.mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });
    });

    it('4.1 — error is set to failure message', async () => {
      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.error).toBe(
        'Failed to load templates. Please check your connection.'
      );
    });

    it('4.2 — templates remain []', async () => {
      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Cache hit + network failure (offline resilience)
  // --------------------------------------------------------------------------
  describe('cache hit + network failure', () => {
    const cachedData = [makeTemplate({ id: 'stale-1', name: 'Stale Template' })];

    beforeEach(() => {
      mockGetCached.mockResolvedValue(cachedData);
      mockGetTemplates.mockResolvedValue({
        data: null,
        error: new Error('Offline'),
      });
    });

    it('5.1 — stale cached data is displayed', async () => {
      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual(cachedData);
    });

    it('5.2 — error remains null', async () => {
      const { result } = renderHook(() => useTemplates());

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

    it('6.1 — cache error silently caught; falls through to network', async () => {
      const freshData = [makeTemplate({ id: 'net-1', name: 'Fallback' })];
      mockGetTemplates.mockResolvedValue({ data: freshData, error: null });

      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual(freshData);
      expect(result.current.error).toBeNull();
    });

    it('6.2 — if network also fails, error is set', async () => {
      mockGetTemplates.mockRejectedValue(new Error('Network down'));

      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.error).toBe(
        'Failed to load templates. Please check your connection.'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. templatesChanged optimization
  // --------------------------------------------------------------------------
  describe('templatesChanged optimization', () => {
    it('7.1 — same data from cache and network: state reference unchanged', async () => {
      const sharedData = [
        makeTemplate({ id: 'tpl-1', name: 'Push Day', exercises: [makeTemplateExercise()] }),
      ];

      // Cache returns data first
      mockGetCached.mockResolvedValue(sharedData);
      // Network returns structurally identical data (different reference)
      const networkData = [
        makeTemplate({ id: 'tpl-1', name: 'Push Day', exercises: [makeTemplateExercise()] }),
      ];
      mockGetTemplates.mockResolvedValue({ data: networkData, error: null });

      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      // The hook should keep the cached reference because templatesChanged returns false
      // (same id, name, exercises.length)
      expect(result.current.templates).toBe(sharedData);
    });

    it('7.2 — different data triggers state update', async () => {
      const cachedData = [makeTemplate({ id: 'tpl-1', name: 'Push Day' })];
      const freshData = [makeTemplate({ id: 'tpl-2', name: 'Pull Day' })];

      mockGetCached.mockResolvedValue(cachedData);
      mockGetTemplates.mockResolvedValue({ data: freshData, error: null });

      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual(freshData);
      expect(result.current.templates).not.toBe(cachedData);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Refresh
  // --------------------------------------------------------------------------
  describe('refresh', () => {
    it('8.1 — calling refresh() re-triggers the full load cycle', async () => {
      const initial = [makeTemplate({ id: '1', name: 'Initial' })];
      const refreshed = [makeTemplate({ id: '2', name: 'Refreshed' })];

      mockGetTemplates.mockResolvedValueOnce({ data: initial, error: null });

      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.templates).toEqual(initial);

      mockGetTemplates.mockResolvedValueOnce({ data: refreshed, error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.templates).toEqual(refreshed);
    });

    it('8.2 — resets error to null on refresh', async () => {
      mockGetCached.mockResolvedValue(null);
      mockGetTemplates.mockResolvedValueOnce({
        data: null,
        error: new Error('fail'),
      });

      const { result } = renderHook(() => useTemplates());

      await act(async () => {});

      expect(result.current.error).toBe(
        'Failed to load templates. Please check your connection.'
      );

      // Refresh with successful network
      mockGetTemplates.mockResolvedValueOnce({ data: [], error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
