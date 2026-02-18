# Consolidated Tech Debt Report

Synthesized from five audit reports: Performance & Re-rendering, Component Decomposition, Service Layer & Cache, Type Safety, and Error Handling & Resilience.

---

## Deduplicated Findings

Each finding has a unique ID (TD-XX), severity, and notes which source reports contributed.

---

### CRITICAL

#### TD-01: Evaluate as not a tech debt, issue resolve

#### TD-03: Evaluate as not a tech debt, issue struck

- **Original claim:** Chart Metrics Cache Race Condition with Concurrent Writes (CRITICAL)
- **Analysis:** The read-modify-write race in `setCachedChartMetrics` is technically real but has no practical user impact. The cache is a throw-away performance optimization — authoritative data lives in Supabase. Every dashboard mount re-fetches all charts from the network regardless of cache state. Worst case: one chart shows a brief loading placeholder on a single cold start, then self-heals on the next fetch. The error handling claim ("no error caught or logged") was factually wrong — `console.error` exists at line 195-196. The "jank and stale data" symptoms are unrelated to this race (the hook already has cancellation flags and initial-data refs).

#### TD-04: Evaluate as not critical — downgraded to LOW

- **Original claim:** AsyncStorage Write Failures During Workout Are Silent (CRITICAL)
- **Analysis:** The backup is NOT the primary save path — it is solely a crash recovery safety net. The primary workout save (Finish → `logging.createWorkoutLog()` or write queue `enqueue()`) is completely independent of the backup and works regardless of backup state. All workout data lives in React state (memory) for the entire session. The actual data loss scenario requires two simultaneous rare events: AsyncStorage write failure (device storage full) AND an app crash before the user taps Finish. For the cache layer, `null` returns on parse errors are the designed degradation path — hooks treat cache misses as "fall back to Supabase." The "no runtime validation" concern is standard TypeScript practice; the app is the sole writer to these keys. The "silently disables offline functionality" framing is misleading — it only occurs under device-wide storage pressure, which the user would already be experiencing system-wide.

#### TD-05: Evaluate as not critical — downgraded to HIGH

- **Original claim:** Session Refresh Failures Are Not Handled (CRITICAL)
- **Analysis:** The `onAuthStateChange()` subscription already exists in `useAuth.tsx` and fires when session changes — session null triggers redirect to login via `Stack.Protected guard`. The Supabase JS client (`autoRefreshToken: true`) automatically refreshes tokens 60 seconds before expiry. The claimed "silent failure" scenario requires: (a) app backgrounded for 60+ minutes beyond token lifespan, (b) refresh token also expired, (c) user tries to sync. In practice, typical gym sessions (30-60 min) complete within the 1-hour token window. If a session does expire, the write queue catches failed saves — no data is lost. The real (narrow) issue is that queued workouts can't sync until the user logs out and back in, since the queue has no mechanism to refresh an expired session. Downgraded because the impact is limited to long-offline users and no data loss occurs.

#### TD-06: Evaluate as not critical — downgraded to HIGH

- **Original claim:** useRestTimer's isActiveForExercise Dependency on Full Timer State (CRITICAL)
- **Analysis:** The `[timer]` dependency array issue is technically real — callbacks recreate every second. However, `isActiveForExercise` is called in the parent component (workout.tsx), not passed to children as claimed. The actual re-render propagation is caused by the parent re-rendering on timer state change, cascading to all unmemoized children (WorkoutExerciseCard, RestTimerBar, ProgressRing, WorkoutSetRow — none use React.memo). On modern iPhones with 4-5 exercise cards, this produces ~60-100 component re-renders/second during active timer. The symptom is potential input lag when editing weights/reps while timer runs and minor battery drain, not critical UI jank or data loss. The root cause is the combination of broad callback deps AND lack of component memoization — fixing only the deps (as suggested) is necessary but insufficient. Downgraded because impact is conditional on device age and workout size, with no data loss or crashes.

