# Component Decomposition & Separation of Concerns Tech Debt Audit

## CRITICAL

### [CRITICAL] ExercisePickerModal Violates Code Placement Rules
- **Location:** `src/components/ExercisePickerModal.tsx:14-358` (entire component)
- **What:** The ExercisePickerModal contains significant business logic that should be in hooks/services: exercise fetching via `useExercises()`, exercise creation with validation, category dropdown state management, and search/filter logic. Per constitution, screens and components should be UI-only; business logic belongs in services/hooks.
- **Why it matters:** The component couples UI presentation with data operations, making it harder to test business logic independently, reuse the create flow in other contexts, and reason about data dependencies. If exercise creation validation needs to change, you must modify the component rather than the service.
- **Suggested fix:** Extract a new `useExerciseCreation()` hook that encapsulates `createExercise()`, validation, error handling, and refresh logic. Extract filtering/search logic into a `useExerciseSearch()` hook. Leave the component as pure UI - prop-driven, with handlers delegating to the hooks.
- **Blast radius:** ExercisePickerModal is consumed by workout.tsx and potentially future screens. The fix is localized to this file + new hooks in `src/hooks/`.

### [CRITICAL] AddChartSheet Mixes UI & Business Logic
- **Location:** `src/components/AddChartSheet.tsx:156-440` (entire component)
- **What:** AddChartSheet manages exercise fetching (`exercises.getExercisesWithLoggedData()`), chart creation (`charts.createChart()`), state reset on open, grouping logic, and network error detection. Per constitution, components should delegate data operations to services/hooks.
- **Why it matters:** The component is responsible for three distinct concerns: (1) rendering the UI, (2) data fetching and grouping, (3) chart creation with error handling. This makes the component hard to test (requires mocking Supabase), hard to maintain (business logic scattered in callbacks), and tight coupling between presentation and data.
- **Suggested fix:** Extract a `useChartCreation()` hook that handles exercise fetching, grouping, creation, and error messaging. The component becomes a thin UI wrapper that calls the hook and renders based on step state.
- **Blast radius:** Localized to this file + new hooks. Dashboard depends on AddChartSheet, but the interface remains unchanged.

## HIGH

### [HIGH] MyExercisesList Contains Complex Edit Workflow Without Service Abstraction
- **Location:** `src/components/MyExercisesList.tsx:53-309` (entire component)
- **What:** MyExercisesList manages inline edit accordion state (expanded, edit name, category, error), service calls to update and delete, dependency checking, LayoutAnimation coordination, and a nested category dropdown. The edit validation and dependency checking are business logic intermingled with UI state.
- **Why it matters:** The component is doing too much: coordinating form state, calling services, handling validation responses, and managing animations. If edit validation rules change, you modify the component. If dependency logic changes, you modify the component. This violates the business logic separation principle.
- **Suggested fix:** Extract `useExerciseEdit()` hook managing: expanded state, edit form state, save/delete handlers, validation, and error messages. Extract `useDependencyCheck()` hook for fetching/formatting dependency messages. Leave component as UI-only.
- **Blast radius:** Used in settings/exercises.tsx. Hook extraction is internal refactoring; interface to parent remains unchanged.

### [HIGH] WorkoutScreen Contains Finish/Cancel Flow Logic Instead of Delegating to Hook
- **Location:** `app/workout.tsx:300-489` (saveWorkoutAndCleanup, silent save functions, finish/cancel logic)
- **What:** The screen directly implements:
  - Silent rest time save (`saveRestTimeChanges()`, lines 307-323)
  - Silent weight/reps save (`saveWeightRepsChanges()`, lines 332-363)
  - Workout save + template update logic (`saveWorkoutAndCleanup()`, lines 369-459)
  - Template update conditional logic
  - Write queue enqueuing as fallback

  These are complex, stateful operations that should live in a hook or service. The screen also manages three modals (showFinishModal, showCancelModal, showTemplateUpdateModal) and their state machines.
- **Why it matters:** Per constitution, screens contain UI & navigation only. This screen contains the entire finish flow business logic. It's 714 lines of tightly coupled state and operations. Changes to silent save logic, write queue behavior, or template update rules require modifying the screen. Hard to test. Hard to reuse in other surfaces.
- **Suggested fix:** Extract `useWorkoutCompletion()` hook that encapsulates:
  - `saveRestTimeChanges()`
  - `saveWeightRepsChanges()`
  - `saveWorkoutAndCleanup()`
  - State for `isSaving` and modal visibility
  - All three modal handlers

  Screen becomes a thin UI wrapper calling hook handlers.
- **Blast radius:** This is the active workout screen; only used in one place. Refactor is internal, interface to router remains unchanged.

