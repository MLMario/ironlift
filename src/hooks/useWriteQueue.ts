/**
 * Write Queue Sync Hook
 *
 * Side-effect-only hook that auto-processes the offline write queue
 * when the app returns to the foreground or network connectivity changes.
 *
 * Mount this hook once at the app root level (in _layout.tsx) to ensure
 * queued workout logs are synced as soon as conditions allow.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { processQueue } from '@/services/writeQueue';

/**
 * Hook that subscribes to AppState and NetInfo changes to trigger
 * write queue processing.
 *
 * - AppState 'active': processes queue when app comes to foreground
 * - NetInfo isConnected: processes queue when connectivity is restored
 *
 * No return value -- this is a fire-and-forget side-effect hook.
 */
export function useWriteQueue(): void {
  useEffect(() => {
    // Process queue on mount (app may have been offline)
    processQueue();

    // Process queue when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        processQueue();
      }
    });

    // Process queue when network connectivity is restored
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        processQueue();
      }
    });

    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
    };
  }, []);
}