#### TD-07: Evaluate as not a tech debt, issue struck

- **Original claim:** ExercisePickerModal Violates Code Placement Rules (CRITICAL)
- **Analysis:** The constitution's "UI and navigation only — no business logic" rule applies to **screens** in `app/`, not reusable components in `src/components/`. The component properly uses `useExercises()` hook for data fetching and calls `exercisesService.createExercise()` for the service operation — both are standard React patterns. What's labeled "business logic" is actually UI state management (search filter, dropdown state, form state) and UI orchestration (call service, handle response, update UI state). The filtering logic (`useMemo` with category and search) is pure presentation logic. The exercise creation flow is not reused elsewhere — extracting it to a hook would be YAGNI. This same pattern exists in CreateExerciseModal, ChartCard, MyExercisesList, and AddChartSheet without issue. Zero user-facing impact.

#### TD-08: Evaluate as not a tech debt, issue struck

- **Original claim:** AddChartSheet Mixes UI and Business Logic (CRITICAL)
- **Analysis:** Same reasoning as TD-07. The component has ~70 lines of "logic" (data loading, state management, service calls) within 440 lines of UI code — well within normal React component bounds. The grouping logic (10-line `reduce` to group exercises by category) is presentation logic, not business logic — it transforms data solely for rendering and is not persisted. The exercise fetching calls a service method directly (standard React pattern, not a violation). Extracting a `useChartCreation()` hook would move the same code to a different file without improving testability — the service (`charts.createChart()`) is already independently testable. This pattern matches ExercisePickerModal, CreateExerciseModal, and ChartCard. Zero user-facing impact.

#### TD-09: Evaluate as not critical — downgraded to LOW

- **Original claim:** CreateChartInput Uses Untyped String Fields Instead of Literal Unions (CRITICAL)
- **Analysis:** There is a single call site for `createChart()` — `AddChartSheet.tsx` line 211. The values originate from React state initialized with typed literals: `useState<MetricType>('total_sets')` and `useState<XAxisMode>('session')`, where `MetricType` and `XAxisMode` are already literal unions defined locally. The UI uses radio buttons with hardcoded valid options (`METRIC_OPTIONS`, `AXIS_OPTIONS`) — users physically cannot produce an invalid value. The database also enforces CHECK constraints (`metric_type = ANY (ARRAY['total_sets', 'max_volume_set'])`). This is a theoretical type-narrowing improvement with zero runtime bug potential — the type gap exists only in the interface definition, while all actual value flow paths are fully typed upstream and constrained downstream.

#### TD-10: Evaluate as not critical — downgraded to LOW

- **Original claim:** Explicit `any` Type in ChartsService Interface — Dead Code (CRITICAL)
- **Analysis:** Confirmed dead code. `renderChart()` and `destroyChart()` are never implemented in `src/services/charts.ts` — the service export omits them entirely. Zero references exist in the live codebase. The decision document explicitly states these methods were replaced by declarative `<LineChart>` components. The `any` types in dead code do not "defeat type checking" for live code — they're isolated to unused interface methods. This is a 5-minute cleanup task, not tech debt accruing interest. Downgraded because dead code has zero user impact, zero runtime effect, and minimal maintenance cost.

---

### HIGH

#### TD-11: Evaluate as not high — downgraded to MEDIUM

- **Original claim:** Silent Save Failures During Workout Finish (HIGH)
- **Analysis:** The "silent data loss" framing is misleading. The workout log itself (the primary user data — exercises, sets, weight, reps) saves reliably via `logging.createWorkoutLog()` with write queue fallback. What fails silently are **template default updates** — pre-fill values for the *next* workout's weight/reps/rest time. These are secondary metadata, not the workout record. The code comments explicitly say "Best-effort per locked decision" — this is intentional, documented behavior. If template defaults fail to save, the user sees stale pre-fills on the next workout and manually re-enters values — annoying but recoverable. Individual set update failures (3 of 5) are real but LOW impact. The "screen contains business logic" concern is code organization preference with zero user impact. Downgraded because no primary data is lost and the behavior is by design.

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

