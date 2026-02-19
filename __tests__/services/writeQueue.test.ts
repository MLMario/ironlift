import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logging } from '@/services/logging';
import {
  getQueue,
  enqueue,
  processQueue,
  clearQueue,
  type WriteQueueEntry,
} from '@/services/writeQueue';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

jest.mock('@/services/logging', () => ({
  logging: { createWorkoutLog: jest.fn() },
}));

// ============================================================================
// Factory Helper
// ============================================================================

const QUEUE_KEY = 'ironlift:writeQueue';
const NOW = new Date('2025-06-01T12:00:00.000Z');

function makeEntry(overrides?: Partial<WriteQueueEntry>): WriteQueueEntry {
  return {
    id: 'entry-1',
    type: 'workout_log',
    payload: { started_at: '2025-01-01T00:00:00.000Z', exercises: [] },
    created_at: '2025-01-01T00:00:00.000Z',
    attempts: 0,
    last_attempt_at: null,
    ...overrides,
  };
}

// ============================================================================
// Setup / Teardown
// ============================================================================

let consoleErrorSpy: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  jest.useRealTimers();
});

// ============================================================================
// getQueue
// ============================================================================

describe('getQueue', () => {
  it('returns parsed entries from storage', async () => {
    const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })];
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));

    const result = await getQueue();

    expect(result).toEqual(entries);
  });

  it('returns [] when key is not set', async () => {
    const result = await getQueue();

    expect(result).toEqual([]);
  });

  it('returns [] and logs on storage error', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('disk fail'));

    const result = await getQueue();

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to read write queue:',
      expect.any(Error)
    );
  });
});

// ============================================================================
// enqueue
// ============================================================================

describe('enqueue', () => {
  it('appends entry with attempts: 0 and last_attempt_at: null', async () => {
    const { attempts, last_attempt_at, ...input } = makeEntry({ id: 'e1' });

    await enqueue(input);

    const stored = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(stored).toEqual([{ ...input, attempts: 0, last_attempt_at: null }]);
  });

  it('preserves existing entries when appending', async () => {
    const existing = makeEntry({ id: 'e1' });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([existing]));
    jest.mocked(AsyncStorage.setItem).mockClear();

    const { attempts, last_attempt_at, ...input } = makeEntry({ id: 'e2' });
    await enqueue(input);

    const stored = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe('e1');
    expect(stored[1].id).toBe('e2');
  });

  it('logs error on storage failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValueOnce(new Error('write fail'));

    const { attempts, last_attempt_at, ...input } = makeEntry();

    await expect(enqueue(input)).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to enqueue write queue entry:',
      expect.any(Error)
    );
  });
});

// ============================================================================
// processQueue
// ============================================================================