### [HIGH] WorkoutExerciseCard Over-Integrated with Timer and Swipe Logic
- **Location:** `src/components/WorkoutExerciseCard.tsx:40-227` (component props and structure)
- **What:** WorkoutExerciseCard accepts 16+ props managing: set mutations (weight, reps, done, add, delete), remove exercise, timer state (remaining, total, active, rest), timer methods (adjust, pause, restart, change rest time), and swipe coordination (revealed key, reveal, close handlers). The component is a pass-through for all parent state.
- **Why it matters:** The component has become a massive connector between the workout screen's multiple state machines (useWorkoutState, useRestTimer) and the child components (WorkoutSetRow, RestTimerBar). This is a sign of state that should be lifted to a parent or distributed differently. The prop drilling is 3+ levels deep (WorkoutScreen → WorkoutExerciseCard → RestTimerBar/WorkoutSetRow). Testing the component requires mocking 16 props.
- **Suggested fix:** Consider whether timer state per-exercise should be lifted and managed at the exercise level via a local context or hook, rather than passed down from the screen. Alternatively, use React Context for timer state instead of prop drilling.
- **Blast radius:** Moderate. Would require rethinking state distribution across workout flow, but doesn't affect external interfaces.

### [HIGH] RestTimerBar Combines Timer Editing with Active Timer Display
- **Location:** `src/components/RestTimerBar.tsx:43-206` (entire component)
- **What:** RestTimerBar manages three distinct modes (inactive, editing, active) with complex local state (mode, editText, wasActiveBeforeEdit ref, inputRef) and multiple state transitions. It computes "effective mode" based on prop state + local state, handles text parsing/formatting, and coordinates pause/restart with parent timer. The component has a mini state machine inside it.
- **Why it matters:** While the component is UI-focused, it contains complex timer logic that could be extracted: mode transitions, text parsing, time clamping. If time parsing rules change (e.g., support for "1:30" input), you must modify the component. The logic is hard to test because it's embedded in the component.
- **Suggested fix:** Extract timer format/parse utilities and mode transition logic into `src/lib/timeUtils.ts`. Alternatively, extract a `useRestTimerEdit()` hook managing the editing mode state machine.
- **Blast radius:** Low. Extracted utilities remain internal; component interface unchanged.

## MEDIUM

### [MEDIUM] ChartCard Data Fetching Could Be Decoupled from Rendering
- **Location:** `src/components/ChartCard.tsx:87-237` (ChartCardInner component)
- **What:** ChartCard directly calls `useChartData(chart, refreshKey)` hook and assumes responsibility for rendering all states (loading, empty, data). The component also computes chart-specific logic: unit suffix, label thinning, Y-axis scaling, effective radius. While these are rendering concerns, they're intertwined with data loading.
- **Why it matters:** The component is moderately coupled to data fetching. If chart computation logic changes, the component changes. If chart rendering strategy changes (e.g., skeleton loaders), the component changes.
- **Suggested fix:** Lower priority. If chart variants become needed, extract sub-component patterns: `<ChartVisualization>` for LineChart rendering, `<ChartLoading>`, `<ChartEmpty>`.
- **Blast radius:** Low. Current structure is acceptable; refactor is optional.

### [MEDIUM] useWorkoutState Hook Mixes State Management with Change Detection Logic
- **Location:** `src/hooks/useWorkoutState.ts:90-502` (entire hook)
- **What:** The hook manages two concerns:
  1. **State management:** activeWorkout, originalTemplateSnapshot, mutations (updateSetWeight, addSet, etc.)
  2. **Change detection:** `getRestTimeChanges()` and `getWeightRepsChanges()` compute derived data to support silent saves
- **Why it matters:** The hook is 502 lines and manages two distinct responsibilities. If change detection logic becomes complex or needs versioning, the hook becomes unwieldy.
- **Suggested fix:** Lower priority. If change detection grows, consider extracting a `useWorkoutChangeDetection()` hook. Currently acceptable.
- **Blast radius:** Low. This is a future refactor if logic grows.

## LOW

### [LOW] Inline Helper Function `formatWeight` in WorkoutSetRow Could Be Extracted
- **Location:** `src/components/WorkoutSetRow.tsx:69-75`
- **What:** The `formatWeight()` helper is defined inside the component and duplicated in other files. It's a one-liner but repeated logic (rounding, string conversion).
- **Why it matters:** Low. The function is trivial, but duplication suggests a missing utility.
- **Suggested fix:** Move to `src/lib/formatUtils.ts` and import where needed.
- **Blast radius:** Minimal. Internal refactor.

### [LOW] Multiple Category Dropdown Implementations
- **Location:**
  - `src/components/MyExercisesList.tsx:230-256`
  - `src/components/ExercisePickerModal.tsx:319-356`
  - `src/components/CreateExerciseModal.tsx:137-162`
- **What:** All three components implement the same category dropdown pattern independently: Pressable trigger, conditional dropdown list, Ionicons chevron, item selection.
- **Why it matters:** Code duplication makes maintenance harder. If the dropdown UI needs to change, three places must change.
- **Suggested fix:** Extract a reusable `<CategoryDropdown>` component that accepts selectedCategory, categories list, and onSelect callback.
- **Blast radius:** Low. Would consolidate code but doesn't change logic.

---

## Summary

Total findings: 10 (2 Critical, 4 High, 2 Medium, 2 Low)

**Highest-impact fixes:** Extract `useWorkoutCompletion()` hook, extract `useExerciseCreation()` hook, extract `useChartCreation()` hook. These three address the architectural violations and would improve testability and maintainability significantly.
