---
phase: 09-timer-fixes
plan: 02
subsystem: ui, components
tags: [react-native, TextInput, timer, state-machine, RestTimerBar, WorkoutExerciseCard]

# Dependency graph
requires:
  - phase: 09-timer-fixes
    provides: Shared time utilities (formatTime, parseTimeInput, clampSeconds) in src/lib/timeUtils.ts
  - phase: 05-active-workout
    provides: RestTimerBar component, WorkoutExerciseCard component, useRestTimer hook
provides:
  - Three-state RestTimerBar (INACTIVE/EDITING/ACTIVE) with inline TextInput editing
  - WorkoutExerciseCard with new timer props and correct isExpanded default
affects: [09-03-PLAN (workout.tsx wiring to pass new RestTimerBar props)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-state bar component: local mode state + isActive prop determines effective display"
    - "Inline TextInput editing within progress bar overlay layer"
    - "onPressIn for +/-10s buttons to prevent blur race condition during editing"
    - "wasActiveBeforeEdit ref tracks timer state across edit session for restart logic"

key-files:
  created: []
  modified:
    - src/components/RestTimerBar.tsx
    - src/components/WorkoutExerciseCard.tsx

key-decisions:
  - "onPressIn used for +/-10s buttons (not onPress) to prevent blur-before-press race condition"
  - "handleAdjustNormal calls BOTH onRestTimeChange (persist) and onAdjust (adjust countdown) during active timer"
  - "Unparseable input on blur: revert rest time, restart timer from original value if was active"
  - "isExpanded default fixed from false to true (bug fix per decision [05-04])"

patterns-established:
  - "Three-state bar: mode='inactive'|'editing' + isActive prop -> effectiveMode='inactive'|'editing'|'active'"
  - "Blur-to-confirm editing pattern: TextInput onBlur triggers parse/validate/clamp/persist cycle"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 9 Plan 02: RestTimerBar UI States Summary

**Three-state RestTimerBar (INACTIVE/EDITING/ACTIVE) with inline TextInput editing, tappable time text, and WorkoutExerciseCard prop wiring with isExpanded fix**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-16T17:24:40Z
- **Completed:** 2026-02-16T17:26:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rewrote RestTimerBar as three-state component: INACTIVE (full bar, tappable time text), EDITING (inline TextInput with autoFocus), ACTIVE (countdown with tappable pause-to-edit)
- Implemented complete handler suite: handleTimeTextPress, handleBlur, handleAdjustInEditMode, handleAdjustNormal with proper routing based on mode
- Fixed WorkoutExerciseCard isExpanded default from false to true (aligning with decision [05-04])
- Added restSeconds, onRestTimeChange, onTimerPause, onTimerRestart props to WorkoutExerciseCard and passed through to RestTimerBar

## Task Commits

Each task was committed atomically:

1. **Task 1: Overhaul RestTimerBar state machine and rendering** - `a2921da` (feat)
2. **Task 2: Implement handlers and wire WorkoutExerciseCard** - `fcc8367` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/components/RestTimerBar.tsx` - Three-state timer bar with inline TextInput editing, shared utility imports, complete handler implementation
- `src/components/WorkoutExerciseCard.tsx` - New timer props (restSeconds, onRestTimeChange, onTimerPause, onTimerRestart), isExpanded default fixed to true

## Decisions Made
- Used `onPressIn` (not `onPress`) for +/-10s buttons to register immediately and prevent blur race condition when TextInput is focused during edit mode
- handleAdjustNormal calls BOTH `onRestTimeChange(newVal)` to persist the new base rest time AND `onAdjust(delta)` to adjust the running countdown when timer is active -- the two calls serve different purposes
- Unparseable input on blur reverts without changing rest time; if timer was active before edit, it restarts from original restSeconds value
- Progress bar fill color: textMuted for INACTIVE, accent for EDITING and ACTIVE -- provides clear visual state indication

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Expected TypeScript error in app/workout.tsx (missing new props) -- this is downstream and will be resolved by plan 09-03 (workout.tsx wiring). Pre-existing ChartCard.tsx TS2366 error also remains from before this phase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RestTimerBar and WorkoutExerciseCard ready for wiring in workout.tsx (plan 03)
- workout.tsx needs to pass restSeconds, onRestTimeChange, onTimerPause, onTimerRestart to each WorkoutExerciseCard
- handleAdjustTimer in workout.tsx needs update to also call updateRestSeconds when adjusting idle timer
- Silent rest time save on finish needs implementation in saveWorkoutAndCleanup (plan 03)
- Pre-existing ChartCard.tsx TS2366 error is unrelated

## Self-Check: PASSED

---
*Phase: 09-timer-fixes*
*Completed: 2026-02-16*
