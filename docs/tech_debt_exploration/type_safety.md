# Type Safety & Interface Contracts Tech Debt Audit

## CRITICAL

### [CRITICAL] CreateChartInput uses untyped string fields instead of literal unions
- **Location:** `src/types/services.ts:740-747`
- **What:** `CreateChartInput` defines `metric_type` and `x_axis_mode` as plain `string` fields, not as literal unions. This means the type system cannot catch invalid values like `"invalid_metric"` or `"foo_mode"` at compile time. Callers must pass the correct strings with no type safety.
- **Why it matters:** Supabase RLS and database constraints will reject invalid values at runtime. Without type-level validation, bugs slip through to the backend, causing silent failures. Related to existing chart code that uses string literals like `'total_sets'` and `'date'`.
- **Suggested fix:** Change fields to literal unions:
  ```typescript
  export interface CreateChartInput {
    exercise_id: string;
    metric_type: 'total_sets' | 'max_volume_set';
    x_axis_mode: 'date' | 'session';
  }
  ```
  This matches existing `ExerciseMetricType` and `ExerciseHistoryMode` types already defined in `services.ts:541, 488`.
- **Blast radius:** `src/services/charts.ts:createChart()` callers and any chart creation UI code.

### [CRITICAL] Explicit `any` type in ChartsService interface
- **Location:** `src/types/services.ts:804, 812`
- **What:** `renderChart()` and `destroyChart()` methods use explicit `any` type for the Chart.js instance parameter. There's an eslint disable comment acknowledging the issue.
- **Why it matters:** The `any` type defeats type checking entirely for these methods. However, these methods are Chart.js-specific (not used in React Native) and should not be in the `ChartsService` interface. They belong to a discarded web-only implementation.
- **Suggested fix:** Remove `renderChart()` and `destroyChart()` from the `ChartsService` interface entirely (lines 796-812). These are Chart.js-specific and have no equivalent in the React Native implementation. The `getMetricDisplayName()` and `getModeDisplayName()` helpers should remain.
- **Blast radius:** The interface is implemented in `src/services/charts.ts`, but the two methods are never called in the iOS codebase (dead code).

## HIGH

### [HIGH] Type assertions bypass type safety in nested query results
- **Location:** `src/services/templates.ts:175, 245` and `src/services/charts.ts:67, 165, 168`
- **What:** Multiple files use `as unknown as TargetType` to cast Supabase nested query results. While sometimes necessary (Supabase's complex nested queries don't have perfect TypeScript support), these casts should be guarded by runtime validation or properly documented internal interfaces.
  - `templates.ts:175`: `(data as unknown as RawTemplate[])`
  - `charts.ts:67`: `(data as unknown as UserChartData[])`
  - `charts.ts:165, 168`: Fallback casts that bypass validation
- **Why it matters:** These casts assume Supabase returns the expected shape. If Supabase query changes (column removal, rename, null field), the cast hides the error until runtime.
- **Suggested fix:**
  1. Keep internal `RawTemplate` and `RawChart` interfaces (already done for templates).
  2. Add runtime validation after cast (optional but recommended).
  3. Document that casts are intentional workarounds for Supabase TS limitations.
- **Blast radius:** `src/services/templates.ts`, `src/services/charts.ts`, and any code consuming these services.

### [HIGH] RenderChartOptions uses untyped string fields (dead code)
- **Location:** `src/types/services.ts:752-757`
- **What:** `RenderChartOptions` defines `metricType` and `exerciseName` as plain `string` fields with no validation. This interface is dead code (Chart.js rendering is not used in React Native), but if retained, the fields should at least match `ExerciseMetricType`.
- **Why it matters:** Callers cannot be type-checked for valid metric types. This is a Chart.js-only interface and should be removed along with the two rendering methods.
- **Suggested fix:** Remove `RenderChartOptions` interface entirely (lines 752-757) as part of cleaning up dead Chart.js code.
- **Blast radius:** Only Chart.js-specific code (dead in iOS).

### [HIGH] Logging service uses `as any` for template_name field access
- **Location:** `src/services/logging.ts:275`
- **What:**
  ```typescript
  result.template_name = (data as any).templates?.name || null;
  ```
  This line uses `as any` to access a field that doesn't exist on the properly-cast type. The cast should instead use `as unknown as` with a proper interface that includes the joined `templates` field.
- **Why it matters:** The `any` type bypasses all type checking. If the Supabase query changes, this code will silently fail.
- **Suggested fix:** Define an internal interface for the raw query result (like `RawWorkoutLog`) that includes the nested `templates` field, then cast to that instead of using `any`.
- **Blast radius:** `src/services/logging.ts:getWorkoutLog()` and any code that uses the returned `WorkoutLogWithExercises` object.

## MEDIUM

