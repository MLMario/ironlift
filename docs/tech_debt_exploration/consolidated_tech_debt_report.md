# Consolidated Tech Debt Report

Synthesized from five audit reports: Performance & Re-rendering, Component Decomposition, Service Layer & Cache, Type Safety, and Error Handling & Resilience.

---

## Deduplicated Findings

Each finding has a unique ID (TD-XX), severity, and notes which source reports contributed.

---

### CRITICAL

#### TD-01: Chart Metrics Cache Never Invalidated After Workout Completion
- **Severity:** CRITICAL
- **Sources:** Service Layer (CRITICAL), Service Layer (HIGH "Missing Cache Invalidation for Chart Metrics When Exercises Modified"), Service Layer (MEDIUM "Chart Metrics Cache Lacks TTL or Staleness Detection")
- **Location:** `src/hooks/useChartData.ts:79-140`, `src/services/logging.ts:482-543`, `app/workout.tsx:307-363`, `src/lib/cache.ts:142-209`
- **What:** When a user completes a workout, the chart metrics cache in AsyncStorage (key `ironlift:chart-metrics`) is never cleared or invalidated. There is no TTL or staleness detection on cached entries. Additionally, there is no mechanism to clear all metrics for a specific exerciseId when that exercise's history changes (the key format `{exerciseId}:{metricType}:{xAxisMode}` has no bulk-clear function).
- **Why it matters:** Users see outdated progress charts after completing workouts until the app is restarted. This breaks the offline-first guarantee that cached data reflects all logged workouts. Charts for modified exercises show stale metrics indefinitely.
- **Suggested fix:**
  1. Add `clearChartMetricsForExercise(exerciseId: string)` that clears all cache keys matching that exercise
  2. Call this after every workout completion in `saveWeightRepsChanges()`
  3. Add a `cached_at` timestamp to each metric cache entry with a 5-minute TTL check on read
- **Blast radius:** `useChartData` hook, `ChartCard` components, entire dashboard chart section

#### TD-02: Write Queue Does Not Handle Server-Side Validation Failures
- **Severity:** CRITICAL
- **Sources:** Error Handling (CRITICAL)
- **Location:** `src/services/writeQueue.ts:124-136`
- **What:** When `logging.createWorkoutLog()` fails, the entry is retried with no distinction between transient errors (network) and permanent errors (validation failure). A malformed workout log retries 10 times and gets stuck in the queue. The user is never notified.
- **Why it matters:** Offline-first is a core feature. Users expect failed workouts to either sync or show an error. Permanent failures silently consume the retry budget.
- **Suggested fix:**
  1. Add error type detection (auth/validation vs network)
  2. For validation errors, remove from queue and move to a dead-letter queue
  3. Surface a persistent dashboard indicator: "1 workout failed to sync" with retry/discard
- **Blast radius:** All offline workouts; requires new cache entry for failed items and dashboard UI

#### TD-03: Chart Metrics Cache Race Condition with Concurrent Writes
- **Severity:** CRITICAL
- **Sources:** Service Layer (HIGH), Error Handling (CRITICAL)
- **Location:** `src/lib/cache.ts:186-198`, `src/hooks/useChartData.ts:79-140`
- **What:** `setCachedChartMetrics` reads the current map, merges, and writes back. Two concurrent calls (e.g., multiple charts refreshing on dashboard mount) cause a read-modify-write race: the second read misses updates from the first write. No error is caught or logged. Additionally, rapid navigation or component remounting causes jank and brief flashes of stale data.
- **Why it matters:** Chart data cached for offline viewing silently loses entries. Users see stale or missing chart data.
- **Suggested fix:**
  1. Use a per-key write pattern instead of read-modify-write on the full map
  2. Add request deduplication keyed by cache key (shared promise per in-flight request)
  3. Log all cache write errors with context
- **Blast radius:** All chart caching; requires restructuring the metrics cache format

#### TD-04: AsyncStorage Write Failures During Workout Are Silent
- **Severity:** CRITICAL
- **Sources:** Error Handling (CRITICAL), Error Handling (MEDIUM "No Error Recovery for AsyncStorage Corruption"), Type Safety (MEDIUM "Cache layer returns loosely-typed generic result")
- **Location:** `src/hooks/useWorkoutBackup.ts:82-86`, `src/lib/cache.ts` (all set* and get* functions)
- **What:** AsyncStorage writes are wrapped in try-catch and logged to console, but no error state is exposed to the UI. If device storage is full or AsyncStorage fails, the user continues the workout with no backup being saved. Additionally, cache reads return `null` silently on JSON parse errors (corrupted data), and there is no runtime validation that parsed JSON matches the expected type shape.
- **Why it matters:** Backup is the sole crash recovery mechanism. Silent failure means data loss. Corrupted cache silently disables offline functionality.
- **Suggested fix:**
  1. Expose a `backupError` state from `useWorkoutBackup` to the caller
  2. Display a persistent warning if backup fails
  3. Detect JSON parse errors and delete corrupted keys
  4. Add minimal runtime validation for parsed cache data (e.g., `Array.isArray(data.labels)`)
- **Blast radius:** Workout screen, cache system, all cache-backed hooks

#### TD-05: Session Refresh Failures Are Not Handled
- **Severity:** CRITICAL
- **Sources:** Error Handling (CRITICAL)
- **Location:** `src/lib/supabase.ts:26-32`
- **What:** `supabase.auth.startAutoRefresh()` is called when the app comes to foreground, but if refresh fails (token expired, network down), the error is never caught or propagated. A mid-workout session expiry causes the next Supabase query to fail silently.
- **Why it matters:** Auth is a hard requirement for syncing. Session failures should redirect to login, not silently fail.
- **Suggested fix:**
  1. Monitor auth state changes with `onAuthStateChange()` subscription at app root
  2. On unauthorized error from any service, clear cached session and navigate to login
  3. Show a toast: "Session expired. Please log in again."
- **Blast radius:** App-wide; affects all screens and services

