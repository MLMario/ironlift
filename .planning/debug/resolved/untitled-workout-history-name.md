---
status: resolved
trigger: "Workout history entries show 'untitled workout' for template names even though templates always have titles"
created: 2026-02-16T00:00:00Z
updated: 2026-02-16T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED - Stale closure in handleTemplateUpdateConfirm/Cancel causes template_id to be null
test: Fix applied and verified via TypeScript compilation
expecting: N/A - resolved
next_action: Archive session

## Symptoms

expected: All workout history entries should display the template name that was used for the workout
actual: Some workout history entries show "untitled workout" instead of the actual template name. Intermittent.
errors: No error messages reported
reproduction: Complete workouts using templates that have names. Some save correctly, some show "untitled workout".
started: Has never worked correctly — bug since feature was built.

## Eliminated

- hypothesis: template_id not passed in WorkoutLogInput
  evidence: saveWorkoutAndCleanup correctly sets template_id from activeWorkout.template_id
  timestamp: 2026-02-16T00:00:30Z

- hypothesis: Database schema missing template_name column (denormalization issue)
  evidence: Design is intentional - template name resolved via FK join at read time. Join works correctly when template_id is non-null.
  timestamp: 2026-02-16T00:00:30Z

- hypothesis: Template deleted causing null join
  evidence: FK constraint is RESTRICT (no ON DELETE clause), so templates with workout references cannot be deleted
  timestamp: 2026-02-16T00:00:30Z

- hypothesis: Offline write queue losing template_id
  evidence: writeQueue serializes full WorkoutLogInput via JSON, template_id preserved through serialize/deserialize
  timestamp: 2026-02-16T00:00:30Z

- hypothesis: RLS policy preventing template join
  evidence: Same user owns both workout_logs and templates, RLS allows access
  timestamp: 2026-02-16T00:00:30Z

## Evidence

- timestamp: 2026-02-16T00:00:10Z
  checked: workout_logs schema (sql/current_schema.sql)
  found: No template_name column. Template name resolved via FK join on template_id -> templates.id
  implication: If template_id is null, join returns null, card shows "Untitled Workout"

- timestamp: 2026-02-16T00:00:15Z
  checked: createWorkoutLog in logging.ts line 95
  found: template_id: template_id || null -- falsy values coerced to null
  implication: If template_id is null/undefined when saving, it stores null in database

- timestamp: 2026-02-16T00:00:20Z
  checked: useWorkoutState.ts initial state (line 96-101)
  found: Initial activeWorkout has template_id: null, template_name: ''
  implication: Any code capturing initial state via closure would have null template_id

- timestamp: 2026-02-16T00:00:25Z
  checked: handleTemplateUpdateConfirm and handleTemplateUpdateCancel (workout.tsx lines 320-330)
  found: Both useCallback with EMPTY dependency arrays []. They capture saveWorkoutAndCleanup from initial render.
  implication: These handlers always use the initial saveWorkoutAndCleanup which closes over initial activeWorkout where template_id=null

- timestamp: 2026-02-16T00:00:30Z
  checked: handleFinishConfirm (workout.tsx line 309)
  found: Deps include activeWorkout.template_id but NOT saveWorkoutAndCleanup. However, when it calls saveWorkoutAndCleanup(false) directly, it may have a recent enough version.
  implication: Direct finish path (no template changes) may work, but template update modal path always fails

- timestamp: 2026-02-16T00:00:35Z
  checked: Intermittent behavior pattern
  found: Bug only triggers when user makes structural changes (add/remove exercises/sets) during workout, causing template update modal to appear
  implication: Explains intermittency - workouts without structural changes save correctly; workouts with structural changes save with template_id=null

- timestamp: 2026-02-16T00:02:00Z
  checked: TypeScript compilation after fix
  found: npx tsc --noEmit passes (only pre-existing ChartCard.tsx error remains)
  implication: Fix is syntactically and type-correct

## Resolution

root_cause: Stale closure bug in app/workout.tsx. handleTemplateUpdateConfirm and handleTemplateUpdateCancel used useCallback with empty dependency arrays []. They captured the initial version of saveWorkoutAndCleanup, which itself closed over the initial activeWorkout state where template_id=null. When these handlers fired (after user responded to "Update Template?" modal), they called saveWorkoutAndCleanup with a stale activeWorkout, saving template_id as null to the database. The getWorkoutLogsPaginated join on templates then returned null for template_name, and WorkoutHistoryCard rendered "Untitled Workout". handleFinishConfirm also had a missing saveWorkoutAndCleanup dependency.

fix: (1) Moved saveWorkoutAndCleanup definition above the handlers that reference it (was declared after, causing TypeScript block-scoped variable errors when added to deps). (2) Added saveWorkoutAndCleanup to dependency arrays of handleFinishConfirm, handleTemplateUpdateConfirm, and handleTemplateUpdateCancel. (3) Removed eslint-disable-next-line comments that were masking the missing dependency warnings.

verification: TypeScript compilation passes. The fix ensures all finish-flow handlers always reference the current saveWorkoutAndCleanup, which closes over the current activeWorkout containing the correct template_id. Manual device testing required to confirm end-to-end.

files_changed:
  - app/workout.tsx
