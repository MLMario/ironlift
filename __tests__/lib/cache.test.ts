import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedExercises,
  setCachedExercises,
  clearExerciseCache,
  getCachedTemplates,
  setCachedTemplates,
  clearTemplateCache,
  getCachedCharts,
  setCachedCharts,
  clearChartCache,
  chartMetricsCacheKey,
  getCachedChartMetrics,
  setCachedChartMetrics,
  clearChartMetricsCache,
} from '@/lib/cache';
import type { Exercise, TemplateWithExercises } from '@/types/database';
import type { ChartData, UserChartData } from '@/types/services';

// ============================================================================
// Constants & Fixtures
// ============================================================================

const KEY_EXERCISES = 'ironlift:exercises';
const KEY_TEMPLATES = 'ironlift:templates';
const KEY_CHARTS = 'ironlift:charts';
const KEY_CHART_METRICS = 'ironlift:chart-metrics';

const EXERCISE_FIXTURE: Exercise = {
  id: 'ex-1',
  user_id: null,
  name: 'Bench Press',
  category: 'chest',
  equipment: 'barbell',
  is_archived: false,
  is_custom: false,
  created_at: '2025-01-01T00:00:00.000Z',
} as Exercise;

const TEMPLATE_FIXTURE: TemplateWithExercises = {
  id: 'tpl-1',
  name: 'Push Day',
  created_at: '2025-01-01T00:00:00.000Z',
  exercises: [],
} as unknown as TemplateWithExercises;

const CHART_FIXTURE: UserChartData = {
  id: 'chart-1',
  user_id: 'u-1',
  exercise_id: 'ex-1',
} as unknown as UserChartData;

const CHART_DATA_FIXTURE: ChartData = {
  labels: ['2025-01-01', '2025-01-02'],
  values: [100, 110],
};

// ============================================================================
// Setup / Teardown
// ============================================================================

let consoleErrorSpy: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ============================================================================
// Exercise Cache
// ============================================================================

describe('Exercise cache', () => {
  it('getCachedExercises returns parsed exercises on cache hit', async () => {
    const exercises = [EXERCISE_FIXTURE];
    await AsyncStorage.setItem(KEY_EXERCISES, JSON.stringify(exercises));

    const result = await getCachedExercises();

    expect(result).toEqual(exercises);
  });

  it('getCachedExercises returns null when key is not set', async () => {
    const result = await getCachedExercises();

    expect(result).toBeNull();
  });

  it('getCachedExercises returns null on AsyncStorage error', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('disk fail'));

    const result = await getCachedExercises();

    expect(result).toBeNull();
  });

  it('setCachedExercises stores serialized exercises under correct key', async () => {
    const exercises = [EXERCISE_FIXTURE];

    await setCachedExercises(exercises);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      KEY_EXERCISES,
      JSON.stringify(exercises)
    );
  });

  it('setCachedExercises logs error on storage failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('write fail'));

    await expect(setCachedExercises([EXERCISE_FIXTURE])).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to cache exercises:',
      expect.any(Error)
    );
  });

  it('clearExerciseCache removes correct key', async () => {
    await clearExerciseCache();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY_EXERCISES);
  });

  it('clearExerciseCache logs error on failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.removeItem)
      .mockRejectedValueOnce(new Error('fail'));

    await expect(clearExerciseCache()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to clear exercise cache:',
      expect.any(Error)
    );
  });
});

// ============================================================================
// Template Cache
// ============================================================================

describe('Template cache', () => {
  it('getCachedTemplates returns parsed templates on cache hit', async () => {
    const templates = [TEMPLATE_FIXTURE];
    await AsyncStorage.setItem(KEY_TEMPLATES, JSON.stringify(templates));

    const result = await getCachedTemplates();

    expect(result).toEqual(templates);
  });

  it('getCachedTemplates returns null when key is not set', async () => {
    const result = await getCachedTemplates();

    expect(result).toBeNull();
  });

  it('getCachedTemplates returns null on AsyncStorage error', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('disk fail'));

    const result = await getCachedTemplates();

    expect(result).toBeNull();
  });

  it('setCachedTemplates stores serialized templates under correct key', async () => {
    const templates = [TEMPLATE_FIXTURE];

    await setCachedTemplates(templates);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      KEY_TEMPLATES,
      JSON.stringify(templates)
    );
  });

  it('setCachedTemplates logs error on storage failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('write fail'));

    await expect(
      setCachedTemplates([TEMPLATE_FIXTURE])
    ).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to cache templates:',
      expect.any(Error)
    );
  });

  it('clearTemplateCache removes correct key', async () => {
    await clearTemplateCache();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY_TEMPLATES);
  });

  it('clearTemplateCache logs error on failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.removeItem)
      .mockRejectedValueOnce(new Error('fail'));

    await expect(clearTemplateCache()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to clear template cache:',
      expect.any(Error)
    );
  });
});

// ============================================================================
// Chart Cache
// ============================================================================

