---
status: diagnosed
trigger: "Workout Screen Shows No Exercises"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - useWorkoutState initialization useEffect fires before async template loading completes, and never re-fires because of empty dependency array
test: Code trace of execution order
expecting: useWorkoutState sees template=undefined on mount, never reacts to later setTemplate()
next_action: Return diagnosis

## Symptoms

expected: Workout screen displays all exercises from the selected template with weight/reps inputs and done checkboxes
actual: Workout screen navigates and appears but shows NO exercises - the exercise list is empty
errors: None (no crash, no error state displayed)
reproduction: Tap "Start" on any template card on the dashboard
started: Since active workout screen was built (Phase 05)

## Eliminated

(none - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-13T00:01:00Z
  checked: app/index.tsx line 100 - how templateId is passed
  found: `router.push('/workout?templateId=${template.id}')` - correctly passes template ID as query param
  implication: Navigation and param passing is correct

- timestamp: 2026-02-13T00:02:00Z
  checked: app/workout.tsx lines 59-127 - how template is loaded from cache
  found: Template loading happens in a useEffect with empty deps `[]` (line 127). It is ASYNC - calls `getCachedTemplates()` which returns a Promise, awaits it, then calls `setTemplate(found)` on line 96. The `template` state starts as `undefined` (line 65).
  implication: Template is NOT available synchronously on mount - it is set asynchronously after cache read completes

- timestamp: 2026-02-13T00:03:00Z
  checked: app/workout.tsx line 147 - how useWorkoutState receives template
  found: `useWorkoutState(template, restoredBackup)` - passes the `template` state variable directly as an argument
  implication: On first render, template is `undefined`. After async init completes, template becomes the loaded value - but useWorkoutState must react to this change

- timestamp: 2026-02-13T00:04:00Z
  checked: src/hooks/useWorkoutState.ts lines 110-154 - initialization useEffect
  found: The initialization useEffect has an EMPTY dependency array `[]` (line 154). The comment says "Only run on mount -- template and restoredWorkout are initial values". On mount, `template` is `undefined` so the `if (template)` check on line 117 fails. The effect NEVER runs again because deps are `[]`.
  implication: ROOT CAUSE CONFIRMED. The useEffect that converts template data into activeWorkout state runs exactly once on mount, when template is still undefined. When the async cache load completes and template is set, this useEffect does not re-run.

- timestamp: 2026-02-13T00:05:00Z
  checked: Execution order analysis
  found: |
    React render cycle:
    1. WorkoutScreen mounts -> template = undefined, restoredBackup = undefined
    2. useWorkoutState(undefined, undefined) hook initializes -> activeWorkout = { exercises: [] }
    3. Both useEffects with [] fire:
       a. workout.tsx init() starts async cache read
       b. useWorkoutState's useEffect fires, sees template=undefined, does nothing
    4. Async cache read completes -> setTemplate(found) triggers re-render
    5. useWorkoutState receives template prop with data, BUT its useEffect never re-fires
    6. activeWorkout.exercises remains [] forever
    7. Screen renders empty exercise list
  implication: The design assumed template would be available synchronously as an "initial value" but it is loaded asynchronously from AsyncStorage

## Resolution

root_cause: |
  **Race condition between async template loading and useWorkoutState initialization.**

  In `app/workout.tsx`, the template is loaded asynchronously from AsyncStorage cache inside a `useEffect([], [])` (lines 72-127). The `template` state starts as `undefined` and is set only after the async `getCachedTemplates()` call resolves.

  In `src/hooks/useWorkoutState.ts`, the initialization logic that converts template data into workout exercises is inside a `useEffect(() => {...}, [])` (lines 110-154) with an empty dependency array. This effect runs once on mount when `template` is still `undefined`, finds nothing to initialize, and never runs again.

  When the template finally loads and `setTemplate(found)` is called, `useWorkoutState` re-renders with the new `template` prop but its initialization useEffect does not re-fire. The `activeWorkout.exercises` remains an empty array `[]`, resulting in no exercises being rendered on screen.

fix: |
  **Option A (Recommended): Change useWorkoutState's useEffect to depend on template and restoredWorkout.**

  In `src/hooks/useWorkoutState.ts`, change line 154 from:
  ```
  }, []);
  ```
  to:
  ```
  }, [template, restoredWorkout]);
  ```

  This requires a guard to prevent re-initialization if the workout is already active (e.g., check if `activeWorkout.started_at` is already set). Otherwise, any re-render with a new template reference would reset the workout mid-session.

  Suggested implementation:
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
      // ... existing initialization code ...
      setIsInitialized(true);
    }
  }, [template, restoredWorkout, isInitialized]);
  ```

  **Option B: Load template synchronously before calling useWorkoutState.**

  Move the template loading out of useEffect in workout.tsx and pass it synchronously. This would require restructuring how the workout screen initializes -- possibly passing template data via navigation params instead of just the ID, or using a wrapper component that only renders the workout UI after data is loaded.

verification: (not yet verified)
files_changed: []
