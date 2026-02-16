---
status: complete
phase: 05-active-workout
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md
started: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete - 10 tests blocked by Test 1, retest after fix]

## Tests

### 1. Start Workout from Template
expected: Tap "Start" on a template card. App navigates to workout screen showing all template exercises with weight/reps inputs and done checkboxes for each set.
result: issue
reported: "Workout screen appears with no exercises"
severity: major

### 2. Log a Set (Mark Done)
expected: Enter weight and reps values in a set row, then tap the done checkbox. The row styling changes to indicate completion (muted/checked appearance) and a rest timer bar starts automatically below the exercise card.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 3. Rest Timer with Adjustment
expected: After marking a set done, a rest timer bar appears showing a countdown (MM:SS format) with a shrinking progress fill. Tapping +10s adds 10 seconds to the timer. Tapping -10s subtracts 10 seconds.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 4. Swipe-to-Delete a Set
expected: Swipe left on a set row to reveal a red delete area. Tapping the delete area removes the set. Only one set row can be swiped open at a time -- swiping another row closes the first.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 5. Add a Set
expected: Tap "Add Set" button on an exercise card. A new empty set row appears below the existing sets with blank weight/reps inputs and an unchecked done box.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 6. Add Exercise Mid-Workout
expected: Tap "Add Exercise" at the bottom of the workout. The exercise picker modal opens. Select an exercise and it appears as a new exercise card at the bottom of the workout with default set rows.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 7. Remove Exercise
expected: Tap the remove/delete control on an exercise card. A confirmation alert appears. Confirm to remove the exercise card entirely from the workout.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 8. Collapse and Expand Exercise Card
expected: Tap an exercise card header to collapse it -- only the header with exercise name and a progress ring (showing completed/total sets) remains visible. Tap the header again to expand it back, revealing all set rows and controls.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 9. Finish Workout
expected: With at least one completed set, tap the Finish button. A confirmation modal appears. Confirm to save the workout -- app returns to the dashboard. If you changed the template structure (added/removed sets or exercises), you get prompted to update the template before saving.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 10. Cancel Workout
expected: Tap Cancel (or back). A confirmation dialog asks if you want to discard the workout. Confirm to discard -- app returns to the dashboard with no workout saved.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

### 11. Crash Recovery
expected: Start a workout and enter some data (weight/reps, mark a set done). Force-kill the app (swipe up from app switcher). Relaunch the app. The dashboard shows a resume modal with the template name and how long ago the workout started. Tap Resume to return to the workout screen with all previously entered data intact. Alternatively, tap Discard to clear the saved workout.
result: issue
reported: "it doesnt work"
severity: major

### 12. Background Timer Notification
expected: Start a rest timer (mark a set done), then background the app (go to home screen). When the timer completes, a local notification appears on the device alerting you that rest time is up.
result: skipped
reason: Blocked by Test 1 -- exercises not visible on workout screen

## Summary

total: 12
passed: 0
issues: 2
pending: 0
skipped: 10

## Gaps

- truth: "Workout screen shows all exercises from the template with weight/reps inputs and done checkboxes"
  status: failed
  reason: "User reported: Workout screen appears with no exercises"
  severity: major
  test: 1
  root_cause: "Race condition: useWorkoutState initialization useEffect has empty deps [], but template is loaded async from cache. By the time template arrives, the init effect has already fired with template=undefined and never re-runs."
  artifacts:
    - path: "src/hooks/useWorkoutState.ts"
      issue: "Line 154: useEffect dependency array is [] — needs template and restoredWorkout"
    - path: "app/workout.tsx"
      issue: "Lines 72-127: async template loading means template is undefined on first render"
  missing:
    - "Add template and restoredWorkout to useEffect deps with isInitialized guard flag"
  debug_session: ".planning/debug/workout-no-exercises.md"
- truth: "Dashboard shows resume modal after app is killed mid-workout and relaunched"
  status: failed
  reason: "User reported: it doesnt work"
  severity: major
  test: 11
  root_cause: "Cascading from Test 1. Workout never initializes so backup.save() guards reject (started_at=null, exercises.length=0). Nothing saved to AsyncStorage, nothing to recover."
  artifacts:
    - path: "src/hooks/useWorkoutState.ts"
      issue: "Line 154: same empty deps [] root cause as Test 1"
  missing:
    - "Same fix as Test 1 resolves this -- add template/restoredWorkout to useEffect deps"
  debug_session: ".planning/debug/crash-recovery-not-working.md"