#### TD-06: useRestTimer's isActiveForExercise Dependency on Full Timer State
- **Severity:** CRITICAL
- **Sources:** Performance (CRITICAL)
- **Location:** `src/hooks/useRestTimer.ts:302`
- **What:** The `isActiveForExercise` and `getProgress` callbacks include `[timer]` as a dependency, creating new function references whenever ANY property of the timer object changes. Every 1-second timer tick updates `timer.remaining`, causing callback recreation and re-render propagation to all exercise cards.
- **Why it matters:** WorkoutExerciseCard receives both callbacks as props. Every tick triggers child re-renders (RestTimerBar, ProgressRing, WorkoutSetRow) across ALL exercise cards, not just the active one.
- **Suggested fix:** Use granular `useCallback` dependencies: `isActiveForExercise` depends only on `[timer.status, timer.exerciseIndex]`, `getProgress` similarly.
- **Blast radius:** WorkoutExerciseCard, RestTimerBar, ProgressRing -- all timer-related components

#### TD-07: ExercisePickerModal Violates Code Placement Rules
- **Severity:** CRITICAL
- **Sources:** Component Decomposition (CRITICAL)
- **Location:** `src/components/ExercisePickerModal.tsx:14-358`
- **What:** The component contains significant business logic that should be in hooks/services: exercise fetching via `useExercises()`, exercise creation with validation, category dropdown state management, and search/filter logic. Per constitution, components should be UI-only.
- **Why it matters:** Couples UI presentation with data operations, making business logic untestable independently and the create flow non-reusable in other contexts.
- **Suggested fix:** Extract `useExerciseCreation()` hook (create, validate, refresh) and `useExerciseSearch()` hook (filter, search). Leave component as pure UI.
- **Blast radius:** ExercisePickerModal consumed by workout.tsx and potentially future screens

#### TD-08: AddChartSheet Mixes UI and Business Logic
- **Severity:** CRITICAL
- **Sources:** Component Decomposition (CRITICAL)
- **Location:** `src/components/AddChartSheet.tsx:156-440`
- **What:** AddChartSheet manages exercise fetching, chart creation, state reset on open, grouping logic, and network error detection. Per constitution, components should delegate data operations to services/hooks.
- **Why it matters:** Three concerns in one component (rendering, data fetching/grouping, chart creation with error handling). Hard to test, hard to maintain.
- **Suggested fix:** Extract `useChartCreation()` hook for exercise fetching, grouping, creation, and error messaging. Component becomes thin UI wrapper.
- **Blast radius:** Localized to this file + new hooks; dashboard interface unchanged

#### TD-09: CreateChartInput Uses Untyped String Fields Instead of Literal Unions
- **Severity:** CRITICAL
- **Sources:** Type Safety (CRITICAL)
- **Location:** `src/types/services.ts:740-747`
- **What:** `CreateChartInput` defines `metric_type` and `x_axis_mode` as plain `string` fields. The type system cannot catch invalid values at compile time. Matching literal union types (`ExerciseMetricType`, `ExerciseHistoryMode`) already exist in the same file.
- **Why it matters:** Invalid values pass type checking and fail only at runtime when Supabase rejects them.
- **Suggested fix:** Change fields to literal unions matching existing types: `metric_type: 'total_sets' | 'max_volume_set'`, `x_axis_mode: 'date' | 'session'`.
- **Blast radius:** `src/services/charts.ts:createChart()` callers and chart creation UI

#### TD-10: Explicit `any` Type in ChartsService Interface (Dead Code)
- **Severity:** CRITICAL
- **Sources:** Type Safety (CRITICAL)
- **Location:** `src/types/services.ts:804, 812`
- **What:** `renderChart()` and `destroyChart()` methods use explicit `any` type. These methods are Chart.js-specific and never called in the iOS codebase -- they are dead code from the web app port.
- **Why it matters:** Dead code with `any` types clutters the interface and defeats type checking. `RenderChartOptions` (lines 752-757) is also dead code.
- **Suggested fix:** Remove `renderChart()`, `destroyChart()`, and `RenderChartOptions` from the `ChartsService` interface entirely.
- **Blast radius:** None (dead code removal); the interface is implemented in `src/services/charts.ts`

---

### HIGH

#### TD-11: Silent Save Failures During Workout Finish (Weight/Reps/Rest Time)
- **Severity:** HIGH
- **Sources:** Service Layer (HIGH "No Error Propagation from Silent-Save"), Error Handling (HIGH "Silent Save Failures Not Tracked"), Component Decomposition (HIGH "WorkoutScreen Contains Finish/Cancel Flow Logic")
- **Location:** `app/workout.tsx:307-363`, `src/services/templates.ts:757-784`
- **What:** `saveRestTimeChanges()` and `saveWeightRepsChanges()` wrap all service calls in try/catch with "Best-effort: skip silently on failure". If the network is down or RLS denies the update, errors are swallowed. `updateTemplateExerciseSetValues()` silently ignores individual set update failures (3 of 5 sets can fail without any indication). Additionally, the finish flow logic (silent saves, workout save, template update, write queue fallback, three modals) lives directly in the screen file instead of a hook.
- **Why it matters:** Silent data loss -- users believe weight changes were persisted when they weren't. Next workout uses stale template defaults. The screen file is 714 lines of tightly coupled state and operations that violates the constitution's "screens contain UI & navigation only" rule.
- **Suggested fix:**
  1. Return `{ updated: number, failed: number }` from `updateTemplateExerciseSetValues()`
  2. Bubble non-blocking warning to UI: "Workout saved, but some template updates failed"
  3. Extract `useWorkoutCompletion()` hook encapsulating all finish flow logic
- **Blast radius:** Workout finish flow; workout screen architecture

#### TD-12: Template Cache Not Refreshed After Direct Mutations in Workout Screen
- **Severity:** HIGH
- **Sources:** Service Layer (CRITICAL)
- **Location:** `app/workout.tsx:307-363`
- **What:** The workout screen calls `templatesService.updateTemplateExercise()` and `updateTemplateExerciseSetValues()` directly. These mutations succeed on Supabase but the cached template in AsyncStorage (key `ironlift:templates`) retains old values. The code at lines 355-358 attempts a refresh, but it does not always execute (not in a `finally` block) and does not cover rest time changes.
- **Why it matters:** Next workout pre-fills with stale defaults. Creates confusion about whether changes were saved.
- **Suggested fix:** Move template cache refresh to a `finally` block that always executes after both weight/reps and rest time changes. Ensure the refresh covers all mutation paths.
- **Blast radius:** Every subsequent workout using the same template

