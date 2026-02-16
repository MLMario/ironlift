---
status: investigating
trigger: "When the rest timer bar is not active (no timer running), it appears as '0' and the bar is not full. It should appear with its full configured rest time value and a full bar when inactive. When the rest timer finishes counting down to 0, it stays at 0. It should reset back to showing the full rest time value."
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: getTimerProps in workout.tsx returns 0/0 when timer is idle instead of exercise.rest_seconds
test: verified by reading workout.tsx lines 464-478
expecting: when timer is inactive for an exercise, should return exercise's configured rest_seconds
next_action: confirmed root cause

## Symptoms

expected: When timer is inactive, should show full bar (100% fill) with exercise's configured rest time (e.g., "1:30"). When timer completes, should reset to show full rest time again.
actual: When timer is inactive, shows "0:00" with empty bar. When timer completes, stays at "0:00" with empty bar.
errors: None - visual display bug only
reproduction:
1. Start a workout
2. Look at any exercise card - timer shows "0:00" instead of configured rest time
3. Complete a set - timer starts counting down correctly
4. Wait for timer to reach 0 - it stays at "0:00" instead of resetting to full time
started: Reported by user - present in current implementation

## Eliminated

N/A - root cause identified immediately

## Evidence

- timestamp: 2026-02-13T00:00:00Z
  checked: workout.tsx lines 464-478 (getTimerProps function)
  found: |
    When timer is inactive (isActive = false), returns:
    ```typescript
    return {
      timerRemaining: 0,
      timerTotal: 0,
      isTimerActive: false,
    };
    ```
    This causes RestTimerBar to display 0/0 = 0:00 with empty bar.
  implication: Need to pass exercise.rest_seconds as timerTotal even when timer is inactive

- timestamp: 2026-02-13T00:00:00Z
  checked: useRestTimer.ts lines 129-135 (onTimerComplete callback)
  found: |
    When timer completes:
    ```typescript
    const onTimerComplete = useCallback(() => {
      clearTimer();
      cancelNotification();
      fireHaptic();
      playAlertSound();
      setTimer({ status: 'idle' }); // Goes to idle state
    }, [clearTimer, cancelNotification, fireHaptic, playAlertSound]);
    ```
  implication: Timer correctly transitions to idle state, but getTimerProps then returns 0/0 for idle

- timestamp: 2026-02-13T00:00:00Z
  checked: RestTimerBar.tsx lines 42-47
  found: |
    Component correctly uses the props it receives:
    ```typescript
    const percentage = totalSeconds > 0
      ? (remainingSeconds / totalSeconds) * 100
      : 100;

    const displayTime = isActive ? formatTime(remainingSeconds) : formatTime(totalSeconds);
    ```
    When totalSeconds = 0, displays "0:00". Component logic is correct.
  implication: RestTimerBar is implemented correctly - bug is in what props it receives

- timestamp: 2026-02-13T00:00:00Z
  checked: WorkoutExerciseCard.tsx lines 183-188
  found: |
    Card passes props through directly from workout.tsx:
    ```typescript
    <RestTimerBar
      remainingSeconds={timerRemaining}
      totalSeconds={timerTotal}
      isActive={isTimerActive}
      onAdjust={onAdjustTimer}
    />
    ```
  implication: Exercise card is just a pass-through - fix belongs in workout.tsx

## Resolution

root_cause: |
  **Issue 1 (Inactive Display):** getTimerProps in workout.tsx (lines 474-477) returns timerRemaining: 0, timerTotal: 0 when timer is not active. Should return exercise.rest_seconds as timerTotal so RestTimerBar can display the configured rest time.

  **Issue 2 (End State):** When timer completes and transitions to 'idle' state, getTimerProps returns 0/0 for the same reason. Both issues share the same root cause.

fix: |
  In workout.tsx getTimerProps function (lines 464-478):
  - Change the inactive return to pass exercise.rest_seconds as timerTotal
  - Keep timerRemaining: 0 and isTimerActive: false for inactive state
  - RestTimerBar already has correct logic to show full bar when isActive=false and display totalSeconds

verification: |
  1. Start workout, verify timer bars show configured rest time (e.g., "1:30") with full bars
  2. Complete a set, verify timer counts down correctly
  3. Wait for timer to reach 0, verify it resets to show full rest time with full bar
  4. Check multiple exercises with different rest times to ensure correct values displayed

files_changed:
  - app/workout.tsx: Fix getTimerProps to pass exercise.rest_seconds when timer inactive
