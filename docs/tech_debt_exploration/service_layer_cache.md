# Service Layer, Data Flow & Cache Coherence Tech Debt Audit

## CRITICAL

### [CRITICAL] Chart Metrics Cache Never Invalidated After Workout Completion
- **Location:** `src/hooks/useChartData.ts:79-140`, `src/services/logging.ts:482-543`, `app/workout.tsx:307-363`
- **What:** When a user completes a workout and the app calls `saveWeightRepsChanges()` to persist template set values, the chart metrics cache in AsyncStorage (key `ironlift:chart-metrics`) is never cleared. New chart data fetches from Supabase show updated metrics, but callers with cached data show stale values.
- **Why it matters:** Users see outdated progress charts after completing workouts until they manually refresh or the app is restarted. This breaks the offline-first guarantee that "cached data reflects all logged workouts including unsynced ones." High-impact for active users.
- **Suggested fix:** Call `clearChartMetricsCache()` at the end of `saveWeightRepsChanges()` in workout.tsx (line 363), or selectively clear metrics keys matching the modified exercises. Alternative: Add a TTL (5-10 minutes) to metric cache entries and auto-expire stale data.
- **Blast radius:** `useChartData` hook, `ChartCard` components, entire dashboard chart section. All charts showing progress metrics will display stale data.

### [CRITICAL] Template Cache Not Refreshed After Direct Mutations in Workout Screen
- **Location:** `app/workout.tsx:307-363` (saveRestTimeChanges, saveWeightRepsChanges functions)
- **What:** The workout screen calls `templatesService.updateTemplateExercise()` and `updateTemplateExerciseSetValues()` directly to save weight/reps/rest time changes. These mutations succeed on the Supabase database, but the cached template in AsyncStorage (key `ironlift:templates`) is never updated. The cached template retains old values, so the next workout pre-fills with stale defaults.
- **Why it matters:** User completes a workout with new weight values, updates are saved to database, but when they start the next workout, the template picker shows old weight values from cache. Creates confusion about whether changes were saved.
- **Suggested fix:** After `saveWeightRepsChanges()` succeeds (anySaved=true), the code already refreshes templates (lines 355-358). Ensure this refresh ALWAYS happens and covers both weight/reps and rest time changes. Consider moving to a `finally` block.
- **Blast radius:** Every subsequent workout using the same template shows stale default values. Affects UX on every workout after the first one in a template.

## HIGH

### [HIGH] Duplicate Supabase Query in createChart
- **Location:** `src/services/charts.ts:85-176`
- **What:** The `createChart()` function inserts a new chart (lines 120-132), then immediately re-fetches the same chart with an exercises join (lines 141-160). The insert's `.select()` doesn't include the join, requiring a second query to get the full `UserChartData` shape with exercise details.
- **Why it matters:** Unnecessary second network round-trip on every chart creation. Creates a race condition window: if an exercise is deleted between insert and re-fetch, the re-fetch could fail or return null exercise data, causing type cast errors.
- **Suggested fix:** Modify the insert query to include the full `.select(...)` with exercises join in a single query. If Supabase doesn't support joins on insert responses, fetch exercises separately after insert and construct the result object in JavaScript.
- **Blast radius:** Chart creation performance and potential flakiness. Every chart created via AddChartSheet modal will be slower.

### [HIGH] Missing Cache Invalidation for Chart Metrics When Exercises Modified
- **Location:** `src/lib/cache.ts:142-209`, `src/services/logging.ts`, `app/workout.tsx:332-363`
- **What:** When weight/reps are updated during a workout, the app updates the template but doesn't invalidate the chart metrics cache. The `chartMetricsCacheKey()` function creates keys like `{exerciseId}:{metricType}:{xAxisMode}`, but there's no mechanism to clear all metrics for an exerciseId when that exercise's history changes.
- **Why it matters:** Charts for modified exercises show stale metrics indefinitely (no TTL defined). User logs weight for Bench Press, but the Bench Press chart still shows old data.
- **Suggested fix:** Add `clearChartMetricsForExercise(exerciseId: string)` function that clears all cache keys matching that exercise. Call this after every workout completion. Alternatively, add a `cached_at` timestamp and check freshness on read.
- **Blast radius:** All charts for exercises with completed workouts show stale data until manual refresh or app restart.