#### TD-13: WorkoutExerciseCard Re-renders on Every Timer Tick
- **Severity:** HIGH
- **Sources:** Performance (HIGH)
- **Location:** `app/workout.tsx:624-649`
- **What:** `WorkoutExerciseCard` receives `timerRemaining` (updates every second) as a prop and is not memoized. A 4-exercise workout with an active timer on exercise #1 causes exercises #2-4 to re-render every second despite no visible changes. With 10 sets per exercise, this multiplies significantly.
- **Why it matters:** Largest performance drain on the active workout screen.
- **Suggested fix:** Wrap `WorkoutExerciseCard` in `React.memo` with a custom comparator that only re-renders if timer is active for THIS exercise or the exercise structure changed.
- **Blast radius:** Entire active workout screen, most expensive component tree

#### TD-14: WorkoutScreen getTimerProps Recreates Timer Props Object Every Render
- **Severity:** HIGH
- **Sources:** Performance (HIGH)
- **Location:** `app/workout.tsx:559-581`
- **What:** `getTimerProps(exerciseIndex)` is called inside the render loop for each exercise card, creating new object references every render. Called N times per render (N = exercise count). If WorkoutExerciseCard were memoized (TD-13), these recreations would defeat the memoization.
- **Why it matters:** Compounds the timer tick re-render issue; must be fixed alongside TD-13 for memoization to work.
- **Suggested fix:** Compute and cache timer props in a `useMemo` that depends on `[timer, activeWorkout.exercises]`.
- **Blast radius:** Workout screen performance during active timer

#### TD-15: useWorkoutState getRestTimeChanges/getWeightRepsChanges Recreate on Every Render
- **Severity:** HIGH
- **Sources:** Performance (HIGH)
- **Location:** `src/hooks/useWorkoutState.ts:392, 444`
- **What:** Both callbacks depend on `[originalTemplateSnapshot, activeWorkout.exercises]`. Since `activeWorkout.exercises` is a new array reference on every state update, these callbacks recreate frequently despite only being needed during the finish flow.
- **Why it matters:** Unnecessary callback recreation; potential re-render trigger if passed to memoized children in the future.
- **Suggested fix:** Memoize the exercises dependency by comparing only structural parts (exercise count, set count, exercise IDs).
- **Blast radius:** Workout.tsx finish flow, potential future child components

#### TD-16: ExercisePickerModal Filtering Recreates Objects on Every Keystroke
- **Severity:** HIGH
- **Sources:** Performance (HIGH)
- **Location:** `src/components/ExercisePickerModal.tsx:79-94`
- **What:** Filter computation is correctly memoized, but `ListEmptyComponent` (lines 160-167) is recreated every render, and the combination of filter + renderItem causes FlatList recomputation on every character typed.
- **Why it matters:** Noticeable lag during search on large exercise libraries.
- **Suggested fix:** Add `removeClippedSubviews={true}`, wrap `ListEmptyComponent` in `useMemo`, ensure stable `renderItem` callback.
- **Blast radius:** Exercise picker modal during search

#### TD-17: AddChartSheet RadioGroup Recreates Inline Styles and Components
- **Severity:** HIGH
- **Sources:** Performance (HIGH)
- **Location:** `src/components/AddChartSheet.tsx:69-137, 252-261`
- **What:** RadioGroup creates inline style objects on every render. The `groupedExercises` map computation is O(n) and runs on every render instead of being memoized.
- **Why it matters:** Noticeable lag when clicking metric/axis radio options in chart creation.
- **Suggested fix:** Move inline styles outside component or wrap in `useMemo`. Memoize `groupedExercises` keyed on `exercisesWithData`.
- **Blast radius:** Chart creation flow

#### TD-18: Supabase Query Errors Not Distinguished from Offline
- **Severity:** HIGH
- **Sources:** Error Handling (HIGH), Service Layer (MEDIUM "Service Functions Silently Swallow Errors")
- **Location:** `src/hooks/useExercises.ts:76-85`, `useCharts.ts:70-80`, `useTemplates.ts:68-78`, all `src/services/*.ts` files
- **What:** All hooks use the same error message for any failure: "Failed to load X. Please check your connection." But the error could be auth, RLS violation, server error, or network. Every service function catches all errors and returns `{ data: null, error: err }` instead of typed/discriminated results. Many callers don't check the error field.
- **Why it matters:** Users get incorrect guidance. TypeScript doesn't enforce checking the error field. Silent failures proliferate.
- **Suggested fix:**
  1. Create typed error results: `{ type: 'unauthorized' | 'network' | 'server' | 'validation' }`
  2. Customize error messages per type
  3. Adopt discriminated union result type where callers must match both cases
- **Blast radius:** All data loading hooks and all service consumers

#### TD-19: Write Queue Processing Errors Are Completely Silent
- **Severity:** HIGH
- **Sources:** Error Handling (HIGH)
- **Location:** `src/services/writeQueue.ts:98-143`
- **What:** `processQueue()` is called on foreground/network change, but errors (e.g., AsyncStorage read fails) are caught and logged to console only. Users have no indication the queue stalled.
- **Why it matters:** Offline workouts won't sync if the queue can't be read. Users think processing is happening.
- **Suggested fix:** Return status from `processQueue()`: `{ processed, failed, error }`. Store last-processed timestamp. Display dashboard badge.
- **Blast radius:** Dashboard UI; requires new status tracking

#### TD-20: Template Mutations Partially Fail Without Cleanup
- **Severity:** HIGH
- **Sources:** Error Handling (HIGH)
- **Location:** `src/services/templates.ts:264-361, 372-476`
- **What:** If template insertion succeeds but exercise insertion fails, the template is created but empty. On retry, users get duplicate empty templates. Rollback delete operations (lines 311-314, 346, 584, 641-644) are not awaited or error-checked.
- **Why it matters:** Templates are the core of the workout flow. Half-created templates break the UI.
- **Suggested fix:**
  1. Implement pessimistic rollback with error checking on delete operations
  2. Return detailed error with partial state info
  3. Await all delete operations and check errors
- **Blast radius:** Template editor screen