### [MEDIUM] Loose typing in ExerciseHistoryMode and related union types
- **Location:** `src/types/services.ts:488, 541`
- **What:** `ExerciseHistoryMode` is defined as `'date' | 'session'` and `ExerciseMetricType` as `'total_sets' | 'max_volume_set'`. These literal unions are good, but they're also used as plain strings in `ExerciseMetricsOptions.metric?: ExerciseMetricType` (line 548) — optional, can be undefined. Function implementations compare against hardcoded strings instead of using type guards.
- **Why it matters:** The `?:` optional makes the default unclear. If not provided, what is the default metric type? Code must defend with `?? 'total_sets'`.
- **Suggested fix:** Make `metric` required with a default value in the interface documentation. Clarify contract and reduce runtime guards.
- **Blast radius:** `src/hooks/useChartData.ts`, `src/services/logging.ts:getExerciseMetrics()`.

### [MEDIUM] Supabase query results not narrowed after `.data` extraction
- **Location:** `src/services/exercises.ts:292, 436` and similar patterns throughout
- **What:** After `await supabase.from(...).select(...)`, the code extracts `.data` but doesn't narrow the type. For example:
  ```typescript
  const { data, error } = await supabase.from('exercises').select('*');
  const ex = item.exercises as unknown as Exercise;
  return { data: data as Exercise, error: null };
  ```
  This bypasses TypeScript's ability to track whether `data` is `Exercise | null` or definitely `Exercise[]`.
- **Why it matters:** If Supabase returns `null` (which it can), the cast hides this. The code should check `if (!data) return { data: null, error: ... }` before casting.
- **Suggested fix:** Consistently check `data` before casting:
  ```typescript
  if (error || !data) {
    return { data: null, error: error || new Error('No data') };
  }
  return { data: data as Exercise[], error: null };
  ```
- **Blast radius:** All service functions that query Supabase (`exercises.ts`, `templates.ts`, `logging.ts`, `charts.ts`).

### [MEDIUM] Cache layer returns loosely-typed generic result
- **Location:** `src/lib/cache.ts:168-177`
- **What:** `getCachedChartMetrics()` returns `ChartData | null`, but internally parses JSON without runtime validation. If AsyncStorage contains corrupted data, `JSON.parse()` could return an object that doesn't match `ChartData`.
- **Why it matters:** Runtime parsing errors are swallowed silently (try/catch returns `null`), which is safe but masks data corruption issues.
- **Suggested fix:** Add minimal runtime validation (check `Array.isArray(data.labels) && Array.isArray(data.values)`) before returning.
- **Blast radius:** `src/hooks/useChartData.ts` and any code using chart metrics cache.

### [MEDIUM] Optional fields in RecentExerciseData with unsafe defaults
- **Location:** `src/types/services.ts:570-579` and `src/services/logging.ts:620-625`
- **What:** `RecentExerciseData` has required fields (`sets`, `reps`, `weight`, `rest_seconds`), but the service implementation uses fallbacks (`firstSet?.reps || 10`). If `firstSet` is `undefined`, the code returns `10` without type safety. The type says "always present" but the code suggests "might be missing".
- **Why it matters:** The interface contract says these fields are never null/undefined, but the implementation treats them as potentially missing. Consumers relying on the type may encounter unexpected defaults.
- **Suggested fix:** Either make fields optional in the interface and handle `undefined` in consumers, or guarantee non-null values by throwing an error if data is missing.
- **Blast radius:** Any code consuming `getRecentExerciseData()` result (e.g., workout initialization screens).

## LOW

### [LOW] Implicit `any` in destructured Supabase query results
- **Location:** `src/services/logging.ts:213`
- **What:**
  ```typescript
  exercise_count: (log.workout_log_exercises as unknown as { count: number }[])?.[0]?.count || 0,
  ```
  The cast to `{ count: number }[]` is a workaround for Supabase's `.select(..., { count: 'exact' })` returning a confusing shape.
- **Why it matters:** The type is correct but the cast is noisy and suggests a missing abstraction.
- **Suggested fix:** Extract into a helper function with a clear name.
- **Blast radius:** Minimal; localized to `getWorkoutLogs()`.

### [LOW] ExerciseCategory cast in templates.ts
- **Location:** `src/services/templates.ts:99`
- **What:**
  ```typescript
  const category = (te.exercises?.category || 'Core') as ExerciseCategory;
  ```
  The cast assumes the fallback `'Core'` is a valid `ExerciseCategory`. While it is, this is fragile if the enum changes.
- **Why it matters:** If `ExerciseCategory` is modified to remove `'Core'`, this cast will break silently.
- **Suggested fix:** Use a type guard or validate the fallback against the valid categories list.
- **Blast radius:** `src/services/templates.ts:transformTemplate()`.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 3 |
| MEDIUM | 4 |
| LOW | 2 |
| **Total** | **11** |

**Recommendations (Priority Order):**
1. Remove dead Chart.js code (`renderChart`, `destroyChart`, `RenderChartOptions`)
2. Tighten `CreateChartInput` with literal unions
3. Fix Supabase query result narrowing with null checks before casting
4. Replace `as any` in logging.ts with proper internal interface
5. Add runtime validation to cache layer