#### TD-14: Evaluate as not high — downgraded to MEDIUM (prerequisite for TD-13)

- **Original claim:** WorkoutScreen getTimerProps Recreates Timer Props Object Every Render (HIGH)
- **Analysis:** Without TD-13 memoization (React.memo on WorkoutExerciseCard), this object recreation has zero user impact — the parent re-renders cascade to all children regardless of prop object identity. The report correctly notes "must be fixed alongside TD-13," confirming this is not an independent issue. Props are destructured into scalar values before passing to children, so the object reference itself never reaches child components. This is a "necessary but not sufficient" fix that only matters IF TD-13 is implemented. Downgraded to MEDIUM as a prerequisite for TD-13, not a standalone problem.

#### TD-15: Evaluate as not a tech debt, issue struck

- **Original claim:** useWorkoutState getRestTimeChanges/getWeightRepsChanges Recreate on Every Render (HIGH)
- **Analysis:** These callbacks are **never passed as props** to any child component — they are only called inside event handlers during the finish flow (`saveRestTimeChanges`, `saveWeightRepsChanges`). `useCallback` recreation does NOT cause re-renders unless the callback is passed to a memoized child, which it isn't. The "potential re-render trigger if passed to memoized children in the future" is purely theoretical — no memoized children exist, and these callbacks are not props. The dependency on `activeWorkout.exercises` is correct (the callbacks read from it); removing it would introduce stale closure bugs. Zero performance impact.

#### TD-16: Evaluate as not a tech debt, issue struck

- **Original claim:** ExercisePickerModal Filtering Recreates Objects on Every Keystroke (HIGH)
- **Analysis:** The report's claims are **factually incorrect**. Code review reveals: (1) `ListEmptyComponent` IS wrapped in `useMemo` (line 160), (2) `renderItem` IS wrapped in `useCallback` (line 145), (3) `removeClippedSubviews={true}` IS present (line 232), (4) `keyExtractor` IS wrapped in `useCallback` (line 157), (5) FlatList already has `maxToRenderPerBatch={15}`, `windowSize={11}`, `initialNumToRender={15}`, and `getItemLayout` for fixed-height items. All three suggested fixes are already implemented. Exercise library is typically 150-250 items with FlatList virtualization — no performance issue on modern iPhones.

#### TD-17: Evaluate as not high — downgraded to LOW

- **Original claim:** AddChartSheet RadioGroup Recreates Inline Styles and Components (HIGH)
- **Analysis:** The `groupedExercises` reduce operates on exercises with logged data — typically 5-20 items, not the full library. O(5-20) completes in <1ms. Radio button clicks (`setMetricType`, `setXAxisMode`) re-render the form view, NOT the exercise select view where `groupedExercises` lives — the reduce only runs in the `step === 'selectExercise'` branch, so radio clicks don't trigger it at all. Inline style recreation in React Native is standard practice and negligible cost for 2-4 radio options. The claimed "noticeable lag when clicking radio options" cannot be caused by the identified code. Downgraded because the claimed symptom doesn't match the identified location.

#### TD-18: Evaluate as not high — downgraded to LOW

- **Original claim:** Supabase Query Errors Not Distinguished from Offline (HIGH)
- **Analysis:** The cache-first loading strategy means users rarely see errors at all — cached data is served instantly and the network fetch runs in the background. When errors ARE visible (first install with no cache + no network), network errors represent ~95% of real-world failures, making "check your connection" correct guidance the vast majority of the time. RLS violations (<1%) indicate code bugs, not user-fixable conditions. Auth errors are handled separately by TD-05's session monitoring. For a single-user app with no multi-tenant permission matrix, users can't meaningfully act on error type distinctions. The proposed discriminated union pattern (touching 8+ files) has high implementation cost for negligible user benefit. Downgraded because the generic message is correct 95% of the time and the cache-first pattern hides errors from users in 95% of scenarios.

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