#### TD-21: Cache Read Errors Leave UI in Loading State Forever
- **Severity:** HIGH
- **Sources:** Error Handling (HIGH)
- **Location:** `src/hooks/useExercises.ts:63-72`, `useCharts.ts:57-67`, `useTemplates.ts:56-65`
- **What:** If `getCachedExercises()` throws (corrupted JSON), the error is caught with "continue to network". If network also fails, UI is stuck in `isLoading: true` with no error shown.
- **Why it matters:** User sees a spinner forever with no error message or recovery option.
- **Suggested fix:**
  1. Set explicit error state if cache read throws
  2. Add "Clear Cache" button to error screens
  3. Log cache exceptions separately
- **Blast radius:** All cache-backed hooks

#### TD-22: MyExercisesList Contains Complex Edit Workflow Without Service Abstraction
- **Severity:** HIGH
- **Sources:** Component Decomposition (HIGH)
- **Location:** `src/components/MyExercisesList.tsx:53-309`
- **What:** Manages inline edit accordion state, service calls, dependency checking, LayoutAnimation coordination, and a nested category dropdown. Edit validation and dependency checking are business logic in the component.
- **Why it matters:** Violates business logic separation. Changes to validation or dependency logic require modifying the component.
- **Suggested fix:** Extract `useExerciseEdit()` hook (expanded state, form state, save/delete handlers, validation) and `useDependencyCheck()` hook.
- **Blast radius:** Used in settings/exercises.tsx; interface unchanged

#### TD-23: WorkoutExerciseCard Over-Integrated with Timer and Swipe Logic
- **Severity:** HIGH
- **Sources:** Component Decomposition (HIGH)
- **Location:** `src/components/WorkoutExerciseCard.tsx:40-227`
- **What:** Accepts 16+ props managing set mutations, remove exercise, timer state (4 props), timer methods (4 props), and swipe coordination (3 props). The component is a massive connector with 3+ levels of prop drilling.
- **Why it matters:** Testing requires mocking 16 props. State distribution is suboptimal.
- **Suggested fix:** Lift timer state per-exercise via local context or hook. Reduce prop drilling.
- **Blast radius:** Moderate; requires rethinking state distribution across workout flow

#### TD-24: RestTimerBar Combines Timer Editing with Active Timer Display
- **Severity:** HIGH
- **Sources:** Component Decomposition (HIGH)
- **Location:** `src/components/RestTimerBar.tsx:43-206`
- **What:** Manages three distinct modes (inactive, editing, active) with complex local state and a mini state machine. Timer format/parse logic and mode transitions are embedded in the component.
- **Why it matters:** Complex logic is hard to test because it's embedded in the component.
- **Suggested fix:** Extract timer format/parse utilities to `src/lib/timeUtils.ts`. Extract `useRestTimerEdit()` hook for editing mode state machine.
- **Blast radius:** Low. Component interface unchanged.

#### TD-25: Type Assertions Bypass Type Safety in Nested Query Results
- **Severity:** HIGH
- **Sources:** Type Safety (HIGH)
- **Location:** `src/services/templates.ts:175, 245`, `src/services/charts.ts:67, 165, 168`
- **What:** Multiple files use `as unknown as TargetType` to cast Supabase nested query results. These casts assume Supabase returns the expected shape without runtime validation.
- **Why it matters:** If Supabase query changes, the cast hides the error until runtime.
- **Suggested fix:** Keep internal raw interfaces, add runtime validation after cast, document that casts are intentional workarounds.
- **Blast radius:** `src/services/templates.ts`, `src/services/charts.ts`

#### TD-26: Logging Service Uses `as any` for template_name Field Access
- **Severity:** HIGH
- **Sources:** Type Safety (HIGH)
- **Location:** `src/services/logging.ts:275`
- **What:** `(data as any).templates?.name || null` uses `as any` to access a field not on the properly-cast type, instead of defining a proper internal interface.
- **Why it matters:** Bypasses all type checking for this access pattern.
- **Suggested fix:** Define `RawWorkoutLog` interface that includes the nested `templates` field.
- **Blast radius:** `src/services/logging.ts:getWorkoutLog()`

#### TD-27: Duplicate Supabase Query in createChart
- **Severity:** HIGH
- **Sources:** Service Layer (HIGH)
- **Location:** `src/services/charts.ts:85-176`
- **What:** `createChart()` inserts a chart then immediately re-fetches with an exercises join. The insert's `.select()` doesn't include the join, requiring a second network round-trip.
- **Why it matters:** Unnecessary latency on every chart creation. Creates a race condition window if an exercise is deleted between insert and re-fetch.
- **Suggested fix:** Modify insert query to include the full `.select(...)` with exercises join in a single query.
- **Blast radius:** Chart creation performance

#### TD-28: TemplateCard renderRightActions Not Memoized
- **Severity:** HIGH
- **Sources:** Performance (HIGH)
- **Location:** `src/components/TemplateCard.tsx:45-77`
- **What:** `renderRightActions` captures `template` in closure, is not wrapped in `useCallback`, and is recreated on every render. TemplateCard is not memoized.
- **Why it matters:** Dashboard template grid scrolling performance with large template counts.
- **Suggested fix:** Wrap in `useCallback` with `[template, onEdit, onDelete]`. Memoize `TemplateCard` with `React.memo`.
- **Blast radius:** Dashboard template grid scrolling

#### TD-29: RenderChartOptions Uses Untyped String Fields (Dead Code)
- **Severity:** HIGH
- **Sources:** Type Safety (HIGH)
- **Location:** `src/types/services.ts:752-757`
- **What:** Dead code from Chart.js web app. `RenderChartOptions` defines `metricType` and `exerciseName` as plain `string` fields.
- **Why it matters:** Dead code that should be removed alongside TD-10.
- **Suggested fix:** Remove entirely as part of Chart.js dead code cleanup.
- **Blast radius:** None (dead code)

#### TD-30: Chart Data Computation Errors Not Surfaced
- **Severity:** HIGH
- **Sources:** Error Handling (HIGH)
- **Location:** `src/hooks/useChartData.ts:110-117`
- **What:** If `getExerciseMetrics()` returns an error mid-refresh (after cached data was shown), the error is silently ignored and stale data remains on screen.
- **Why it matters:** Charts show outdated metrics with no indication of staleness.
- **Suggested fix:** Add `error` state to `useChartData` hook. Display subtle staleness indicator.
- **Blast radius:** All chart rendering

