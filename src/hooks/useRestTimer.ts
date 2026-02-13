/**
 * useRestTimer Hook
 *
 * Rest timer state machine with expo-notifications, expo-haptics, and expo-audio.
 * Port of the web app's useTimerState, adapted for React Native with:
 * - Wall-clock time (immune to iOS background suspension)
 * - Local notification scheduled on start, cancelled on stop/adjust
 * - Haptic feedback on foreground completion
 * - Alert sound on foreground completion (gracefully handles missing asset)
 *
 * CRITICAL: Uses wall-clock time (startedAt + duration) instead of tick counting.
 * setInterval is ONLY for UI updates -- actual remaining time comes from Date.now().
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// ============================================================================
// Types
// ============================================================================

/**
 * Timer state as a discriminated union.
 * Eliminates impossible states (e.g., active with null exerciseIndex).
 */
export type TimerState =
  | { status: 'idle' }
  | {
      status: 'active';
      exerciseIndex: number;
      startedAt: number;
      duration: number;
      remaining: number;
    };

// ============================================================================
// Hook
// ============================================================================

/**
 * Rest timer with wall-clock time, notifications, haptics, and sound.
 *
 * - start(): begins timer, schedules notification
 * - stop(): cancels timer and notification
 * - adjust(): modifies duration mid-timer, reschedules notification
 * - isActiveForExercise(): checks if timer belongs to specific exercise
 * - getProgress(): returns 0-100 percentage for progress bar
 */
export function useRestTimer() {
  const [timer, setTimer] = useState<TimerState>({ status: 'idle' });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  // Store start params in refs for the interval callback
  const timerParamsRef = useRef<{
    startedAt: number;
    duration: number;
  } | null>(null);

  /**
   * Clear the update interval.
   */
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Cancel any scheduled notification.
   */
  const cancelNotification = useCallback(async () => {
    if (notificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          notificationIdRef.current
        );
      } catch {
        // Notification may have already fired -- ignore
      }
      notificationIdRef.current = null;
    }
  }, []);

  /**
   * Fire haptic feedback on timer completion.
   */
  const fireHaptic = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available (e.g., simulator) -- ignore
    }
  }, []);

  /**
   * Try to play alert sound on timer completion.
   * Uses createAudioPlayer (non-hook API) for one-shot playback from a callback.
   * Wrapped in try/catch -- gracefully handles missing asset.
   */
  const playAlertSound = useCallback(async () => {
    try {
      const { createAudioPlayer } = await import('expo-audio');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const source = require('../../assets/sounds/timer-complete.mp3');
      const player = createAudioPlayer(source);
      player.play();
      // Release after a short delay to allow playback to complete
      setTimeout(() => {
        try {
          player.release();
        } catch {
          // Already released or unavailable
        }
      }, 3000);
    } catch {
      // Asset doesn't exist or audio unavailable -- skip silently
      // Haptic feedback is the primary notification mechanism
    }
  }, []);

  /**
   * Handle timer completion (called from interval when remaining <= 0).
   */
  const onTimerComplete = useCallback(() => {
    clearTimer();
    cancelNotification();
    fireHaptic();
    playAlertSound();
    setTimer({ status: 'idle' });
  }, [clearTimer, cancelNotification, fireHaptic, playAlertSound]);

  /**
   * Start a rest timer for an exercise.
   * Replaces any existing timer (single timer enforced).
   */
  const start = useCallback(
    async (exerciseIndex: number, totalSeconds: number): Promise<void> => {
      if (!totalSeconds || totalSeconds <= 0) return;

      // Stop any existing timer first
      clearTimer();
      await cancelNotification();

      const startedAt = Date.now();
      timerParamsRef.current = { startedAt, duration: totalSeconds };

      // Set initial state
      setTimer({
        status: 'active',
        exerciseIndex,
        startedAt,
        duration: totalSeconds,
        remaining: totalSeconds,
      });

      // Schedule local notification
      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Rest Timer Complete',
            body: 'Time to start your next set',
            sound: true,
          },
          trigger: {
            type: SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: totalSeconds,
          },
        });
        notificationIdRef.current = notifId;
      } catch {
        // Notification permission denied or scheduling failed
        // Timer still works in foreground with haptic feedback
      }

      // Start UI update interval (wall-clock based)
      intervalRef.current = setInterval(() => {
        const params = timerParamsRef.current;
        if (!params) return;

        const elapsed = Math.floor((Date.now() - params.startedAt) / 1000);
        const remaining = params.duration - elapsed;

        if (remaining <= 0) {
          // Timer complete
          onTimerComplete();
        } else {
          setTimer((prev) => {
            if (prev.status !== 'active') return prev;
            return { ...prev, remaining };
          });
        }
      }, 1000);
    },
    [clearTimer, cancelNotification, onTimerComplete]
  );

  /**
   * Stop the current timer and cancel notification.
   */
  const stop = useCallback(async (): Promise<void> => {
    clearTimer();
    await cancelNotification();
    timerParamsRef.current = null;
    setTimer({ status: 'idle' });
  }, [clearTimer, cancelNotification]);

  /**
   * Adjust the timer duration by delta seconds.
   * Reschedules notification with updated remaining time.
   */
  const adjust = useCallback(
    async (deltaSeconds: number): Promise<void> => {
      const params = timerParamsRef.current;
      if (!params) return;

      // Calculate new duration (minimum 0)
      const newDuration = Math.max(0, params.duration + deltaSeconds);
      params.duration = newDuration;
      timerParamsRef.current = params;

      // Recalculate remaining
      const elapsed = Math.floor((Date.now() - params.startedAt) / 1000);
      const remaining = Math.max(0, newDuration - elapsed);

      if (remaining <= 0) {
        onTimerComplete();
        return;
      }

      // Update state
      setTimer((prev) => {
        if (prev.status !== 'active') return prev;
        return { ...prev, duration: newDuration, remaining };
      });

      // Reschedule notification
      await cancelNotification();
      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Rest Timer Complete',
            body: 'Time to start your next set',
            sound: true,
          },
          trigger: {
            type: SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: remaining,
          },
        });
        notificationIdRef.current = notifId;
      } catch {
        // Scheduling failed -- timer still works in foreground
      }
    },
    [cancelNotification, onTimerComplete]
  );

  /**
   * Check if the timer is currently active for a specific exercise.
   */
  const isActiveForExercise = useCallback(
    (exerciseIndex: number): boolean => {
      return (
        timer.status === 'active' && timer.exerciseIndex === exerciseIndex
      );
    },
    [timer]
  );

  /**
   * Get timer progress percentage for a specific exercise.
   * Returns 0-100 where 100 means full (idle or just started) and 0 means complete.
   */
  const getProgress = useCallback(
    (exerciseIndex: number): number => {
      if (timer.status !== 'active' || timer.exerciseIndex !== exerciseIndex) {
        return 100; // Full bar when idle
      }
      if (timer.duration <= 0) return 0;
      return Math.round((timer.remaining / timer.duration) * 100);
    },
    [timer]
  );

  // ==================== CLEANUP ====================

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      // Cancel notification on unmount
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(
          notificationIdRef.current
        ).catch(() => {});
      }
    };
  }, []);

  return {
    timer,
    start,
    stop,
    adjust,
    isActiveForExercise,
    getProgress,
  };
}
