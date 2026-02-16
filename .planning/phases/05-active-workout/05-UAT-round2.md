---
status: diagnosed
phase: 05-active-workout
source: user-reported (direct gap reporting, round 2)
started: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Test

[testing complete - user reported gaps directly]

## Tests

### 1. Delete icon visibility on set completion
expected: When completing (checking) a set, the delete trash icon should remain hidden/invisible
result: issue
reported: "When completing a set during a workout session the delete trash icon becomes slightly visible (becomes visible in the background)"
severity: cosmetic

### 2. Timer bar inactive state display
expected: When the rest timer bar is not active, it should display at its full rest time value (full bar), not at 0
result: issue
reported: "When a timer bar is not active it appears as 0 and it's not full, it should appear with its full value when it's not active"
severity: minor

### 3. Timer bar end state
expected: When the rest timer finishes counting down to 0, it should reset back to showing the full rest time value (full bar)
result: issue
reported: "When the timer ends, it stays at 0, it should go back to its full value"
severity: minor

## Summary

total: 3
passed: 0
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Delete trash icon should remain hidden when completing a set"
  status: failed
  reason: "User reported: When completing a set during a workout session the delete trash icon becomes slightly visible (becomes visible in the background)"
  severity: cosmetic
  test: 1
  root_cause: "rowDone style applies opacity: 0.6 to the entire Animated.View (rowOuter), making it semi-transparent and revealing the red deleteButtonBehind layer underneath even when the row is not swiped"
  artifacts:
    - path: "src/components/WorkoutSetRow.tsx"
      issue: "Lines 200-205: rowOuter Animated.View has isDone && styles.rowDone applied; Lines 302-304: rowDone sets opacity: 0.6 on entire container"
  missing:
    - "Move opacity from rowOuter container to inner content elements only, so the delete layer behind stays hidden"
  debug_session: ".planning/debug/delete-icon-visible-when-done.md"

- truth: "Timer bar should display full configured rest time when inactive"
  status: failed
  reason: "User reported: When a timer bar is not active it appears as 0 and it's not full, it should appear with its full value when it's not active"
  severity: minor
  test: 2
  root_cause: "getTimerProps() in workout.tsx returns timerTotal: 0 when timer is inactive, instead of exercise.rest_seconds"
  artifacts:
    - path: "app/workout.tsx"
      issue: "Lines 464-478: getTimerProps returns timerTotal: 0 and timerRemaining: 0 when timer is not active for the exercise"
  missing:
    - "Return exercise.rest_seconds for both timerRemaining and timerTotal when timer is inactive"
  debug_session: ".planning/debug/rest-timer-display-bugs.md"

- truth: "Timer bar should reset to full value when countdown ends"
  status: failed
  reason: "User reported: When the timer ends, it stays at 0, it should go back to its full value"
  severity: minor
  test: 3
  root_cause: "Same root cause as Test 2 -- getTimerProps() returns 0/0 when timer transitions to idle after completion"
  artifacts:
    - path: "app/workout.tsx"
      issue: "Lines 464-478: getTimerProps returns timerTotal: 0 and timerRemaining: 0 when timer status is idle (after completion)"
  missing:
    - "Same fix as Test 2 -- return exercise.rest_seconds when timer is inactive/idle"
  debug_session: ".planning/debug/rest-timer-display-bugs.md"