---

### MEDIUM

#### TD-31: Exercise Cache Fully Cleared on Single Exercise Change
- **Severity:** MEDIUM
- **Sources:** Service Layer (MEDIUM)
- **Location:** `src/lib/cache.ts:46-52`, `src/hooks/useExercises.ts`
- **What:** `clearExerciseCache()` removes the entire exercise cache key. One user-exercise update clears the full ~200-exercise cache, forcing a complete reload.
- **Why it matters:** Unnecessary network churn, especially on slower connections.
- **Suggested fix:** Implement `updateCachedExercise()` / `removeCachedExercise()` for in-place patching.
- **Blast radius:** Exercise picker performance after settings changes

#### TD-32: Missing Idempotency on Template Cache Writes
- **Severity:** MEDIUM
- **Sources:** Service Layer (MEDIUM)
- **Location:** `src/services/templates.ts`, `app/template-editor.tsx:233-280`
- **What:** No transactional guarantee between server mutation and AsyncStorage update. Rapid saves could result in partial updates or lost edits.
- **Why it matters:** Rare but possible data loss if AsyncStorage encounters an I/O error.
- **Suggested fix:** Ensure cache write happens synchronously after mutation. Verify cache matches server.
- **Blast radius:** Template editing and creation flow

#### TD-33: RestTimerBar Recreates Callbacks on Every Timer Tick
- **Severity:** MEDIUM
- **Sources:** Performance (MEDIUM)
- **Location:** `src/components/RestTimerBar.tsx:85-139`
- **What:** Five callback handlers don't use `useCallback` and are recreated every second during active timer.
- **Why it matters:** 60 callback recreations per minute. Wasteful allocation during active workouts.
- **Suggested fix:** Wrap each callback in `useCallback` with appropriate dependencies.
- **Blast radius:** Memory usage during active workouts

#### TD-34: ExercisePickerModal State Reset on Visibility Change Is Brute Force
- **Severity:** MEDIUM
- **Sources:** Performance (MEDIUM)
- **Location:** `src/components/ExercisePickerModal.tsx:65-76`
- **What:** 7 pieces of state are reset sequentially in a useEffect on visibility change, each causing a re-render.
- **Why it matters:** Modal open/close causes excessive batched re-renders.
- **Suggested fix:** Group into `useReducer` for a single state update, or destroy component on close.
- **Blast radius:** Modal open/close performance

#### TD-35: WorkoutSetRow Re-renders on Swipe of Other Rows
- **Severity:** MEDIUM
- **Sources:** Performance (MEDIUM)
- **Location:** `src/components/WorkoutSetRow.tsx:102`
- **What:** `WorkoutSetRow` receives `isRevealed` prop and re-renders on every swipe coordinate change for non-revealed rows. With 10-20 sets visible, this causes many unnecessary re-renders.
- **Why it matters:** Swipe gesture performance degradation with multiple sets.
- **Suggested fix:** Memoize with `React.memo` comparing scalar props.
- **Blast radius:** Set row interactions

#### TD-36: useWorkoutState Hook Mixes State Management with Change Detection
- **Severity:** MEDIUM
- **Sources:** Component Decomposition (MEDIUM)
- **Location:** `src/hooks/useWorkoutState.ts:90-502`
- **What:** 502-line hook manages both state mutations and change detection logic (`getRestTimeChanges()`, `getWeightRepsChanges()`).
- **Why it matters:** Two distinct responsibilities. If change detection grows, the hook becomes unwieldy.
- **Suggested fix:** Consider extracting `useWorkoutChangeDetection()` if logic grows. Currently acceptable.
- **Blast radius:** Low; future refactor

#### TD-37: Auth Token Storage Errors Not Surfaced
- **Severity:** MEDIUM
- **Sources:** Error Handling (MEDIUM)
- **Location:** `src/lib/supabase.ts:1-22`
- **What:** The `expo-sqlite/localStorage` adapter can fail to persist tokens silently. Users are logged out on next app open with no explanation.
- **Why it matters:** Silent session loss breaks the auth flow.
- **Suggested fix:** Test token persistence on startup. If session is missing but user was previously logged in, show a message.
- **Blast radius:** App root/layout

#### TD-38: Notification Scheduling Errors Are Silently Ignored
- **Severity:** MEDIUM
- **Sources:** Error Handling (MEDIUM)
- **Location:** `src/hooks/useRestTimer.ts:163-179, 273-288`
- **What:** Notification scheduling can fail if user denies permission, but the error is caught and ignored. Timer still runs but user won't be alerted when backgrounded.
- **Why it matters:** Users miss set alerts without knowing why.
- **Suggested fix:** Expose `permissionStatus` from hook. Show warning on timer when notifications are disabled.
- **Blast radius:** Rest timer UI

#### TD-39: Supabase Query Results Not Narrowed After `.data` Extraction
- **Severity:** MEDIUM
- **Sources:** Type Safety (MEDIUM)
- **Location:** `src/services/exercises.ts:292, 436` and similar patterns throughout all services
- **What:** After Supabase queries, `.data` is extracted and cast without checking if it's `null` first.
- **Why it matters:** If Supabase returns `null`, the cast hides this. Should check `if (!data)` before casting.
- **Suggested fix:** Consistently check `data` before casting in all service functions.
- **Blast radius:** All service functions querying Supabase

#### TD-40: Loose Typing in ExerciseHistoryMode and Related Union Types
- **Severity:** MEDIUM
- **Sources:** Type Safety (MEDIUM)
- **Location:** `src/types/services.ts:488, 541, 548`
- **What:** `ExerciseMetricType` is used as optional field (`metric?:`) with no documented default. Implementations use `?? 'total_sets'` without type-level guarantees.
- **Why it matters:** The interface contract is ambiguous. Consumers must guess the default.
- **Suggested fix:** Make `metric` required with documented default, or make the default explicit in the type.
- **Blast radius:** `useChartData`, `getExerciseMetrics()`