describe('processQueue', () => {
  it('skips processing when offline', async () => {
    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: false } as any);

    await processQueue();

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(logging.createWorkoutLog).not.toHaveBeenCalled();
  });

  it('skips processing when queue is empty', async () => {
    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);

    await processQueue();

    expect(logging.createWorkoutLog).not.toHaveBeenCalled();
  });

  it('removes entry on successful submission', async () => {
    const entry = makeEntry();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([entry]));

    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);
    jest
      .mocked(logging.createWorkoutLog)
      .mockResolvedValue({ data: {} as any, error: null });
    jest.mocked(AsyncStorage.setItem).mockClear();

    await processQueue();

    expect(logging.createWorkoutLog).toHaveBeenCalledWith(entry.payload);
    const remaining = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(remaining).toEqual([]);
  });

  it('keeps failed entry with incremented attempts and timestamp', async () => {
    const entry = makeEntry({ attempts: 0, last_attempt_at: null });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([entry]));

    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);
    jest
      .mocked(logging.createWorkoutLog)
      .mockResolvedValue({ data: null, error: new Error('server error') });
    jest.mocked(AsyncStorage.setItem).mockClear();

    await processQueue();

    const remaining = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0].attempts).toBe(1);
    expect(remaining[0].last_attempt_at).toBe(NOW.toISOString());
  });

  it('skips entry at max attempts (keeps in queue)', async () => {
    const maxedEntry = makeEntry({ id: 'maxed', attempts: 10 });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([maxedEntry]));

    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);
    jest.mocked(AsyncStorage.setItem).mockClear();

    await processQueue();

    expect(logging.createWorkoutLog).not.toHaveBeenCalled();
    const remaining = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(remaining).toEqual([maxedEntry]);
  });

  it('skips entry within backoff window', async () => {
    // attempts=1 → backoff = 15s, last attempt 10s ago → still within window
    const entry = makeEntry({
      id: 'backoff',
      attempts: 1,
      last_attempt_at: new Date(NOW.getTime() - 10_000).toISOString(),
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([entry]));

    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);
    jest.mocked(AsyncStorage.setItem).mockClear();

    await processQueue();

    expect(logging.createWorkoutLog).not.toHaveBeenCalled();
    const remaining = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(remaining).toEqual([entry]);
  });

  it('processes entry after backoff elapsed', async () => {
    // attempts=1 → backoff = 15s, last attempt 20s ago → past backoff
    const entry = makeEntry({
      id: 'ready',
      attempts: 1,
      last_attempt_at: new Date(NOW.getTime() - 20_000).toISOString(),
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([entry]));

    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);
    jest
      .mocked(logging.createWorkoutLog)
      .mockResolvedValue({ data: {} as any, error: null });
    jest.mocked(AsyncStorage.setItem).mockClear();

    await processQueue();

    expect(logging.createWorkoutLog).toHaveBeenCalledWith(entry.payload);
    const remaining = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(remaining).toEqual([]);
  });

  it('handles mixed entries (success + fail + maxed + backoff)', async () => {
    const successEntry = makeEntry({ id: 'success', attempts: 0 });
    const failEntry = makeEntry({ id: 'fail', attempts: 0 });
    const maxedEntry = makeEntry({ id: 'maxed', attempts: 10 });
    const backoffEntry = makeEntry({
      id: 'backoff',
      attempts: 1,
      last_attempt_at: new Date(NOW.getTime() - 5_000).toISOString(),
    });

    await AsyncStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([successEntry, failEntry, maxedEntry, backoffEntry])
    );

    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);
    jest
      .mocked(logging.createWorkoutLog)
      .mockResolvedValueOnce({ data: {} as any, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('fail') });
    jest.mocked(AsyncStorage.setItem).mockClear();

    await processQueue();

    expect(logging.createWorkoutLog).toHaveBeenCalledTimes(2);

    const remaining = JSON.parse(
      jest.mocked(AsyncStorage.setItem).mock.calls[0][1] as string
    );
    expect(remaining).toHaveLength(3);

    // Failed entry: incremented attempts, updated timestamp
    expect(remaining[0]).toEqual(
      expect.objectContaining({
        id: 'fail',
        attempts: 1,
        last_attempt_at: NOW.toISOString(),
      })
    );
    // Maxed entry: unchanged
    expect(remaining[1]).toEqual(maxedEntry);
    // Backoff entry: unchanged
    expect(remaining[2]).toEqual(backoffEntry);
  });

  it('logs error on outer failure (does not throw)', async () => {
    jest
      .mocked(NetInfo.fetch)
      .mockRejectedValue(new Error('network error'));

    await expect(processQueue()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to process write queue:',
      expect.any(Error)
    );
  });
});

// ============================================================================
// clearQueue
// ============================================================================

describe('clearQueue', () => {
  it('removes queue key from storage', async () => {
    await clearQueue();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(QUEUE_KEY);
  });

  it('logs error on storage failure (does not throw)', async () => {
    jest
      .mocked(AsyncStorage.removeItem)
      .mockRejectedValueOnce(new Error('fail'));

    await expect(clearQueue()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to clear write queue:',
      expect.any(Error)
    );
  });
});

// ============================================================================
// getBackoffMs (indirect — tested via processQueue)
// ============================================================================

describe('getBackoffMs (indirect)', () => {
  it('backoff caps at 300 s (5 min)', async () => {
    // attempts=5 → getBackoffMs(5) = min(5000*243, 300000) = 300000 ms = 300 s
    // last_attempt_at = 301 s ago → elapsed (301 s) > cap (300 s) → processed
    const entry = makeEntry({
      id: 'capped',
      attempts: 5,
      last_attempt_at: new Date(NOW.getTime() - 301_000).toISOString(),
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([entry]));

    jest
      .mocked(NetInfo.fetch)
      .mockResolvedValue({ isConnected: true } as any);
    jest
      .mocked(logging.createWorkoutLog)
      .mockResolvedValue({ data: {} as any, error: null });

    await processQueue();

    expect(logging.createWorkoutLog).toHaveBeenCalledWith(entry.payload);
  });
});
