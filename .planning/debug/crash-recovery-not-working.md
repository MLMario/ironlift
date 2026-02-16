---
status: diagnosed
trigger: "Crash Recovery Not Working - no resume modal on relaunch after force-kill"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - This is a cascading failure from the exercise loading bug in useWorkoutState, with no independent bugs in the crash recovery chain itself
test: Traced full backup save chain and dashboard restore chain
expecting: backup.save() never fires because exercises array is always empty
next_action: Return diagnosis

## Symptoms

expected: User starts workout, force-kills app, relaunches -- ResumeWorkoutModal appears on dashboard with Resume/Discard options
actual: No resume modal appears. Workout data is lost on force-kill.
errors: None (no crash, no error displayed)
reproduction: Start any workout from dashboard, force-kill app, relaunch
started: Since active workout screen was built (Phase 05)

## Eliminated

- hypothesis: Independent bug in dashboard crash recovery check (app/index.tsx)
  evidence: |
    The dashboard useEffect (lines 52-64) correctly calls backup.restore() on mount,
    checks for data, and sets showResumeModal=true. Code is sound. The problem is
    that restore() returns null because nothing was ever saved.
  timestamp: 2026-02-13T00:06:00Z

- hypothesis: Independent bug in useWorkoutBackup.restore()
  evidence: |
    restore() (lines 114-128) correctly reads from AsyncStorage, parses JSON,
    and returns the data. It returns null only when no data exists at the key --
    which is the correct behavior when nothing was saved.
  timestamp: 2026-02-13T00:06:30Z

- hypothesis: Independent bug in ResumeWorkoutModal not rendering
  evidence: |
    ResumeWorkoutModal (lines 54-108) is a standard Modal component controlled by
    the `visible` prop. The dashboard correctly passes showResumeModal as visible.
    The modal never shows because showResumeModal is never set to true, because
    backup.restore() returns null, because nothing was saved.
  timestamp: 2026-02-13T00:07:00Z

- hypothesis: Bug in backup.save() guard conditions independently blocking saves
  evidence: |
    The save() guards (lines 71-74) check: no userId, no started_at, no exercises.
    The userId guard is fine (user is authenticated). The started_at guard would pass
    IF the workout initialized properly. The exercises guard would pass IF exercises loaded.
    Both guards fail as a CONSEQUENCE of the useWorkoutState race condition, not independently.
  timestamp: 2026-02-13T00:07:30Z

## Evidence

- timestamp: 2026-02-13T00:01:00Z
  checked: app/workout.tsx backup save trigger mechanism (lines 162-180)
  found: |
    Backup saves are triggered by a counter pattern:
    1. backupTrigger state (line 163) starts at 0
    2. triggerBackup() (line 178) increments it
    3. useEffect on backupTrigger (lines 166-176) calls backup.save(activeWorkout, originalTemplateSnapshot)
    4. First render is skipped via isFirstRender ref (lines 164, 168-171)
    5. triggerBackup() is called from: handleToggleDone, handleAddSet, handleDeleteSet,
       handleRemoveExercise, handleSelectExercise -- all MEANINGFUL actions
  implication: The trigger mechanism is correctly designed. But backup.save() receives activeWorkout as its argument.

- timestamp: 2026-02-13T00:02:00Z
  checked: What activeWorkout contains when backup.save() would be called
  found: |
    Due to the useWorkoutState race condition (see workout-no-exercises.md):
    - activeWorkout.started_at = null (never initialized)
    - activeWorkout.exercises = [] (never populated)
    The useWorkoutState initialization useEffect([]) fires on mount when template is
    still undefined, and never re-fires when template loads asynchronously.
  implication: activeWorkout is permanently in its default empty state

- timestamp: 2026-02-13T00:03:00Z
  checked: useWorkoutBackup.save() guard conditions (lines 71-74)
  found: |
    Guard 1: `if (!key) return` -- key exists (user is authenticated)
    Guard 2: `if (!activeWorkout.started_at) return` -- BLOCKS because started_at is null
    Guard 3: `if (activeWorkout.exercises.length === 0) return` -- WOULD ALSO BLOCK because exercises is []
    Either guard independently prevents save from executing.
  implication: Even if backupTrigger fires, save() exits immediately due to empty workout state

- timestamp: 2026-02-13T00:04:00Z
  checked: Whether backup trigger actions can even fire with empty exercises
  found: |
    All triggerBackup() calls happen inside handlers for exercise/set operations:
    - handleToggleDone: requires clicking a checkbox on an exercise set
    - handleAddSet: requires an exercise card with an "Add Set" button
    - handleDeleteSet: requires a set row to exist
    - handleRemoveExercise: requires an exercise card to exist
    - handleSelectExercise: this CAN fire (user can open exercise picker and add one)
    With exercises=[], the user sees no exercise cards, so most triggers are unreachable.
    Only addExercise via the picker could trigger a save, but even then started_at is null,
    so the save guard would still block.
  implication: Double failure: (1) most trigger paths unreachable, (2) save guards block even if triggered

