---
status: diagnosed
phase: 05-active-workout
source: 05-UAT.md (round 1 retests), 05-UAT-round2.md (fix verification), 05-07-SUMMARY.md, 05-08-SUMMARY.md
started: 2026-02-14T00:00:00Z
updated: 2026-02-14T01:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Start Workout from Template
expected: Tap "Start" on a template card. App navigates to workout screen showing all template exercises with weight/reps inputs and done checkboxes for each set.
result: pass

### 2. Log a Set (Mark Done)
expected: Enter weight and reps values in a set row, then tap the done checkbox. The row styling changes to a muted/dimmed appearance (content at 60% opacity) and a rest timer bar starts automatically below the exercise card.
result: pass

### 3. Completed Set Row Appearance
expected: After marking a set done, the set row content appears muted (60% opacity) but the red delete swipe area is NOT visible through the row. The row remains fully opaque as a container -- only the text/inputs inside appear dimmed.
result: pass

### 4. Rest Timer Countdown
expected: After marking a set done, a rest timer bar appears showing a countdown in MM:SS format with a shrinking progress fill. The time counts down from the exercise's configured rest time.
result: pass

### 5. Timer +/-10s Adjustment
expected: While a rest timer is counting down, tapping +10s adds 10 seconds. Tapping -10s subtracts 10 seconds. The bar and time display update immediately.
result: pass

### 6. Timer Bar Inactive State
expected: Before any set is marked done (timer never started), the rest timer bar for each exercise shows the full configured rest time (e.g., "1:30") with a completely full bar. It does NOT show "0:00" or an empty bar.
result: issue
reported: "rest time is full but not bar"
severity: minor

### 7. Timer Bar After Countdown Ends
expected: After a rest timer finishes counting down to 0, the timer bar resets to show the full configured rest time again (full bar, e.g., "1:30"). It does NOT stay at "0:00".
result: issue
reported: "timer reset, bar stays empty"
severity: minor

### 8. Swipe-to-Delete a Set
expected: Swipe left on a set row to reveal a red delete area. Tapping the delete area removes the set. Only one set row can be swiped open at a time -- swiping another row closes the first.
result: pass

### 9. Add a Set
expected: Tap "Add Set" button on an exercise card. A new empty set row appears below the existing sets with blank weight/reps inputs and an unchecked done box.
result: pass

### 10. Add Exercise Mid-Workout
expected: Tap "Add Exercise" at the bottom of the workout. The exercise picker modal opens. Select an exercise and it appears as a new exercise card at the bottom of the workout with default set rows.
result: pass

### 11. Remove Exercise
expected: Tap the remove/delete control on an exercise card. A confirmation alert appears. Confirm to remove the exercise card entirely from the workout.
result: pass

### 12. Collapse and Expand Exercise Card
expected: Tap an exercise card header to collapse it -- only the header with exercise name and a progress ring (showing completed/total sets) remains visible. Tap again to expand, revealing all set rows and controls.
result: pass

### 13. Finish Workout
expected: With at least one completed set, tap the Finish button. A confirmation modal appears. Confirm to save the workout -- app returns to the dashboard. If you changed the template structure (added/removed sets or exercises), you get prompted to update the template.
result: pass

### 14. Cancel Workout
expected: Tap Cancel (or back). A confirmation dialog asks if you want to discard the workout. Confirm to discard -- app returns to the dashboard with no workout saved.
result: pass

### 15. Crash Recovery
expected: Start a workout and enter some data (weight/reps, mark a set done). Force-kill the app (swipe up from app switcher). Relaunch the app. The dashboard shows a resume modal with the template name and how long ago it started. Tap Resume to return to the workout with all previously entered data intact.
result: pass

### 16. Background Timer Notification
expected: Start a rest timer (mark a set done), then background the app (go to home screen). When the timer completes, a local notification appears on the device alerting you that rest time is up.
result: pass

## Summary

total: 16
passed: 14
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Timer bar should display full fill when inactive (timerRemaining === timerTotal)"
  status: failed
  reason: "User reported: rest time text is full but bar fill is not full/empty"
  severity: minor
  test: 6
  root_cause: "RestTimerBar.tsx line 72: inactive fill color is bgElevated (#27272a) which is nearly identical to the track color border (#2a2a2a). The fill is at 100% width but invisible because colors are the same shade."
  artifacts:
    - path: "src/components/RestTimerBar.tsx"
      issue: "Line 72: backgroundColor when !isActive is theme.colors.bgElevated, same shade as track"
  missing:
    - "Change inactive fill color to a visible color (e.g. accent or textMuted) that contrasts with the border track"
  debug_session: ""

- truth: "Timer bar should reset to full fill when countdown ends"
  status: failed
  reason: "User reported: timer text reset, bar stays empty"
  severity: minor
  test: 7
  root_cause: "Same root cause as Test 6 — inactive fill color blends with track background"
  artifacts:
    - path: "src/components/RestTimerBar.tsx"
      issue: "Same line 72: inactive state fill color indistinguishable from track"
  missing:
    - "Same fix as Test 6"
  debug_session: ""

- truth: "Timer bar should be significantly thicker (closer to button height)"
  status: feedback
  reason: "User feedback: bar needs to be significantly thicker, almost as much height as the +/-10s buttons"
  severity: cosmetic
  test: 4
  root_cause: "RestTimerBar.tsx barTrack height is 8px, buttons are 44px min height. Track needs to be much taller."
  artifacts:
    - path: "src/components/RestTimerBar.tsx"
      issue: "Line 132: barTrack height: 8 — too thin compared to 44px buttons"
  missing:
    - "Increase barTrack height significantly (e.g., 28-32px) to match button prominence"
  debug_session: ""