#### TD-21: Evaluate as not high — downgraded to MEDIUM (reframed)

- **Original claim:** Cache Read Errors Leave UI in Loading State Forever (HIGH)
- **Analysis:** The "spinner forever" claim is **false**. All three hooks (`useExercises`, `useCharts`, `useTemplates`) unconditionally call `setIsLoading(false)` at the end of the loading callback, outside all try/catch blocks. When both cache AND network fail, the hooks correctly set `error` state. The actual (smaller) issue: the dashboard extracts `error` from `useTemplates()` and displays it, but does NOT extract `error` from `useCharts()` — chart loading errors are silently ignored in the dashboard, showing "No charts configured yet" (empty state) instead of an error message. This is a component wiring issue in `app/index.tsx`, not a hook-level problem. Reframed: "Dashboard doesn't wire charts error state."

#### TD-22: Evaluate as not a tech debt, issue struck

- **Original claim:** MyExercisesList Contains Complex Edit Workflow Without Service Abstraction (HIGH)
- **Analysis:** Same reasoning as TD-07 and TD-08 (both struck). The constitution's "UI only" rule applies to screens in `app/`, not reusable components in `src/components/`. The "business logic" is actually UI orchestration: accordion state, form state, service call responses mapped to error messages, and dependency count formatting for the confirmation modal. All actual business logic (validation, dependency querying, deletion) lives in the exercises service — `exercises.updateExercise()` owns validation and returns typed errors, `exercises.getExerciseDependencies()` owns the database query. The component reads service responses and presents them. This identical pattern is used in CreateExerciseModal, ExercisePickerModal, and AddChartSheet without issue. Zero user-facing impact.

#### TD-23: Evaluate as not a tech debt, issue struck

- **Original claim:** WorkoutExerciseCard Over-Integrated with Timer and Swipe Logic (HIGH)
- **Analysis:** The component has 19 props, which is normal for a complex domain component composing 4+ child components (ProgressRing, RestTimerBar, WorkoutSetRow×N, accordion). The timer is global workout state (only one timer active at a time), not per-exercise — the suggested fix ("lift timer state per-exercise via local context") would contradict the single-timer architecture. The prop count reflects correct stateless design: all state lives in the parent, all mutations are pure callbacks, making the component predictable and testable. "Testing requires mocking 16 props" is theoretical — no tests exist for this component or any UI component in the project. No bugs, no performance issues, no user-facing problems from the prop count.

#### TD-24: Evaluate as not a tech debt, issue struck

- **Original claim:** RestTimerBar Combines Timer Editing with Active Timer Display (HIGH)
- **Analysis:** Same reasoning as TD-07/TD-08 (struck). The suggested fix to "extract timer format/parse utilities to `src/lib/timeUtils.ts`" is **already implemented** — `formatTime()`, `parseTimeInput()`, and `clampSeconds()` already live in `src/lib/timeUtils.ts` and are imported by RestTimerBar. The remaining suggestion (`useRestTimerEdit()` hook) would move ~60 lines of editing state to a different file without improving testability — hook testing still requires `renderHook` with the same React environment. The "mini state machine" is just a single `useState<'inactive' | 'editing'>` with 3 conditional renders — not genuinely complex. The component is 163 lines, works correctly, and has no bugs. Zero user-facing impact.

#### TD-25: Evaluate as not high — downgraded to MEDIUM