- timestamp: 2026-02-13T00:05:00Z
  checked: Dashboard crash recovery check (app/index.tsx lines 52-64)
  found: |
    useEffect runs on mount (and user?.id change). Calls backup.restore() which reads
    AsyncStorage. Since nothing was saved (see above), restore() returns null.
    setResumeData(data) and setShowResumeModal(true) are never reached.
    The ResumeWorkoutModal stays hidden with visible=false.
  implication: Dashboard recovery code is correct. It simply has nothing to recover.

- timestamp: 2026-02-13T00:08:00Z
  checked: The RESTORE path itself (workout.tsx lines 78-89) -- would it work if data existed?
  found: |
    If backup data existed in AsyncStorage:
    1. Dashboard restore() would find it, show modal
    2. User taps Resume -> router.push('/workout?restore=true')
    3. workout.tsx init() checks params.restore === 'true'
    4. Calls backup.restore() again, gets data
    5. Sets restoredBackup with activeWorkout and originalTemplateSnapshot
    6. useWorkoutState receives restoredBackup, BUT...
    7. useWorkoutState's useEffect([]) fires on mount. restoredBackup starts as undefined
       (it's set asynchronously in workout.tsx's init useEffect).
    8. Same race condition: useWorkoutState never sees the restored data.
  implication: |
    INDEPENDENT BUG FOUND: Even if backup data existed, the restore path would ALSO fail
    due to the same race condition in useWorkoutState. The restoredBackup prop is set
    asynchronously (after AsyncStorage read), but useWorkoutState's initialization
    useEffect([]) only runs once on mount when restoredBackup is still undefined.
    Fixing the exercise loading bug (adding deps to useWorkoutState's useEffect) would
    fix BOTH the normal template path AND the restore path simultaneously.

## Resolution

root_cause: |
  **Primary: Cascading failure from the useWorkoutState race condition (workout-no-exercises.md).**

  The crash recovery failure is a direct consequence of the exercise loading bug. The chain:

  1. `useWorkoutState` initialization `useEffect([], [])` runs on mount when `template` is still
     `undefined` (loaded asynchronously from cache). The effect never re-fires.
  2. `activeWorkout` stays in default state: `{ started_at: null, exercises: [] }`
  3. No user actions can trigger `triggerBackup()` because no exercise cards render
  4. Even if triggered, `backup.save()` exits immediately:
     - Guard `!activeWorkout.started_at` blocks (started_at is null)
     - Guard `exercises.length === 0` blocks (exercises is empty)
  5. No data is written to AsyncStorage
  6. On relaunch, `backup.restore()` returns null
  7. `ResumeWorkoutModal` never shows

  **Secondary: The restore path itself has the same race condition.**

  Even if backup data existed, restoring would also fail because:
  - `workout.tsx` sets `restoredBackup` asynchronously (after AsyncStorage read in useEffect)
  - `useWorkoutState`'s useEffect([]) fires on mount when `restoredBackup` is still `undefined`
  - The restored workout data would never be applied to `activeWorkout`

  Both issues share the same root cause: `useWorkoutState`'s initialization useEffect has
  empty dependency array `[]`, making it unable to react to asynchronously-loaded data
  (whether template or restored backup).

  **There are NO independent bugs in:**
  - Dashboard crash recovery check (`app/index.tsx` lines 52-64) -- correct logic
  - `useWorkoutBackup` save/restore/clear (`src/hooks/useWorkoutBackup.ts`) -- correct logic
  - `ResumeWorkoutModal` component (`src/components/ResumeWorkoutModal.tsx`) -- correct logic
  - Backup trigger mechanism in `app/workout.tsx` (lines 162-180) -- correct design

fix: |
  **Single fix resolves both the exercise loading bug and the crash recovery bug:**

  In `src/hooks/useWorkoutState.ts`, change the initialization useEffect (lines 110-154)
  to depend on `template` and `restoredWorkout`, with an initialization guard:

  ```typescript
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return; // Don't re-initialize once workout is active

    if (restoredWorkout) {
      setActiveWorkout(restoredWorkout.activeWorkout);
      setOriginalTemplateSnapshot(restoredWorkout.originalTemplateSnapshot);
      setIsInitialized(true);
      return;
    }

    if (template) {
      const initialWorkout: ActiveWorkout = {
        template_id: template.id,
        template_name: template.name,
        started_at: new Date().toISOString(),
        exercises: template.exercises.map((te, exIndex) => ({
          exercise_id: te.exercise_id,
          name: te.name,
          category: te.category,
          order: exIndex,
          rest_seconds: te.default_rest_seconds || 90,
          sets: te.sets.map((set) => ({
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            is_done: false,
          })),
        })),
      };
      setActiveWorkout(initialWorkout);

      const snapshot: TemplateSnapshot = {
        exercises: template.exercises.map((te) => ({
          exercise_id: te.exercise_id,
          sets: te.sets.map((set) => ({
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
          })),
        })),
      };
      setOriginalTemplateSnapshot(snapshot);
      setIsInitialized(true);
    }
  }, [template, restoredWorkout, isInitialized]);
  ```

  This ensures the effect re-runs when the asynchronously-loaded data arrives, but
  the `isInitialized` guard prevents re-initialization during the workout.

verification: (not yet verified)
files_changed: []