describe('Chart cache', () => {
  it('getCachedCharts returns parsed charts on cache hit', async () => {
    const charts = [CHART_FIXTURE];
    await AsyncStorage.setItem(KEY_CHARTS, JSON.stringify(charts));

    const result = await getCachedCharts();

    expect(result).toEqual(charts);
  });

  it('getCachedCharts returns null when key is not set', async () => {
    const result = await getCachedCharts();

    expect(result).toBeNull();
  });

  it('getCachedCharts returns null on AsyncStorage error', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('disk fail'));

    const result = await getCachedCharts();

    expect(result).toBeNull();
  });

  it('setCachedCharts stores serialized charts under correct key', async () => {
    const charts = [CHART_FIXTURE];

    await setCachedCharts(charts);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      KEY_CHARTS,
      JSON.stringify(charts)
    );
  });

  it('setCachedCharts logs error on storage failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('write fail'));

    await expect(setCachedCharts([CHART_FIXTURE])).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to cache charts:',
      expect.any(Error)
    );
  });

  it('clearChartCache removes correct key', async () => {
    await clearChartCache();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY_CHARTS);
  });

  it('clearChartCache logs error on failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.removeItem)
      .mockRejectedValueOnce(new Error('fail'));

    await expect(clearChartCache()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to clear chart cache:',
      expect.any(Error)
    );
  });
});

// ============================================================================
// chartMetricsCacheKey
// ============================================================================

describe('chartMetricsCacheKey', () => {
  it('builds correct composite key from three segments', () => {
    const key = chartMetricsCacheKey('ex-1', 'total_sets', 'date');

    expect(key).toBe('ex-1:total_sets:date');
  });

  it('handles empty-string segments', () => {
    const key = chartMetricsCacheKey('', '', '');

    expect(key).toBe('::');
  });
});

// ============================================================================
// Chart Metrics Cache
// ============================================================================

describe('Chart metrics cache', () => {
  const METRIC_KEY = 'ex-1:total_sets:date';

  it('getCachedChartMetrics returns data when map exists and key is present', async () => {
    const map = { [METRIC_KEY]: CHART_DATA_FIXTURE };
    await AsyncStorage.setItem(KEY_CHART_METRICS, JSON.stringify(map));

    const result = await getCachedChartMetrics(METRIC_KEY);

    expect(result).toEqual(CHART_DATA_FIXTURE);
  });

  it('getCachedChartMetrics returns null when map exists but key is absent', async () => {
    const map = { 'other-key': CHART_DATA_FIXTURE };
    await AsyncStorage.setItem(KEY_CHART_METRICS, JSON.stringify(map));

    const result = await getCachedChartMetrics(METRIC_KEY);

    expect(result).toBeNull();
  });

  it('getCachedChartMetrics returns null when no map is stored', async () => {
    const result = await getCachedChartMetrics(METRIC_KEY);

    expect(result).toBeNull();
  });

  it('getCachedChartMetrics returns null on AsyncStorage error', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('disk fail'));

    const result = await getCachedChartMetrics(METRIC_KEY);

    expect(result).toBeNull();
  });

  it('setCachedChartMetrics creates a new map on first write', async () => {
    await setCachedChartMetrics(METRIC_KEY, CHART_DATA_FIXTURE);

    const stored = await AsyncStorage.getItem(KEY_CHART_METRICS);
    expect(JSON.parse(stored!)).toEqual({ [METRIC_KEY]: CHART_DATA_FIXTURE });
  });

  it('setCachedChartMetrics merges into existing map (preserves other entries)', async () => {
    const otherKey = 'ex-2:max_volume_set:session';
    const otherData: ChartData = { labels: ['S1'], values: [50] };
    await AsyncStorage.setItem(
      KEY_CHART_METRICS,
      JSON.stringify({ [otherKey]: otherData })
    );

    await setCachedChartMetrics(METRIC_KEY, CHART_DATA_FIXTURE);

    const stored = await AsyncStorage.getItem(KEY_CHART_METRICS);
    const parsed = JSON.parse(stored!);
    expect(parsed[otherKey]).toEqual(otherData);
    expect(parsed[METRIC_KEY]).toEqual(CHART_DATA_FIXTURE);
  });

  it('setCachedChartMetrics overwrites existing key with new data', async () => {
    await AsyncStorage.setItem(
      KEY_CHART_METRICS,
      JSON.stringify({ [METRIC_KEY]: { labels: ['old'], values: [1] } })
    );

    await setCachedChartMetrics(METRIC_KEY, CHART_DATA_FIXTURE);

    const stored = await AsyncStorage.getItem(KEY_CHART_METRICS);
    expect(JSON.parse(stored!)[METRIC_KEY]).toEqual(CHART_DATA_FIXTURE);
  });

  it('setCachedChartMetrics logs error on failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('read fail'));

    await expect(
      setCachedChartMetrics(METRIC_KEY, CHART_DATA_FIXTURE)
    ).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to cache chart metrics:',
      expect.any(Error)
    );
  });

  it('clearChartMetricsCache removes correct key', async () => {
    await clearChartMetricsCache();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY_CHART_METRICS);
  });

  it('clearChartMetricsCache logs error on failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.removeItem)
      .mockRejectedValueOnce(new Error('fail'));

    await expect(clearChartMetricsCache()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to clear chart metrics cache:',
      expect.any(Error)
    );
  });
});
