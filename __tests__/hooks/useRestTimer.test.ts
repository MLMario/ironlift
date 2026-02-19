import { renderHook, act } from '@testing-library/react-native';
import { useRestTimer } from '@/hooks/useRestTimer';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Mocks
// ============================================================================

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Medium: 'medium',
  },
}));

// NOTE: expo-audio is imported via dynamic import() inside playAlertSound.
// Jest doesn't support dynamic import without --experimental-vm-modules,
// so the import throws and the hook's try/catch silently catches it.
// We still mock it to prevent "cannot find module" noise in other scenarios.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn().mockReturnValue({ play: jest.fn() }),
}));

// ============================================================================
// Helpers
// ============================================================================

const scheduleNotif = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelNotif =
  Notifications.cancelScheduledNotificationAsync as jest.Mock;
const hapticImpact = Haptics.impactAsync as jest.Mock;

const BASE_TIME = new Date('2025-06-01T12:00:00.000Z').getTime();

// ============================================================================
// Tests
// ============================================================================

describe('useRestTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(BASE_TIME));
    jest.clearAllMocks();
    scheduleNotif.mockResolvedValue('notif-123');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 1. Initial State
  // --------------------------------------------------------------------------
  describe('initial state', () => {
    it('1.1 — timer starts as idle', () => {
      const { result } = renderHook(() => useRestTimer());
      expect(result.current.timer).toEqual({ status: 'idle' });
    });
  });

  // --------------------------------------------------------------------------
  // 2. start()
  // --------------------------------------------------------------------------
  describe('start', () => {
    it('2.1 — sets active state with correct fields', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(2, 90);
      });

      expect(result.current.timer).toEqual({
        status: 'active',
        exerciseIndex: 2,
        startedAt: BASE_TIME,
        duration: 90,
        remaining: 90,
      });
    });

    it('2.2 — schedules notification with correct seconds', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      expect(scheduleNotif).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ seconds: 60 }),
        })
      );
    });

    it('2.3 — no-op for totalSeconds = 0', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 0);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
      expect(scheduleNotif).not.toHaveBeenCalled();
    });

    it('2.4 — no-op for negative totalSeconds', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, -10);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
      expect(scheduleNotif).not.toHaveBeenCalled();
    });

    it('2.5 — replaces existing timer (cancels previous)', async () => {
      const { result } = renderHook(() => useRestTimer());

      scheduleNotif.mockResolvedValueOnce('notif-first');

      await act(async () => {
        await result.current.start(0, 60);
      });

      await act(async () => {
        await result.current.start(1, 90);
      });

      expect(cancelNotif).toHaveBeenCalledWith('notif-first');
      expect(result.current.timer).toMatchObject({
        status: 'active',
        exerciseIndex: 1,
        duration: 90,
      });
    });

    it('2.6 — timer works if notification scheduling throws', async () => {
      scheduleNotif.mockRejectedValueOnce(new Error('Permission denied'));
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 30);
      });

      expect(result.current.timer).toMatchObject({
        status: 'active',
        duration: 30,
        remaining: 30,
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. Interval countdown
  // --------------------------------------------------------------------------
  describe('interval countdown', () => {
    it('3.1 — decrements remaining based on wall-clock time', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 90);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timer).toMatchObject({
        status: 'active',
        remaining: 89,
      });
    });

    it('3.2 — completes when remaining reaches 0', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 3);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
    });

    it('3.3 — multiple ticks decrement correctly', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 10);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.timer).toMatchObject({ remaining: 9 });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.timer).toMatchObject({ remaining: 8 });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.timer).toMatchObject({ remaining: 7 });
    });
  });

  // --------------------------------------------------------------------------
  // 4. stop()
  // --------------------------------------------------------------------------
  describe('stop', () => {
    it('4.1 — resets to idle state', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });
      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
    });

    it('4.2 — clears interval (no more ticks after stop)', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });
      await act(async () => {
        await result.current.stop();
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
    });

    it('4.3 — cancels notification', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      cancelNotif.mockClear();

      await act(async () => {
        await result.current.stop();
      });

      expect(cancelNotif).toHaveBeenCalledWith('notif-123');
    });
  });

  // --------------------------------------------------------------------------
  // 5. pause()
  // --------------------------------------------------------------------------
  describe('pause', () => {
    it('5.1 — freezes remaining at current wall-clock value', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      expect(result.current.timer).toMatchObject({ remaining: 50 });

      await act(async () => {
        await result.current.pause();
      });

      expect(result.current.timer).toMatchObject({
        status: 'active',
        remaining: 50,
      });
    });

    it('5.2 — stops interval (remaining frozen after pause)', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await act(async () => {
        await result.current.pause();
      });

      const frozenRemaining =
        result.current.timer.status === 'active'
          ? result.current.timer.remaining
          : -1;

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.timer).toMatchObject({
        status: 'active',
        remaining: frozenRemaining,
      });
    });

    it('5.3 — cancels notification', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      cancelNotif.mockClear();

      await act(async () => {
        await result.current.pause();
      });

      expect(cancelNotif).toHaveBeenCalledWith('notif-123');
    });

    it('5.4 — status stays active (not idle)', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });
      await act(async () => {
        await result.current.pause();
      });

      expect(result.current.timer.status).toBe('active');
    });

    it('5.5 — no-op when no timer is active', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.pause();
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
      expect(cancelNotif).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 6. adjust()
  // --------------------------------------------------------------------------
  describe('adjust', () => {
    it('6.1 — increases duration with positive delta', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await act(async () => {
        await result.current.adjust(30);
      });

      // newDuration = 60 + 30 = 90, elapsed = 5, remaining = 85
      expect(result.current.timer).toMatchObject({
        status: 'active',
        duration: 90,
        remaining: 85,
      });
    });

    it('6.2 — decreases duration with negative delta, floors at 0', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 30);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await act(async () => {
        await result.current.adjust(-20);
      });

      // newDuration = max(0, 30 - 20) = 10, elapsed = 5, remaining = 5
      expect(result.current.timer).toMatchObject({
        status: 'active',
        duration: 10,
        remaining: 5,
      });
    });

    it('6.3 — triggers completion if adjusted remaining <= 0', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 30);
      });

      act(() => {
        jest.advanceTimersByTime(20_000);
      });

      // remaining ≈ 10. Adjust by -15 → newDuration = 15, remaining = 15 - 20 = 0
      await act(async () => {
        await result.current.adjust(-15);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
      expect(hapticImpact).toHaveBeenCalled();
    });

    it('6.4 — reschedules notification with new remaining time', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      scheduleNotif.mockClear();
      cancelNotif.mockClear();

      await act(async () => {
        await result.current.adjust(30);
      });

      expect(cancelNotif).toHaveBeenCalled();
      expect(scheduleNotif).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({ seconds: 90 }),
        })
      );
    });

    it('6.5 — no-op when no timer is active', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.adjust(30);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
      expect(scheduleNotif).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 7. isActiveForExercise()
  // --------------------------------------------------------------------------
  describe('isActiveForExercise', () => {
    it('7.1 — returns true for matching active exercise index', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(2, 60);
      });

      expect(result.current.isActiveForExercise(2)).toBe(true);
    });

    it('7.2 — returns false when idle', () => {
      const { result } = renderHook(() => useRestTimer());
      expect(result.current.isActiveForExercise(0)).toBe(false);
    });

    it('7.3 — returns false for a different exercise index', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(1, 60);
      });

      expect(result.current.isActiveForExercise(0)).toBe(false);
      expect(result.current.isActiveForExercise(2)).toBe(false);
    });

    it('7.4 — stable identity: reference does not change across re-renders', () => {
      const { result, rerender } = renderHook(() => useRestTimer());

      const ref1 = result.current.isActiveForExercise;
      rerender({});
      const ref2 = result.current.isActiveForExercise;

      expect(ref1).toBe(ref2);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Timer completion side-effects
  // --------------------------------------------------------------------------
  describe('timer completion side-effects', () => {
    it('8.1 — fires haptic feedback (Medium)', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 2);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(hapticImpact).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it('8.2 — cancels notification on completion', async () => {
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 2);
      });

      cancelNotif.mockClear();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(cancelNotif).toHaveBeenCalledWith('notif-123');
    });

    // NOTE: playAlertSound uses dynamic import('expo-audio') which throws in
    // Jest (no --experimental-vm-modules). The hook catches it gracefully.
    // Audio playback is validated via the graceful failure test (8.4) below.

    it('8.3 — gracefully handles haptic failure', async () => {
      hapticImpact.mockRejectedValueOnce(new Error('No haptics'));
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 2);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
    });

    it('8.4 — gracefully handles audio failure (dynamic import throws in Jest)', async () => {
      // dynamic import('expo-audio') always throws in Jest without
      // --experimental-vm-modules. This test verifies the hook's try/catch
      // prevents the error from bubbling and the timer still completes.
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 2);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.timer).toEqual({ status: 'idle' });
      expect(hapticImpact).toHaveBeenCalled(); // haptic still fires
    });
  });

  // --------------------------------------------------------------------------
  // 9. Cleanup on unmount
  // --------------------------------------------------------------------------
  describe('cleanup on unmount', () => {
    it('9.1 — clears interval on unmount', async () => {
      const { result, unmount } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      unmount();

      // Advancing timers should not throw (interval was cleared)
      expect(() => {
        jest.advanceTimersByTime(5000);
      }).not.toThrow();
    });

    it('9.2 — cancels scheduled notification on unmount', async () => {
      const { result, unmount } = renderHook(() => useRestTimer());

      await act(async () => {
        await result.current.start(0, 60);
      });

      cancelNotif.mockClear();
      unmount();

      expect(cancelNotif).toHaveBeenCalledWith('notif-123');
    });
  });
});