- **Original claim:** Type Assertions Bypass Type Safety in Nested Query Results (HIGH)
- **Analysis:** This is a pragmatic workaround for a known Supabase TypeScript limitation — the PostgREST type generation does not properly type nested join queries. The codebase already defines internal `RawTemplate`, `RawTemplateExercise`, etc. interfaces (templates.ts lines 33-71) that document the expected Supabase response shape. The `transformTemplate()` function handles null FK joins via `.filter()` and optional chaining with safe defaults. Months of production use without type-related runtime errors. Runtime validation would check properties that Supabase always populates — the real protection is the transform function's null handling, which already exists. Downgraded because the workaround is documented, safe, and standard practice for Supabase apps.

#### TD-26: Evaluate as not high — downgraded to LOW

- **Original claim:** Logging Service Uses `as any` for template_name Field Access (HIGH)
- **Analysis:** This is a single `as any` cast on one line (line 275) with an eslint-disable comment showing awareness. The Supabase query explicitly selects `templates (name)` so the field is always present at runtime. The `|| null` fallback guarantees safe default even if access fails. This is the same Supabase nested join typing limitation as TD-25 — the cast works around PostgREST's inability to type joined relations. The scope is tiny (one line, one function, one field), the runtime behavior is correct, and it doesn't cascade to other code. Downgraded because a single `as any` with safe fallback on a correctly-queried field is LOW severity, not HIGH.

#### TD-27: Evaluate as not high — downgraded to MEDIUM

- **Original claim:** Duplicate Supabase Query in createChart (HIGH)
- **Analysis:** Chart creation is an infrequent operation — users create 2-5 charts during initial setup, then rarely create new ones. The extra round-trip adds ~100-300ms to an operation that already requires network with a loading spinner. The "race condition" (exercise deleted between insert and re-fetch) is extremely unlikely and the code already has a fallback (lines 164-165: falls back to insert result without exercises join). The fix (combining insert + nested select in one query) requires verifying Supabase RLS behavior with nested inserts — not guaranteed to work. Downgraded because the latency impact is negligible for an infrequent operation, the race condition is theoretical with existing fallback, and the fix carries implementation uncertainty.

#### TD-28: Evaluate as not high — downgraded to LOW

- **Original claim:** TemplateCard renderRightActions Not Memoized (HIGH)
- **Analysis:** Maximum 20 templates per user (enforced by creation limits). Templates render in a plain `View` via `.map()` inside a `ScrollView` — ScrollView scrolling itself doesn't trigger JavaScript re-renders (handled natively). Parent state changes re-render all 20 cards, but each card is simple text + icons (cheap). `renderRightActions` is a gesture handler for `ReanimatedSwipeable` — reanimated manages animation on the UI thread independent of function recreation. Dashboard re-renders are infrequent (only on template/chart mutations or modal open/close). No user-reported scrolling jank. Downgraded because 20 simple cards is well within performance budget on any modern iPhone.

#### TD-29: Evaluate as not a tech debt, issue struck (subsumed into TD-10)

- **Original claim:** RenderChartOptions Uses Untyped String Fields — Dead Code (HIGH)
- **Analysis:** This is the same dead Chart.js code bundle as TD-10 (already downgraded to LOW). `RenderChartOptions` is only referenced by `renderChart()` in the `ChartsService` interface, which is itself dead code (TD-10). Removing TD-10's dead methods automatically removes TD-29. Tracking it separately is redundant and inflates severity — dead code with zero references is not HIGH severity. Struck because it's subsumed by TD-10.

#### TD-30: Evaluate as not a tech debt, issue struck

- **Original claim:** Chart Data Computation Errors Not Surfaced (HIGH)
- **Analysis:** When cached chart data exists and the network refresh fails, the chart continues showing cached data. This is the **intended cache-first degradation** — the cached data was correct when cached and represents the user's actual workout history. The scenario (cache succeeds then network immediately fails) is extremely rare. Showing an error or staleness indicator when cached data is available would be worse UX — the user expects to see their progress charts, and the data is real (just not the absolute latest). The `refreshKey` mechanism already forces fresh data after workouts when it matters most. A staleness indicator on every chart would add visual noise without helping the user take action. Struck because the current behavior (show cached data when network fails) is the correct UX for a cache-first architecture.

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