#### TD-41: Optional Fields in RecentExerciseData with Unsafe Defaults
- **Severity:** MEDIUM
- **Sources:** Type Safety (MEDIUM)
- **Location:** `src/types/services.ts:570-579`, `src/services/logging.ts:620-625`
- **What:** `RecentExerciseData` has required fields, but implementation uses fallbacks (`firstSet?.reps || 10`). Type says "always present" but code says "might be missing".
- **Why it matters:** Contract mismatch between interface and implementation.
- **Suggested fix:** Either make fields optional or guarantee non-null values.
- **Blast radius:** Workout initialization

#### TD-42: Rollback Operations Don't Verify Success
- **Severity:** MEDIUM
- **Sources:** Error Handling (MEDIUM)
- **Location:** `src/services/templates.ts:311-314, 346, 584, 641-644`
- **What:** Delete operations during rollback are not awaited or error-checked. Failed rollbacks leave orphaned templates.
- **Why it matters:** Orphaned templates accumulate in database/UI.
- **Suggested fix:** Await all delete operations, check errors, return `{ rollbackFailed: true }` if needed.
- **Blast radius:** Template editor

#### TD-43: useChartData Doesn't Handle Cancelled Cleanup Properly
- **Severity:** MEDIUM
- **Sources:** Error Handling (MEDIUM)
- **Location:** `src/hooks/useChartData.ts:132`
- **What:** `setCachedChartMetrics()` is called after the cancellation check. If component remounts during cache write, cache becomes stale.
- **Why it matters:** Rapid navigation can leave cache inconsistent.
- **Suggested fix:** Move `setCachedChartMetrics()` inside the cancellation check.
- **Blast radius:** Low; minor fix

#### TD-44: ChartCard Data Fetching Could Be Decoupled from Rendering
- **Severity:** MEDIUM
- **Sources:** Component Decomposition (MEDIUM)
- **Location:** `src/components/ChartCard.tsx:87-237`
- **What:** ChartCard directly calls `useChartData()` and mixes rendering concerns (unit suffix, label thinning, Y-axis scaling) with data loading.
- **Why it matters:** Moderate coupling; if chart variants are needed, refactoring is required.
- **Suggested fix:** Optional: extract sub-components for visualization, loading, and empty states.
- **Blast radius:** Low; current structure acceptable

---

### LOW

#### TD-45: useCharts Comparison Function Could Be More Thorough
- **Severity:** LOW
- **Sources:** Performance (LOW)
- **Location:** `src/hooks/useCharts.ts:17-28`
- **What:** `chartsChanged` comparison skips full exercise object, only checking `exercises.name`.
- **Blast radius:** Edge case with exercise metadata changes

#### TD-46: ProgressRing Not Memoized Despite Receiving Stable Props
- **Severity:** LOW
- **Sources:** Performance (LOW)
- **Location:** `src/components/ProgressRing.tsx`
- **What:** Small component receiving scalar props that could benefit from `React.memo`.
- **Blast radius:** Minimal

#### TD-47: Inline Object Creation in WorkoutSetRow Styles
- **Severity:** LOW
- **Sources:** Performance (LOW)
- **Location:** `src/components/WorkoutSetRow.tsx:211-214`
- **What:** Set number badge style created inline conditionally on every render.
- **Blast radius:** Minimal

#### TD-48: ExercisePickerModal Category Dropdown Toggles Without Memoization
- **Severity:** LOW
- **Sources:** Performance (LOW)
- **Location:** `src/components/ExercisePickerModal.tsx:249-255, 281-290`
- **What:** Dropdown toggle callback not memoized; dropdown modal recreated every render.
- **Blast radius:** Low visual impact

#### TD-49: Inline `formatWeight` Helper Duplicated Across Files
- **Severity:** LOW
- **Sources:** Component Decomposition (LOW)
- **Location:** `src/components/WorkoutSetRow.tsx:69-75`
- **What:** `formatWeight()` is defined inside the component and duplicated in other files.
- **Suggested fix:** Move to `src/lib/formatUtils.ts`.
- **Blast radius:** Minimal

#### TD-50: Multiple Category Dropdown Implementations
- **Severity:** LOW
- **Sources:** Component Decomposition (LOW)
- **Location:** `src/components/MyExercisesList.tsx:230-256`, `ExercisePickerModal.tsx:319-356`, `CreateExerciseModal.tsx:137-162`
- **What:** Three independent implementations of the same category dropdown pattern.
- **Suggested fix:** Extract reusable `<CategoryDropdown>` component.
- **Blast radius:** Maintenance burden

#### TD-51: Duplicate Metric Calculation Logic
- **Severity:** LOW
- **Sources:** Service Layer (LOW)
- **Location:** `src/services/logging.ts:42-65`, `app/workout.tsx:681-702`
- **What:** `calculateMetrics()` logic duplicated inline in `getWorkoutLogsPaginated()`.
- **Blast radius:** Metrics consistency

#### TD-52: No Deduplication in getExercisesWithLoggedData Query
- **Severity:** LOW
- **Sources:** Service Layer (LOW)
- **Location:** `src/services/exercises.ts:245-314`
- **What:** JavaScript deduplication of query results that could use `DISTINCT ON` in the query.
- **Blast radius:** Performance for active users with many logged workouts

#### TD-53: updateTemplateExerciseSetValues Not Properly Exported
- **Severity:** LOW
- **Sources:** Service Layer (LOW)
- **Location:** `src/services/templates.ts`, `app/workout.tsx:45`
- **What:** Function imported directly but not included in the service export object.
- **Blast radius:** Fragile import path

#### TD-54: Implicit `any` in Destructured Supabase Query Results
- **Severity:** LOW
- **Sources:** Type Safety (LOW)
- **Location:** `src/services/logging.ts:213`
- **What:** Cast to `{ count: number }[]` is a noisy workaround for Supabase's count query shape.
- **Blast radius:** Minimal

#### TD-55: ExerciseCategory Cast in templates.ts
- **Severity:** LOW
- **Sources:** Type Safety (LOW)
- **Location:** `src/services/templates.ts:99`
- **What:** Fallback `'Core'` cast as `ExerciseCategory` is fragile if the enum changes.
- **Blast radius:** Minimal

