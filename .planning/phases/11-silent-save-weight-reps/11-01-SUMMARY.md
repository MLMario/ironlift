---
phase: 11-silent-save-weight-reps
plan: 01
subsystem: workout-template-sync
tags: [silent-save, weight-reps, templates, workout-finish, cache-refresh]
requires: []
provides:
  - updateTemplateExerciseSetValues service function
  - getWeightRepsChanges hook method
  - saveWeightRepsChanges wired into workout finish flow
affects:
  - Future phases modifying workout finish flow
  - Future phases modifying template update logic
tech-stack:
  added: []
  patterns:
    - Best-effort silent save (matches rest timer pattern)
    - Template cache refresh after successful silent saves
key-files:
  created: []
  modified:
    - src/services/templates.ts
    - src/hooks/useWorkoutState.ts
    - app/workout.tsx
key-decisions:
  - No auth check in updateTemplateExerciseSetValues (RLS handles authorization, best-effort pattern)
  - Always overwrite completed sets (no diff against template values)
  - Cache refresh via getTemplates() + setCachedTemplates() after successful saves
  - Combined import to avoid lint duplicate-import warning
duration: ~2m 45s
completed: 2026-02-17
---

# Phase 11 Plan 01: Silent Save Weight/Reps Summary

**One-liner:** Best-effort silent save of completed set weight/reps to template on workout finish, with template cache refresh

## Performance

- **Duration:** ~2 min 45 sec
- **Start:** 2026-02-17T02:00:34Z
- **End:** 2026-02-17T02:03:19Z
- **Tasks:** 2/2 completed
- **Files modified:** 3

## Accomplishments

1. Added `updateTemplateExerciseSetValues()` standalone export in `templates.ts` -- performs targeted updates on `template_exercise_sets` by looking up `template_exercise_id` first, then updating each set by `(template_exercise_id, set_number)`.

2. Added `getWeightRepsChanges()` to `useWorkoutState` hook -- collects all completed (is_done) sets within template bounds (set_number <= template set count) for exercises that existed in the original template snapshot.

3. Added `saveWeightRepsChanges()` in `workout.tsx` -- wired into `saveWorkoutAndCleanup(false)` alongside `saveRestTimeChanges()`. Only fires when `shouldUpdateTemplate === false`. After successful saves, refreshes the template cache so next workout uses updated values.

4. Exported `TemplateSetValueUpdate` interface for type-safe set update payloads.

## Task Commits

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add service function and hook change detection | `39def20` | templates.ts: updateTemplateExerciseSetValues + TemplateSetValueUpdate; useWorkoutState.ts: getWeightRepsChanges |
| 2 | Wire silent save into workout finish flow with cache refresh | `d4858b0` | workout.tsx: saveWeightRepsChanges, imports, dependency array, lint fixes |

## Files Modified

| File | Changes |
|------|---------|
| `src/services/templates.ts` | Added `TemplateSetValueUpdate` interface and `updateTemplateExerciseSetValues()` standalone export below the templates service object |
| `src/hooks/useWorkoutState.ts` | Added `getWeightRepsChanges()` callback, added to hook return object |
| `app/workout.tsx` | Added import for `updateTemplateExerciseSetValues` and `setCachedTemplates`, destructured `getWeightRepsChanges`, added `saveWeightRepsChanges()` function, wired into `saveWorkoutAndCleanup`, updated dependency array |

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | No auth check in `updateTemplateExerciseSetValues` | Best-effort silent save -- user is already authenticated (just completed a workout). RLS handles authorization at the database level. If Supabase call fails due to auth, it fails silently which is correct. |
| 2 | Cache refresh after successful saves | Prevents stale weight/reps if user immediately starts the same template again. Uses `getTemplates()` + `setCachedTemplates()`. Falls back gracefully if offline. |
| 3 | `T[]` syntax instead of `Array<T>` | Project lint rules require this style. Fixed during Task 2. |
| 4 | Combined import from templates | Avoided `import/no-duplicates` lint warning by combining `templatesService` and `updateTemplateExerciseSetValues` into a single import statement. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed lint warnings in new code**

- **Found during:** Task 2 verification
- **Issue:** Duplicate import from `@/services/templates` triggered `import/no-duplicates` warning. `Array<T>` syntax in `getWeightRepsChanges` triggered `@typescript-eslint/array-type` warnings.
- **Fix:** Combined imports into single line. Changed `Array<T>` to `T[]` syntax in `getWeightRepsChanges`.
- **Files modified:** `app/workout.tsx`, `src/hooks/useWorkoutState.ts`
- **Commit:** `d4858b0`

## Issues Encountered

None.

## Next Phase Readiness

- **Blockers:** None
- **Dependencies satisfied:** All weight/reps silent save functionality is complete and wired in
- **Testing note:** Manual testing on device recommended to verify end-to-end flow (change weight during workout, finish, start same template again, confirm new values appear)

## Self-Check: PASSED
