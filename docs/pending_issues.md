# Pending Issues: ChartCard Re-Rendering

Every navigation back to the dashboard triggers a full re-render cascade for all ChartCards, causing unnecessary Supabase queries and loading spinners.

## Re-Render Chain

```
Dashboard regains focus
→ useFocusEffect fires refreshCharts()
→ loadCharts sets new chartList array references
→ ChartSection re-renders with new chart objects
→ Each ChartCard re-renders (no React.memo)
→ useChartData sees new chart reference → useEffect fires
→ N Supabase queries (one per chart)
```

## Issues

### #1 — `useChartData` uses object reference as effect dependency
- **File:** `src/hooks/useChartData.ts:97`
- **Severity:** Critical
- **Detail:** The `useEffect` dependency is `[chart]`, a full object. React compares with `Object.is()` (reference equality). Since `loadCharts` always produces new objects, this effect re-runs every time — even when the chart config is identical.
- **Fix:** Change dependency to scalar values: `[chart.id, chart.exercise_id, chart.metric_type, chart.x_axis_mode]`

### #2 — `useFocusEffect` calls `refreshCharts()` unconditionally
- **File:** `app/index.tsx:76-81`
- **Severity:** High
- **Detail:** Every return to dashboard (workout finish, settings back, template dismiss) triggers `refreshCharts()` with no conditional check for whether data could have changed.
- **Fix:** Only refresh charts when returning from surfaces that modify data (e.g. workout completion), or use a stale flag.

### #3 — `loadCharts` always sets new array references
- **File:** `src/hooks/useCharts.ts:37-74`
- **Severity:** High
- **Detail:** `setChartList(cached)` and `setChartList(data)` both create new array/object references (from `JSON.parse()` and Supabase query). Even when data is identical, React sees new values. Up to 5 state updates per call.
- **Fix:** Compare incoming data with current state before calling `setChartList`, or use a deep equality check.

### #4 — `ChartCard` not wrapped in `React.memo`
- **File:** `src/components/ChartCard.tsx:85`
- **Severity:** Medium
- **Detail:** `ChartCard` is a plain function component. Any parent re-render causes it to re-render, regardless of whether props changed.
- **Fix:** Wrap with `React.memo` and a custom comparator checking `chart.id` and `onDelete` reference.

### #5 — No caching for chart metrics data
- **File:** `src/services/logging.ts:482-543`
- **Severity:** Medium
- **Detail:** `getExerciseMetrics()` hits Supabase directly every time. Only chart configs are cached in AsyncStorage — the actual data points (`{ labels, values }`) are never cached.
- **Fix:** Add chart metrics cache in `src/lib/cache.ts` with cache-first pattern in `useChartData`. (Plan exists in `.claude/plans/modular-finding-zephyr.md`)

### #6 — `handleDeleteChart` not wrapped in `useCallback`
- **File:** `app/index.tsx:136-139`
- **Severity:** Low
- **Detail:** `handleDeleteChart` is a regular function declaration inside the component body. It gets recreated on every render, so the `onDelete` prop passed to `ChartCard` is always a new reference.
- **Fix:** Wrap with `useCallback` and add `refreshCharts` as dependency.

### #7 — Inline style objects recreated every render in ChartCard
- **File:** `src/components/ChartCard.tsx:162-197`
- **Severity:** Low
- **Detail:** `pointerConfig`, `yAxisTextStyle`, and `xAxisLabelTextStyle` are inline objects created fresh on every render, potentially triggering internal re-renders in the `LineChart` component.
- **Fix:** Memoize with `useMemo` or extract to constants outside the component.

### #8 — `getStyles()` called without memoization
- **File:** `src/components/ChartCard.tsx:87`
- **Severity:** Low
- **Detail:** `getStyles(theme)` creates a new `StyleSheet.create()` result on every render. The theme is static (dark mode only, never changes).
- **Fix:** Memoize with `useMemo` keyed on theme reference, or hoist styles outside the component.

### #9 — `thinLabels()` recomputes every render
- **File:** `src/components/ChartCard.tsx:134`
- **Severity:** Low
- **Detail:** `thinLabels(data, chartWidth)` creates new data item objects on every render even when inputs haven't changed.
- **Fix:** Wrap with `useMemo` keyed on `[data, chartWidth]`.