#### TD-56: Console Errors Not Consistent in Format
- **Severity:** LOW
- **Sources:** Error Handling (LOW)
- **Location:** Throughout all services and hooks
- **What:** Error logging uses various formats with inconsistent context.
- **Suggested fix:** Create a logger utility with consistent format.
- **Blast radius:** Debugging quality

#### TD-57: Service Functions Don't Include Request Context
- **Severity:** LOW
- **Sources:** Error Handling (LOW)
- **Location:** All services
- **What:** No request ID or timestamp to correlate logs for concurrent requests.
- **Blast radius:** Debugging concurrency issues

#### TD-58: No Error Rate Monitoring
- **Severity:** LOW
- **Sources:** Error Handling (LOW)
- **Location:** No centralized monitoring
- **What:** Write queue retry counts never exposed. No error rate tracking.
- **Blast radius:** Optional monitoring infrastructure

---

## Summary Table

### Findings by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 10 |
| HIGH | 20 |
| MEDIUM | 14 |
| LOW | 14 |
| **Total** | **58** |

### Findings by Area and Severity

| Area | CRITICAL | HIGH | MEDIUM | LOW | Total |
|------|----------|------|--------|-----|-------|
| **Performance** | 1 (TD-06) | 5 (TD-13, TD-14, TD-15, TD-16, TD-17) | 3 (TD-33, TD-34, TD-35) | 4 (TD-45, TD-46, TD-47, TD-48) | 13 |
| **Architecture** | 2 (TD-07, TD-08) | 4 (TD-11, TD-22, TD-23, TD-24) | 2 (TD-36, TD-44) | 2 (TD-49, TD-50) | 10 |
| **Cache** | 3 (TD-01, TD-03, TD-04) | 2 (TD-12, TD-27) | 3 (TD-31, TD-32, TD-43) | 0 | 8 |
| **Types** | 2 (TD-09, TD-10) | 3 (TD-25, TD-26, TD-29) | 3 (TD-39, TD-40, TD-41) | 3 (TD-54, TD-55, TD-56^) | 11 |
| **Error Handling** | 2 (TD-02, TD-05) | 6 (TD-18, TD-19, TD-20, TD-21, TD-28, TD-30) | 3 (TD-37, TD-38, TD-42) | 3 (TD-51, TD-52, TD-53, TD-57, TD-58) | 16 |

*Note: Some findings span multiple areas (e.g., TD-11 spans Architecture + Error Handling). Each is counted in its primary area. TD-56/TD-57/TD-58 are cross-cutting concerns placed under Error Handling.*

---

## Fix Clusters

Related findings that should be fixed together in a single PR.

### Cluster A: Chart Cache Overhaul
- **TD-01** Chart metrics cache never invalidated
- **TD-03** Chart metrics cache race condition
- **TD-43** useChartData cancelled cleanup
- **TD-30** Chart data computation errors not surfaced

### Cluster B: Workout Timer Performance
- **TD-06** useRestTimer callback dependencies
- **TD-13** WorkoutExerciseCard re-renders on every tick
- **TD-14** getTimerProps recreates every render
- **TD-33** RestTimerBar callback recreation
- **TD-46** ProgressRing not memoized

### Cluster C: Workout Finish Flow Extraction
- **TD-11** Silent save failures during workout finish
- **TD-12** Template cache not refreshed after mutations
- **TD-15** getRestTimeChanges/getWeightRepsChanges recreation

### Cluster D: Dead Code and Type Literals
- **TD-09** CreateChartInput untyped string fields
- **TD-10** Explicit `any` in ChartsService (dead code)
- **TD-29** RenderChartOptions dead code

### Cluster E: Error Typing and Service Result Pattern
- **TD-18** Supabase query errors not distinguished from offline
- **TD-25** Type assertions bypass type safety
- **TD-26** Logging service uses `as any`
- **TD-39** Supabase query results not narrowed
- **TD-54** Implicit `any` in destructured results

### Cluster F: Write Queue and Offline Resilience
- **TD-02** Write queue doesn't handle validation failures
- **TD-19** Write queue processing errors silent
- **TD-04** AsyncStorage write failures silent
- **TD-21** Cache read errors leave UI in loading state

### Cluster G: Component Business Logic Extraction
- **TD-07** ExercisePickerModal business logic
- **TD-08** AddChartSheet business logic
- **TD-22** MyExercisesList edit workflow
- **TD-34** ExercisePickerModal state reset
- **TD-48** ExercisePickerModal dropdown memoization

### Cluster H: Auth and Session Resilience
- **TD-05** Session refresh failures
- **TD-37** Auth token storage errors

### Cluster I: Template Service Robustness
- **TD-20** Template mutations partially fail
- **TD-42** Rollback operations don't verify success
- **TD-32** Missing idempotency on template cache writes
- **TD-53** updateTemplateExerciseSetValues not properly exported

### Cluster J: Exercise Picker and Search Performance
- **TD-16** ExercisePickerModal filtering on every keystroke
- **TD-31** Exercise cache fully cleared on single change
- **TD-50** Multiple category dropdown implementations

---

## Recommended Fix Order

### PR 1: Chart Cache Invalidation and Race Condition Fix
- **Findings:** TD-01, TD-03, TD-43, TD-30
- **Estimated complexity:** Medium
- **Files touched:**
  - `src/lib/cache.ts` (restructure metrics cache to per-key writes, add TTL, add `clearChartMetricsForExercise`)
  - `src/hooks/useChartData.ts` (add request deduplication, add error state, fix cancellation ordering)
  - `app/workout.tsx` (call cache invalidation after workout save)
- **Why this order:** These are CRITICAL findings that cause user-visible stale data on every workout. The chart cache is a self-contained subsystem with clear boundaries. Fixing it first establishes the cache invalidation pattern that later PRs can follow.

### PR 2: Dead Code Removal and Type Literal Tightening
- **Findings:** TD-09, TD-10, TD-29, TD-40
- **Estimated complexity:** Small
- **Files touched:**
  - `src/types/services.ts` (remove `renderChart`, `destroyChart`, `RenderChartOptions`; tighten `CreateChartInput` unions; clarify `ExerciseMetricType` optionality)
  - `src/services/charts.ts` (remove dead method implementations)
- **Why this order:** Quick win. Removes dead code that clutters the type system and tightens types that other PRs will rely on. No behavioral changes, so minimal risk. Establishes clean type contracts before service layer fixes.

