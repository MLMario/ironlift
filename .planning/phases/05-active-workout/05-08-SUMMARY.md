---
phase: 05-active-workout
plan: "08"
subsystem: active-workout-ui
tags: [bug-fix, opacity, rest-timer, cosmetic]
dependency-graph:
  requires: ["05-03", "05-04", "05-05"]
  provides: ["Polished completed set rows", "Correct rest timer bar inactive/end state"]
  affects: []
tech-stack:
  added: []
  patterns: ["Inner content opacity for swipe-behind-layer preservation"]
key-files:
  created: []
  modified:
    - src/components/WorkoutSetRow.tsx
    - app/workout.tsx
decisions: []
metrics:
  duration: "~1 min"
  completed: "2026-02-14"
---

# Phase 5 Plan 8: UAT Round 2 Gap Closure (Cosmetic Fixes) Summary

**One-liner:** Fix completed set opacity leak revealing delete button, and rest timer bar showing 0:00 when inactive or after countdown.

## What Was Done

### Task 1: Fix opacity leak on completed set rows
- **Problem:** `rowDone` style applied `opacity: 0.6` to the `Animated.View` (rowOuter) which slides over the delete button layer. Making it semi-transparent revealed the red delete button underneath completed sets.
- **Fix:** Moved opacity from `Animated.View` (rowOuter) to the inner `row` View. Renamed style from `rowDone` to `rowContentDone`. The outer container stays fully opaque, hiding the delete layer; the inner content gets the visual muting effect.
- **Commit:** `f77391c`

### Task 2: Fix rest timer bar inactive and end state display
- **Problem:** `getTimerProps()` returned `{ timerRemaining: 0, timerTotal: 0 }` when timer was inactive, causing RestTimerBar to show "0:00" with an empty bar. Same issue after countdown completed -- timer stayed at 0:00 instead of resetting.
- **Fix:** When timer is not active, return `exercise.rest_seconds` for both `timerRemaining` and `timerTotal`. This makes RestTimerBar compute 100% fill and display the configured rest time (e.g., "1:30").
- **Commit:** `ab3e440`

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix opacity leak on completed set rows | f77391c | src/components/WorkoutSetRow.tsx |
| 2 | Fix rest timer bar inactive/end state | ab3e440 | app/workout.tsx |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with no errors
- WorkoutSetRow.tsx: Animated.View has no opacity style; inner row View has conditional `rowContentDone` opacity
- workout.tsx: `getTimerProps` returns `exercise.rest_seconds` (not 0) when timer is inactive

## Self-Check: PASSED
