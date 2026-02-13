/**
 * Write Queue Service Module
 *
 * Offline write queue backed by AsyncStorage. Workout logs are enqueued
 * when the device is offline and processed when connectivity returns.
 *
 * Queue entries use UUID idempotency keys to prevent duplicate submissions.
 * Exponential backoff prevents hammering the server on repeated failures.
 *
 * All operations are async and best-effort: errors are logged but never thrown.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { WorkoutLogInput } from '@/types/services';
import { logging } from '@/services/logging';

const WRITE_QUEUE_KEY = 'ironlift:writeQueue';

/** Maximum number of retry attempts before giving up on an entry */
const MAX_ATTEMPTS = 10;

/**
 * A single entry in the write queue.
 *
 * @property id - UUID idempotency key (prevents duplicate submissions)
 * @property type - Entry type (currently only 'workout_log')
 * @property payload - The workout log data to submit
 * @property created_at - ISO timestamp when entry was enqueued
 * @property attempts - Number of processing attempts so far
 * @property last_attempt_at - ISO timestamp of last processing attempt (null if never attempted)
 */
export interface WriteQueueEntry {
  id: string;
  type: 'workout_log';
  payload: WorkoutLogInput;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
}

/**
 * Calculate exponential backoff delay in milliseconds.
 * Sequence: 5s, 15s, 45s, 135s, 300s (cap), 300s, ...
 *
 * @param attempts - Number of previous attempts
 * @returns Backoff delay in milliseconds
 */
function getBackoffMs(attempts: number): number {
  const baseMs = 5000; // 5 seconds
  const maxMs = 300000; // 5 minutes cap
  const delay = baseMs * Math.pow(3, attempts);
  return Math.min(delay, maxMs);
}

/**
 * Read the current write queue from AsyncStorage.
 *
 * @returns Array of queue entries (empty array on error or missing key)
 */
export async function getQueue(): Promise<WriteQueueEntry[]> {
  try {
    const json = await AsyncStorage.getItem(WRITE_QUEUE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (err) {
    console.error('Failed to read write queue:', err);
    return [];
  }
}

/**
 * Add an entry to the write queue.
 * Sets attempts=0 and last_attempt_at=null for new entries.
 *
 * @param entry - Queue entry (id, type, payload, created_at required)
 */
export async function enqueue(
  entry: Omit<WriteQueueEntry, 'attempts' | 'last_attempt_at'>
): Promise<void> {
  try {
    const queue = await getQueue();
    queue.push({ ...entry, attempts: 0, last_attempt_at: null });
    await AsyncStorage.setItem(WRITE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to enqueue write queue entry:', err);
  }
}

/**
 * Process all entries in the write queue.
 *
 * Checks network connectivity first. For each entry, checks exponential
 * backoff timing before attempting submission. Successfully submitted
 * entries are removed from the queue. Failed entries remain with
 * incremented attempt count. Entries exceeding MAX_ATTEMPTS are kept
 * in the queue but skipped (for potential manual retry later).
 */
export async function processQueue(): Promise<void> {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    const queue = await getQueue();
    if (queue.length === 0) return;

    const remaining: WriteQueueEntry[] = [];

    for (const entry of queue) {
      // Skip entries that have exceeded max attempts
      if (entry.attempts >= MAX_ATTEMPTS) {
        remaining.push(entry);
        continue;
      }

      // Check backoff timing -- skip if too soon since last attempt
      if (entry.last_attempt_at) {
        const elapsed = Date.now() - new Date(entry.last_attempt_at).getTime();
        if (elapsed < getBackoffMs(entry.attempts)) {
          remaining.push(entry);
          continue;
        }
      }

      try {
        // Attempt to submit the workout log
        const { error } = await logging.createWorkoutLog(entry.payload);
        if (error) throw error;
        // Success: entry is NOT added to remaining (removed from queue)
      } catch {
        // Failure: keep in queue with incremented attempt count
        remaining.push({
          ...entry,
          attempts: entry.attempts + 1,
          last_attempt_at: new Date().toISOString(),
        });
      }
    }

    await AsyncStorage.setItem(WRITE_QUEUE_KEY, JSON.stringify(remaining));
  } catch (err) {
    console.error('Failed to process write queue:', err);
  }
}

/**
 * Remove all entries from the write queue.
 */
export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WRITE_QUEUE_KEY);
  } catch (err) {
    console.error('Failed to clear write queue:', err);
  }
}
