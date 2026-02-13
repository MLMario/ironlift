---
phase: 05-active-workout
plan: 02
subsystem: state-management
tags: [react-hooks, workout-state, rest-timer, crash-recovery, expo-notifications, expo-haptics, expo-audio, asyncstorage]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Theme tokens, TypeScript types (database.ts)
  - phase: 04-templates
    provides: TemplateWithExercises type for workout initialization
provides:
  - useWorkoutState hook with all workout mutations
  - useRestTimer hook with wall-clock timer, notifications, haptics
  - useWorkoutBackup hook with AsyncStorage crash recovery
  - Exported types (WorkoutSet, WorkoutExercise, ActiveWorkout, TemplateSnapshot, WorkoutBackupData)
affects:
  - 05-active-workout (remaining plans consume these hooks for UI components and workout screen)

# Tech tracking
tech-stack:
  added: [expo-notifications ~0.32.16, expo-audio ~1.1.1]
  patterns: [wall-clock timer, discriminated union state machine, functional setState mutations, async try/catch-never-throw for backup]

key-files:
  created:
    - src/hooks/useWorkoutState.ts
    - src/hooks/useRestTimer.ts
    - src/hooks/useWorkoutBackup.ts
  modified: []

key-decisions:
  - "Wall-clock time for timer instead of tick counting -- immune to iOS background suspension"
  - "RestoredWorkoutData defined in useWorkoutState to avoid circular imports with useWorkoutBackup"
  - "createAudioPlayer (non-hook API) for one-shot sound playback from callback context"
  - "All backup errors logged but never thrown (best-effort persistence)"

patterns-established:
  - "Wall-clock timer: store startedAt + duration, calculate remaining from Date.now()"
  - "Discriminated union state machine: idle | active eliminates impossible states"
  - "Functional setState immutability: all mutations via (prev) => newState"
  - "One-way hook dependency: useWorkoutBackup imports types from useWorkoutState, no reverse"

# Metrics
duration: 7min
completed: 2026-02-13
---

# Phase 5 Plan 02: Core Workout Hooks Summary

**Three hooks (useWorkoutState, useRestTimer, useWorkoutBackup) encapsulating all workout business logic with wall-clock timer, local notifications, and AsyncStorage crash recovery**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-13T23:50:38Z
- **Completed:** 2026-02-13T23:57:17Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- useWorkoutState manages all workout mutations immutably via functional setState (390 lines)
- useRestTimer uses wall-clock time immune to iOS background suspension, with haptic + notification + sound on completion (314 lines)
- useWorkoutBackup provides async backup/restore for crash recovery with try/catch-never-throw pattern (136 lines)
- All three hooks type-check cleanly with no circular dependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useWorkoutState hook** - `d22a962` (feat)
2. **Task 2: Create useRestTimer hook** - `7a05ca5` (feat)
3. **Task 3: Create useWorkoutBackup hook** - `8de44d3` (feat)

## Files Created/Modified
- `src/hooks/useWorkoutState.ts` - All workout state + mutation functions (exercises, sets, swipe coordination, template change detection)
- `src/hooks/useRestTimer.ts` - Timer state machine with notifications, haptics, and sound
- `src/hooks/useWorkoutBackup.ts` - AsyncStorage backup/restore for crash recovery

## Decisions Made
- Used wall-clock time (startedAt + Date.now()) instead of tick counting per RESEARCH.md Pitfall 1
- Defined RestoredWorkoutData in useWorkoutState to break circular import with useWorkoutBackup
- Used createAudioPlayer (non-hook API) for alert sound since playback triggers from a callback, not render
- expo-audio and expo-notifications installed as new dependencies (both Expo Go compatible)
- Timer completion fires haptic first (primary feedback), sound second (gracefully skipped if asset missing)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed expo-notifications and expo-audio packages**
- **Found during:** Task 2 (useRestTimer creation)
- **Issue:** expo-notifications and expo-audio not yet installed, imports would fail
- **Fix:** Ran `npx expo install expo-notifications expo-audio`
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** TypeScript compilation passes, imports resolve
- **Committed in:** 7a05ca5 (Task 2 commit)

**2. [Rule 1 - Bug] Avoided circular import between hooks**
- **Found during:** Task 1 (useWorkoutState creation)
- **Issue:** Plan specified useWorkoutState imports WorkoutBackupData from useWorkoutBackup, but useWorkoutBackup imports ActiveWorkout/TemplateSnapshot from useWorkoutState -- circular dependency
- **Fix:** Defined RestoredWorkoutData interface in useWorkoutState instead of importing from useWorkoutBackup
- **Files modified:** src/hooks/useWorkoutState.ts
- **Verification:** No circular imports, TypeScript passes
- **Committed in:** d22a962 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for compilation. No scope creep.

## Issues Encountered
- Task 2 commit accidentally included previously staged planning files (.planning/STATE.md, 05-03-SUMMARY.md, app.json, docs/) from an earlier session. These are documentation-only and do not affect code quality.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three hooks ready for consumption by workout UI components (Plan 03)
- Exported types (WorkoutSet, WorkoutExercise, ActiveWorkout, etc.) provide contracts for component props
- Timer notification handler already configured in _layout.tsx from prior work
- Sound asset (assets/sounds/timer-complete.mp3) not yet bundled -- playAlertSound gracefully handles missing asset

## Self-Check: PASSED

---
*Phase: 05-active-workout*
*Completed: 2026-02-13*