### [HIGH] No Error Propagation from Silent-Save Operations During Workout Finish
- **Location:** `app/workout.tsx:307-363` (saveRestTimeChanges, saveWeightRepsChanges)
- **What:** Both functions wrap all service calls in try/catch with comment "Best-effort: skip silently on failure". If the network is down or RLS denies the update, the error is completely swallowed. The user never knows their weight/reps updates failed. The workout log itself is saved (or queued offline), but template defaults are not.
- **Why it matters:** Silent data loss. Users believe their weight changes were persisted when they weren't. Next workout uses stale template defaults without any warning.
- **Suggested fix:** Log errors to analytics/Sentry. Bubble a non-blocking warning to UI: "Workout saved, but some template updates failed. Check your connection." Retry with exponential backoff instead of silently dropping.
- **Blast radius:** User data loss (failed mutations). Affects every workout finish that includes weight/reps/rest time changes.

### [HIGH] Race Condition in Chart Metrics Cache with Concurrent Requests
- **Location:** `src/hooks/useChartData.ts:79-140`, `src/lib/cache.ts:186-198`
- **What:** Two simultaneous `useChartData` calls for the same chart config (e.g., dashboard re-mounting) both fetch from Supabase and both call `setCachedChartMetrics()`. The second write overwrites the first, but the first component may have already rendered with newer data. Cache and component state become inconsistent.
- **Why it matters:** Rapid navigation or component remounting causes jank, stale data briefly displayed, or flash of old data then new data.
- **Suggested fix:** Add request deduplication keyed by cache key. Or use a single shared promise per cache key that multiple requests await. Track in-flight requests and only re-fetch if not already pending.
- **Blast radius:** Charts with multiple instances or rapid focus/blur cycles (e.g., fast back/forward navigation).

## MEDIUM

### [MEDIUM] Exercise Cache Fully Cleared on Single Exercise Change
- **Location:** `src/lib/cache.ts:46-52`, `src/hooks/useExercises.ts`
- **What:** The `clearExerciseCache()` function removes the entire exercise cache key. When a single user-created exercise is updated or deleted, the entire ~200-exercise system + user exercises cache is cleared, forcing a full reload instead of a targeted update.
- **Why it matters:** Inefficient invalidation. Loading 200+ exercises from network takes significant time, especially on slower connections. Creates unnecessary network churn.
- **Suggested fix:** Implement `updateCachedExercise(id, updates)` and `removeCachedExercise(id)` that patch the cache in-place. Or use a granular cache strategy (e.g., separate keys for system vs user exercises).
- **Blast radius:** Exercise picker performance after user exercise create/update/delete operations in settings.

### [MEDIUM] Service Functions Silently Swallow Errors, Never Throw
- **Location:** All `src/services/*.ts` files
- **What:** Every service function catches all errors and returns `{ data: null, error: err }` instead of throwing. Callers must remember to check the error field. Many places in the codebase don't (e.g., `saveRestTimeChanges`, `saveWeightRepsChanges`, template update in workout.tsx:411-419).
- **Why it matters:** Easy to forget error checks. TypeScript doesn't enforce checking the error field like it would with exceptions. Silent failures proliferate.
- **Suggested fix:** Adopt a discriminated union result type where callers must exhaustively match both data and error cases. Or use exceptions for genuinely exceptional failures and reserve result types for validation/expected errors.
- **Blast radius:** All service consumers throughout the app. Increases likelihood of unhandled failures cascading.