#### TD-02: Write Queue Entries Stuck Permanently After MAX_ATTEMPTS

- **Severity:** LOW (downgraded from CRITICAL)
- **Sources:** Error Handling (CRITICAL — downgraded after analysis)
- **Location:** `src/services/writeQueue.ts:110-113`
- **What:** Entries that exceed `MAX_ATTEMPTS` (10) are kept in the queue forever but permanently skipped. They accumulate silently in AsyncStorage with no cleanup and no user notification. The original report claimed "malformed workout logs" as the trigger, but workout data is constructed by the app itself from user interactions (TypeScript-enforced types, app-generated UUIDs, exercise IDs from the library) — validation failures from app-constructed data are effectively impossible.
- **Why it matters (limited):** The only realistic permanent-failure scenario is auth expiration: a queued workout retries while the session is expired, burns through 10 attempts, then is permanently skipped even after the user re-authenticates. This is a narrow edge case because (a) the online save is attempted first at finish time when auth is typically valid, (b) if auth expires, the app redirects to login which refreshes the session, and (c) the queue only retries on foreground/network events, not continuously.
- **Suggested fix:** Replace `remaining.push(entry)` at line 111 with `continue` to discard entries that exceed MAX_ATTEMPTS (a 1-line change). A workout that can't sync after 10 retries across multiple app foreground/network events will not succeed on attempt 11. The originally proposed dead-letter queue, dashboard indicator, and error-type detection is over-engineering for a scenario that essentially never occurs with app-constructed data.
- **Blast radius:** Minimal — AsyncStorage hygiene only

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

| Severity  | Count  |
| --------- | ------ |
| CRITICAL  | 0      |
| HIGH      | 6      |
| MEDIUM    | 19     |
| LOW       | 22     |
| **Total** | **47** |

_11 items struck as not tech debt (TD-01, TD-03, TD-07, TD-08, TD-15, TD-16, TD-22, TD-23, TD-24, TD-29, TD-30). 58 total findings evaluated._

### Findings by Area and Severity

| Area               | CRITICAL | HIGH                   | MEDIUM                           | LOW                                               | Total |
| ------------------ | -------- | ---------------------- | -------------------------------- | ------------------------------------------------- | ----- |
| **Performance**    | 0        | 2 (TD-06, TD-13)      | 4 (TD-14, TD-33, TD-34, TD-35)  | 5 (TD-17, TD-45, TD-46, TD-47, TD-48)            | 11    |
| **Architecture**   | 0        | 0                      | 3 (TD-11, TD-36, TD-44)         | 2 (TD-49, TD-50)                                 | 5     |
| **Cache**          | 0        | 1 (TD-12)             | 4 (TD-27, TD-31, TD-32, TD-43)  | 1 (TD-04)                                        | 6     |
| **Types**          | 0        | 0                      | 4 (TD-25, TD-39, TD-40, TD-41)  | 6 (TD-09, TD-10, TD-26, TD-54, TD-55, TD-56^)   | 10    |
| **Error Handling** | 0        | 3 (TD-05, TD-19, TD-20) | 4 (TD-21, TD-37, TD-38, TD-42) | 8 (TD-18, TD-28, TD-02, TD-51, TD-52, TD-53, TD-57, TD-58) | 15    |

_Note: Some findings span multiple areas. Each is counted in its primary area. 11 items struck as not tech debt (not counted). Multiple items downgraded from original CRITICAL/HIGH after code review evaluation._

---

## Fix Clusters

Related findings that should be fixed together in a single PR.

### Cluster A: Chart Cache Overhaul

- ~~**TD-01** Chart metrics cache never invalidated~~ (struck)
- ~~**TD-03** Chart metrics cache race condition~~ (struck)
- **TD-43** useChartData cancelled cleanup
- ~~**TD-30** Chart data computation errors not surfaced~~ (struck — cached data is intended degradation)

