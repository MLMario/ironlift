---
status: diagnosed
trigger: "Investigate why chart data doesn't refresh after finishing a workout — user must restart the app."
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:08:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: useChartData depends on chart.id but chart data comes from Supabase, not cache - useFocusEffect refreshes chart configs but not the underlying workout history data
test: Analyzed data flow from workout finish through dashboard refresh to chart rendering
expecting: Confirmed root cause - chart data is fetched from Supabase but depends only on chart.id, not on when workout history changes
next_action: Document root cause

## Symptoms

expected: After finishing a workout and returning to dashboard, charts should display the new workout data immediately
actual: Charts don't show new workout data until app is restarted
errors: None reported
reproduction: 1. Start a workout, 2. Log sets, 3. Finish workout, 4. Return to dashboard, 5. Observe charts don't update
started: Unknown (existing issue)

## Eliminated

- hypothesis: useFocusEffect not firing on dashboard return
  evidence: Lines 76-81 of app/index.tsx show useFocusEffect calls both refresh() and refreshCharts() on focus
  timestamp: 2026-02-15T00:05:00Z

- hypothesis: refreshCharts() not updating chart state
  evidence: useCharts hook properly fetches from Supabase and updates state (src/hooks/useCharts.ts lines 56-66)
  timestamp: 2026-02-15T00:05:00Z

- hypothesis: Chart configs themselves need updating
  evidence: The chart configs (UserChartData) are just metadata (exercise_id, metric_type, x_axis_mode) - they don't contain the actual workout data
  timestamp: 2026-02-15T00:05:00Z

## Evidence

- timestamp: 2026-02-15T00:01:00Z
  checked: app/index.tsx dashboard useFocusEffect implementation
  found: Lines 76-81 call both refresh() (templates) and refreshCharts() (chart configs) on focus
  implication: Dashboard correctly attempts to refresh on return from workout

- timestamp: 2026-02-15T00:02:00Z
  checked: src/components/ChartCard.tsx and src/hooks/useChartData.ts
  found: ChartCard receives chart config prop, useChartData hook fetches actual data via logging.getExerciseMetrics()
  implication: Chart data is fetched separately from chart configs

- timestamp: 2026-02-15T00:03:00Z
  checked: src/hooks/useChartData.ts useEffect dependency array (line 97)
  found: useEffect depends ONLY on chart.id - it only re-fetches when the chart ID changes
  implication: Even if chart config object is refreshed, if the ID is the same, data won't refetch

- timestamp: 2026-02-15T00:04:00Z
  checked: src/services/logging.ts getExerciseMetrics function (lines 482-542)
  found: Fetches directly from Supabase workout_log_exercises table, no caching layer
  implication: Data source is correct and should contain new workout immediately

- timestamp: 2026-02-15T00:05:00Z
  checked: Data flow from workout finish to chart display
  found:
    1. Workout finishes (app/workout.tsx line 372: router.back())
    2. Dashboard regains focus → useFocusEffect fires (app/index.tsx line 76)
    3. refreshCharts() is called → chart configs are refetched
    4. ChartSection receives new chartList prop
    5. ChartCard receives same chart object (same ID)
    6. useChartData useEffect does NOT fire because chart.id hasn't changed
    7. Old chart data persists in memory
  implication: useChartData needs a way to know when to refetch beyond just chart.id changes

- timestamp: 2026-02-15T00:06:00Z
  checked: React useEffect dependency array behavior with object references
  found: useEffect compares dependencies via Object.is() (referential equality for objects, value equality for primitives)
  implication: When refreshCharts() returns new chart objects, they are NEW object references, but useEffect only watches chart.id (a string that doesn't change)

- timestamp: 2026-02-15T00:07:00Z
  checked: Comparison with template refresh pattern
  found: Templates work because useTemplates hook is called at dashboard level, and refresh() updates the templates array state. Components consuming templates via props get re-rendered with new data.
  implication: Charts ALSO refresh configs correctly (via useCharts), but the problem is one level deeper - ChartCard renders with new config, but useChartData inside ChartCard doesn't know to refetch the data

## Resolution

root_cause: |
  The useChartData hook (src/hooks/useChartData.ts) only refetches chart data when chart.id changes (line 97: useEffect dependency array).

  Flow breakdown:
  1. User finishes workout → workout saved to Supabase → navigates back to dashboard
  2. Dashboard useFocusEffect fires → calls refreshCharts()
  3. refreshCharts() fetches chart configs from Supabase and updates state
  4. ChartSection receives new chartList array
  5. ChartCard receives "new" chart object (but with same ID as before)
  6. useChartData's useEffect does NOT fire because chart.id === previous chart.id
  7. Chart continues displaying old data from initial mount

  The problem: React sees chart.id hasn't changed, so it doesn't know the underlying workout history data (which the chart displays) has changed in the database.

  The chart config refresh is a red herring - it's fetching metadata (exercise_id, metric_type) that doesn't change. What needs to happen is the chart DATA (from logging.getExerciseMetrics) needs to refetch when:
  - Dashboard regains focus after workout completion
  - User adds a new workout that affects the charted exercise

  Current dependency (chart.id) is insufficient because:
  - chart.id never changes for existing charts
  - The chart object itself may be a new reference from refreshCharts(), but useEffect only checks chart.id
  - No mechanism exists to tell useChartData "the underlying workout data has changed, refetch"

fix: Not implemented (diagnosis-only mode)

suggested_fix_direction: |
  Option 1: Add a refresh trigger to useChartData
  - Add an optional `refreshKey` parameter to useChartData
  - Dashboard maintains a refreshKey state (timestamp or counter)
  - Pass refreshKey through ChartSection → ChartCard → useChartData
  - Include refreshKey in useEffect dependency array
  - When useFocusEffect fires, update refreshKey to trigger all chart data refetches

  Option 2: Expose a refresh function from useChartData
  - useChartData returns { data, isLoading, refresh: () => void }
  - ChartCard calls refresh() when it receives new chart prop
  - Use useEffect(() => { refresh(); }, [chart]) in ChartCard

  Option 3: Change useEffect dependency to entire chart object
  - Change line 97 of useChartData.ts from [chart.id] to [chart]
  - This would refetch whenever ANY property of chart changes
  - Relies on refreshCharts() returning new object references (which it does)
  - Most React-idiomatic, least invasive change

  Recommendation: Option 3 (change dependency to [chart])
  - Minimal code change (one line)
  - Leverages existing refreshCharts() behavior
  - No prop threading needed
  - Follows React best practices (depend on the whole object if you use multiple properties)

verification:
files_changed: []
