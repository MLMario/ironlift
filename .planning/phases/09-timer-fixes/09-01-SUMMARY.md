---
phase: 09-timer-fixes
plan: 01
subsystem: hooks, utilities
tags: [react-native, timer, parsing, state-management, useCallback, useRef]

# Dependency graph
requires:
  - phase: 05-active-workout
    provides: useRestTimer hook, useWorkoutState hook, RestTimerInline component
provides:
  - Shared time parse/format/clamp utilities in src/lib/timeUtils.ts
  - useRestTimer.pause() for mid-countdown editing
  - useWorkoutState.updateRestSeconds() for session-scoped rest time mutation
  - useWorkoutState.getRestTimeChanges() for dirty tracking against original snapshot
  - TemplateSnapshot with rest_seconds per exercise
affects: [09-02-PLAN (RestTimerBar UI states), 09-03-PLAN (workout.tsx wiring and finish flow)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared utility extraction pattern: local component helpers -> src/lib/ module"
    - "null-return parsing: parseTimeInput returns null for unparseable (distinguishes from 0)"
    - "Timer pause pattern: freeze remaining in state, keep status active, stop interval/notification"
    - "Dirty tracking via snapshot comparison: original rest_seconds vs current for change detection"

key-files:
  created:
    - src/lib/timeUtils.ts
  modified:
    - src/components/RestTimerInline.tsx
    - src/hooks/useRestTimer.ts
    - src/hooks/useWorkoutState.ts

key-decisions:
  - "parseTimeInput returns null (not 0) for unparseable input -- enables revert-on-invalid behavior"
  - "pause() keeps timer.status as 'active' with frozen remaining -- parent sees paused state without new discriminated union value"
  - "TemplateSnapshot extended with rest_seconds (not separate tracking map) -- cleanest approach, backward-compatible with restored backups"

patterns-established:
  - "Shared time utilities imported from @/lib/timeUtils across components and hooks"
  - "null-return pattern for input parsing: null = unparseable, 0 = valid zero input"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 9 Plan 01: Timer Foundations Summary

**Shared time utilities (formatTime/parseTimeInput/clampSeconds), useRestTimer.pause(), and useWorkoutState rest time mutation with snapshot-based dirty tracking**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-16T17:19:04Z
- **Completed:** 2026-02-16T17:21:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extracted parseTimeInput and formatTime from RestTimerInline into shared src/lib/timeUtils.ts with enhanced null-return semantics
- Added pause() method to useRestTimer that freezes countdown at current remaining while keeping status active
- Added updateRestSeconds mutation and getRestTimeChanges dirty tracking to useWorkoutState
- Extended TemplateSnapshot with rest_seconds per exercise for change detection on workout finish

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared time utilities and update RestTimerInline** - `04989fc` (feat)
2. **Task 2: Add pause/restart to useRestTimer and rest time mutation to useWorkoutState** - `cd7f322` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/lib/timeUtils.ts` - Shared formatTime, parseTimeInput (null for unparseable), clampSeconds
- `src/components/RestTimerInline.tsx` - Imports from shared utility, reverts on unparseable input
- `src/hooks/useRestTimer.ts` - Added pause() that freezes timer remaining without resetting to idle
- `src/hooks/useWorkoutState.ts` - Added updateRestSeconds, getRestTimeChanges, rest_seconds in TemplateSnapshot

## Decisions Made
- parseTimeInput returns null for empty/whitespace/non-numeric input (was 0 before). This enables "unparseable -> revert" behavior per CONTEXT.md locked decision. "0" typed explicitly still parses to 0 (valid input, caller clamps to bounds).
- pause() keeps timer.status as 'active' rather than introducing a new 'paused' status. This simplifies the discriminated union and lets the parent detect paused state by checking isActive=true + frozen countdown.
- TemplateSnapshot extended with rest_seconds field (option a from research open questions). Backward-compatible with restored backups that lack the field -- getRestTimeChanges returns empty array when snapshot has no rest_seconds.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Shared utilities ready for import by RestTimerBar (plan 02)
- useRestTimer.pause() ready for mid-countdown editing flow (plan 02)
- updateRestSeconds and getRestTimeChanges ready for workout.tsx wiring (plan 03)
- Pre-existing ChartCard.tsx TS2366 error is unrelated (existed before this plan)

## Self-Check: PASSED

---
*Phase: 09-timer-fixes*
*Completed: 2026-02-16*