### [MEDIUM] Missing Idempotency on Template Cache Writes
- **Location:** `src/services/templates.ts`, `app/template-editor.tsx:233-280`
- **What:** When a template is created/updated, the cache is eventually updated (via dashboard refresh), but there's no transactional guarantee. If mutation succeeds on server but AsyncStorage.setItem fails, next template load fetches fresh and overwrites the editor's state. Rapid saves could result in partial updates or lost edits.
- **Why it matters:** Rare but possible data loss if AsyncStorage is full or encounters an I/O error.
- **Suggested fix:** Ensure cache write happens synchronously after template mutation. Add verification step: after mutation, re-fetch template and verify cache matches server.
- **Blast radius:** Template editing and creation flow. Loss of user's template edits.

### [MEDIUM] Chart Metrics Cache Lacks TTL or Staleness Detection
- **Location:** `src/lib/cache.ts:168-177`, `src/hooks/useChartData.ts:98-130`
- **What:** Chart metrics cached in AsyncStorage have no expiration marker or TTL. Once cached, they persist indefinitely unless explicitly cleared. No staleness detection means old metrics are served forever.
- **Why it matters:** Charts display day-old or week-old metrics on the offline-first path.
- **Suggested fix:** Add a `cached_at: ISO timestamp` field to each metric cache entry. On read, check if `Date.now() - cached_at > 5 * 60 * 1000`. If stale, re-fetch from network even if cache hit.
- **Blast radius:** Chart accuracy on long offline sessions or workouts.

## LOW

### [LOW] Duplicate Metric Calculation Logic
- **Location:** `src/services/logging.ts:42-65` (calculateMetrics helper), `app/workout.tsx:681-702` (inline aggregation in pagination)
- **What:** The `calculateMetrics()` function computes totalSets, maxWeight, maxVolumeSet. The same logic for computing completed_sets and total_volume is duplicated inline in `getWorkoutLogsPaginated()`.
- **Why it matters:** Code duplication. If calculation changes, two places must update. Risk of divergence.
- **Suggested fix:** Export calculateMetrics or create a shared aggregation utility. Reuse in both places.
- **Blast radius:** Metrics calculation consistency and maintenance burden.

### [LOW] No Deduplication in getExercisesWithLoggedData Query
- **Location:** `src/services/exercises.ts:245-314`
- **What:** Queries `workout_log_exercises` with exercises join. An exercise can appear in multiple workouts, so result set has duplicate exercise rows. Deduplication happens in JavaScript (Map at lines 290-296), which is correct but inefficient if user has 1000+ logged workouts.
- **Why it matters:** Performance. Supabase query result could be 100+ rows for only 10 unique exercises.
- **Suggested fix:** Use `DISTINCT ON(exercise_id)` in Supabase query or request only unique exercise_ids, then fetch exercise details separately.
- **Blast radius:** Settings "My Exercises" list load time for active users with many logged workouts.

### [LOW] updateTemplateExerciseSetValues Not Properly Exported
- **Location:** `src/services/templates.ts`, imported in `app/workout.tsx:45`
- **What:** The function `updateTemplateExerciseSetValues` exists in templates.ts and is imported directly in workout.tsx, but it's not included in the `templates` service export object or clearly documented as public.
- **Why it matters:** Fragile import path. Future refactoring could break the import without warning.
- **Suggested fix:** Ensure all public functions are exported via named export or included in the service object.
- **Blast radius:** Workout screen compilation if function is refactored or moved.

---

## Summary

Total findings: 13 (2 Critical, 4 High, 4 Medium, 3 Low)

The codebase has good fundamentals in cache-first patterns, offline support, and clean separation. However, **critical gaps in cache invalidation** cause stale data to persist after mutations. The two CRITICAL issues directly impact user data confidence.

**Priority for fix:**
1. CRITICAL #1 & #2 — User-facing data trust
2. HIGH #1, #2, #3 — Data mutation correctness
3. HIGH #4 — Concurrent request consistency
4. MEDIUM #1-4 — Efficiency and reliability