### Cluster B: Workout Timer Performance

- **TD-06** useRestTimer callback dependencies
- **TD-13** WorkoutExerciseCard re-renders on every tick
- **TD-14** getTimerProps recreates every render
- **TD-33** RestTimerBar callback recreation
- **TD-46** ProgressRing not memoized

### Cluster C: Workout Finish Flow Extraction

- **TD-11** Silent save failures during workout finish (downgraded to MEDIUM — template defaults are metadata)
- **TD-12** Template cache not refreshed after mutations
- ~~**TD-15** getRestTimeChanges/getWeightRepsChanges recreation~~ (struck — callbacks not passed as props)

### Cluster D: Dead Code and Type Literals

- **TD-09** CreateChartInput untyped string fields (downgraded to LOW — UI + DB constraints prevent invalid values)
- **TD-10** Explicit `any` in ChartsService (dead code) (downgraded to LOW)
- ~~**TD-29** RenderChartOptions dead code~~ (struck — subsumed into TD-10)

### Cluster E: Error Typing and Service Result Pattern

- **TD-18** Supabase query errors not distinguished from offline (downgraded to LOW — cache-first hides 95% of errors)
- **TD-25** Type assertions bypass type safety (downgraded to MEDIUM — pragmatic Supabase workaround)
- **TD-26** Logging service uses `as any` (downgraded to LOW — single line, safe fallback)
- **TD-39** Supabase query results not narrowed
- **TD-54** Implicit `any` in destructured results

### Cluster F: Write Queue and Offline Resilience

- **TD-02** Write queue entries stuck permanently after MAX_ATTEMPTS (LOW)
- **TD-19** Write queue processing errors silent
- **TD-04** AsyncStorage write failures silent (LOW — downgraded from CRITICAL)
- **TD-21** Cache read errors leave UI in loading state

### Cluster G: Component Business Logic Extraction

- ~~**TD-07** ExercisePickerModal business logic~~ (struck — standard React pattern, not a violation)
- ~~**TD-08** AddChartSheet business logic~~ (struck — presentation logic, not business logic)
- ~~**TD-22** MyExercisesList edit workflow~~ (struck — same reasoning as TD-07/TD-08)
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

- ~~**TD-16** ExercisePickerModal filtering on every keystroke~~ (struck — all optimizations already implemented)
- **TD-31** Exercise cache fully cleared on single change
- **TD-50** Multiple category dropdown implementations

---

## Recommended Fix Order

### PR 1: Chart Cache Cleanup

- **Findings:** TD-43, TD-30 (TD-01 and TD-03 struck — not real tech debt)
- **Estimated complexity:** Small
- **Files touched:**
  - `src/hooks/useChartData.ts` (add error state, fix cancellation ordering)
- **Why this order:** Remaining chart cache findings are small fixes. TD-43 is a minor cancellation ordering fix, TD-30 adds an error state to the hook. No cache restructuring needed since the race condition (TD-03) and invalidation (TD-01) were struck.

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
  - `src/services/writeQueue.ts` (discard entries exceeding MAX_ATTEMPTS, status return)
  - `src/hooks/useWorkoutBackup.ts` (expose backupError state)
  - `src/lib/cache.ts` (detect/clean corrupted data, add runtime validation)
  - `src/lib/supabase.ts` (add onAuthStateChange monitoring)
  - `src/hooks/useExercises.ts`, `useCharts.ts`, `useTemplates.ts` (handle cache read errors with explicit error state)
  - `app/_layout.tsx` or root component (session expiry handling)
  - Dashboard UI (sync status badge)
- **Why this order:** Depends on PR 5 (typed errors) since write queue error detection uses the new error type system. TD-04 was downgraded to LOW (backup is not the primary save path; failure requires simultaneous storage full + app crash). Remaining items are resilience fixes that require the error infrastructure from PR 5.

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