### PR 3: Workout Timer Performance Optimization
- **Findings:** TD-06, TD-13, TD-14, TD-33, TD-46, TD-35, TD-47
- **Estimated complexity:** Medium
- **Files touched:**
  - `src/hooks/useRestTimer.ts` (granular callback dependencies)
  - `app/workout.tsx` (memoize getTimerProps)
  - `src/components/WorkoutExerciseCard.tsx` (wrap in React.memo with custom comparator)
  - `src/components/RestTimerBar.tsx` (wrap callbacks in useCallback)
  - `src/components/ProgressRing.tsx` (wrap in React.memo)
  - `src/components/WorkoutSetRow.tsx` (wrap in React.memo, extract inline styles)
- **Why this order:** Addresses the single largest performance drain (every-second re-renders across all exercise cards). Must be done before the finish flow extraction (PR 4) because the workout screen will be refactored there. The timer dependency fix (TD-06) is the root cause; the memoization fixes (TD-13, TD-14) are the propagation blockers.

### PR 4: Workout Finish Flow Extraction and Silent Save Fix
- **Findings:** TD-11, TD-12, TD-15, TD-36
- **Estimated complexity:** Large
- **Files touched:**
  - `app/workout.tsx` (extract finish flow to hook, remove business logic)
  - `src/hooks/useWorkoutCompletion.ts` (new hook for finish flow)
  - `src/hooks/useWorkoutState.ts` (memoize change detection callbacks)
  - `src/services/templates.ts` (return `{ updated, failed }` from `updateTemplateExerciseSetValues`, ensure proper export)
- **Why this order:** Depends on PR 1 (cache invalidation pattern) and PR 3 (timer optimization, since both modify workout.tsx). Extracts the finish flow into a testable hook and fixes silent data loss. The hook extraction is the largest single refactor.

### PR 5: Error Typing and Service Result Pattern
- **Findings:** TD-18, TD-25, TD-26, TD-39, TD-54, TD-55
- **Estimated complexity:** Large
- **Files touched:**
  - `src/types/services.ts` (define typed error result, discriminated union)
  - `src/services/exercises.ts` (add null checks before casts)
  - `src/services/templates.ts` (add null checks, fix ExerciseCategory cast)
  - `src/services/charts.ts` (add null checks, fix type assertions)
  - `src/services/logging.ts` (define RawWorkoutLog interface, replace `as any`, fix count destructuring)
  - `src/hooks/useExercises.ts`, `useCharts.ts`, `useTemplates.ts` (use typed error messages)
- **Why this order:** Depends on PR 2 (type cleanup). Establishes the typed error pattern that PR 6 (write queue) and PR 7 (component extraction) will use. Touches many files but changes are mechanical (add null checks, replace `as any`).

### PR 6: Write Queue and Offline Resilience
- **Findings:** TD-02, TD-19, TD-04, TD-21, TD-05, TD-37
- **Estimated complexity:** Large
- **Files touched:**
  - `src/services/writeQueue.ts` (error type detection, dead-letter queue, status return)
  - `src/hooks/useWorkoutBackup.ts` (expose backupError state)
  - `src/lib/cache.ts` (detect/clean corrupted data, add runtime validation)
  - `src/lib/supabase.ts` (add onAuthStateChange monitoring)
  - `src/hooks/useExercises.ts`, `useCharts.ts`, `useTemplates.ts` (handle cache read errors with explicit error state)
  - `app/_layout.tsx` or root component (session expiry handling)
  - Dashboard UI (sync status badge)
- **Why this order:** Depends on PR 5 (typed errors) since write queue error detection uses the new error type system. These are CRITICAL resilience fixes but require the error infrastructure from PR 5.

### PR 7: Component Business Logic Extraction
- **Findings:** TD-07, TD-08, TD-22, TD-24, TD-34, TD-16, TD-17, TD-48
- **Estimated complexity:** Large
- **Files touched:**
  - `src/components/ExercisePickerModal.tsx` (extract to UI-only, fix state reset, memoize)
  - `src/components/AddChartSheet.tsx` (extract to UI-only, memoize groupedExercises and styles)
  - `src/components/MyExercisesList.tsx` (extract edit workflow)
  - `src/components/RestTimerBar.tsx` (extract time utils)
  - `src/hooks/useExerciseCreation.ts` (new)
  - `src/hooks/useExerciseSearch.ts` (new)
  - `src/hooks/useChartCreation.ts` (new)
  - `src/hooks/useExerciseEdit.ts` (new)
  - `src/hooks/useRestTimerEdit.ts` (new)
  - `src/lib/timeUtils.ts` (new)
- **Why this order:** Depends on PR 5 (error types flow into hooks). Largest PR by file count but each extraction is independent. Can potentially be split into sub-PRs (7a: ExercisePickerModal, 7b: AddChartSheet, 7c: MyExercisesList, 7d: RestTimerBar).

### PR 8: Template Robustness, Utility Extraction, and Remaining Cleanup
- **Findings:** TD-20, TD-42, TD-32, TD-27, TD-28, TD-31, TD-38, TD-49, TD-50, TD-51, TD-52, TD-53, TD-23, TD-41, TD-44, TD-45, TD-56, TD-57, TD-58
- **Estimated complexity:** Medium (individually small fixes)
- **Files touched:**
  - `src/services/templates.ts` (await rollback deletes, verify success, export function properly)
  - `src/services/charts.ts` (single-query chart creation)
  - `src/components/TemplateCard.tsx` (memoize renderRightActions)
  - `src/lib/cache.ts` (granular exercise cache update)
  - `src/hooks/useRestTimer.ts` (expose notification permission status)
  - `src/lib/formatUtils.ts` (new: extract formatWeight)
  - `src/components/CategoryDropdown.tsx` (new: reusable dropdown)
  - `src/services/logging.ts` (extract shared calculateMetrics, optimize query)
  - `src/hooks/useCharts.ts` (improve comparison function)
  - Logger utility (optional: centralized logging)
- **Why this order:** Cleanup PR that addresses all remaining findings. Many are LOW severity and can be done opportunistically. Template robustness fixes (TD-20, TD-42) are the most important items here. This PR can be split into smaller batches if preferred.
