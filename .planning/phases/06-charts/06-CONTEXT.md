# Phase 6: Charts - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create per-exercise progress charts that visualize their training history on the dashboard. Supports creating charts by selecting an exercise, metric type, and x-axis mode. Charts render as line charts with gradient fill below the templates section. Users can delete charts. Chart data is computed client-side from cached workout history.

Chart reordering, chart editing, date range filtering, and full-screen chart views are NOT in scope.

</domain>

<decisions>
## Implementation Decisions

### Chart Card Design
- Title shows "Exercise Name — Metric Type" (e.g., "Bench Press — Max Volume")
- Three-dot horizontal menu (kebab) on card header opens an action menu
- Action menu currently contains "Delete" only — designed to accommodate future options
- Delete triggers a confirmation modal before removal
- Tapping the card itself does nothing — chart is display-only on dashboard
- No additional summary info beyond the title (no latest value display)

### Add Chart Flow
- Presents as a **half-height bottom sheet** (not full modal like template editor)
- Step-by-step selection: tapping "Select Exercise" opens a sub-view with the exercise list, picking one returns to the form
- Exercise list is a **simple scrollable list** grouped by category — only exercises with logged workout data are shown
- If no exercises have logged data, show "No exercise data yet" with Cancel only
- Metric type selection uses **radio buttons**: Total Sets / Max Volume
- X-axis mode selection uses **radio buttons**: By Date / By Session
- Submit button: "Add Chart"

### Chart Rendering
- Line chart with smooth curves, accent blue line (`#4f9eff`), gradient fill below the line
- **No entry animation** — chart renders instantly with all data visible
- **X-axis labels only** — dates or session numbers shown below. No Y-axis value ticks
- **Tap data points to show tooltip** with exact value (e.g., "225 lbs" or "12 sets")
- **Horizontal scrolling** for large datasets (~10-15 points visible at a time), user scrolls to see more
- Data limits: 52 data points max for session mode, 365 days max for date mode
- Chart library: `react-native-gifted-charts` with `expo-linear-gradient` for gradient fills

### Dashboard Section
- Charts section appears **below templates section** on dashboard
- **Always visible** — even when user has no charts (shows empty state message)
- Section header: "Progress Charts" title + "Add Chart" button (matches templates section pattern)
- Empty state: "No charts configured yet. Add a chart to track your progress on an exercise."
- **Continuous scroll** — templates and charts in one scrollable page, no collapsible sections
- **Hard limit of 25 charts** — show "Maximum charts reached" message when limit hit (hide Add Chart button or disable it)

### Chart Data
- Computed client-side from cached workout history — no separate chart data cache
- Uses `getExerciseMetrics()` logic from web app (ported to work against local data)
- Includes unsynced workouts in computation (charts always reflect all local data)

### Chart Service (CRUD)
- Port `getUserCharts`, `createChart`, `deleteChart` as-is from web (swap Supabase client import)
- `reorderCharts` — port the function but no UI for reordering in this phase
- `renderChart`/`destroyChart` — discarded (Chart.js-specific, replaced by declarative `<LineChart>`)
- Add `getExercisesWithLoggedData()` service function (filters exercises to those with workout history)

### Claude's Discretion
- Kebab menu implementation (custom dropdown, RN Modal, or action sheet)
- Bottom sheet implementation for Add Chart (hand-rolled Animated.View or @gorhom/bottom-sheet)
- Exact chart height within the card
- Tooltip styling and positioning
- Gradient direction and opacity
- Grid lines visibility and style
- Data point marker size and style
- How x-axis labels handle overflow (rotate, skip every other, etc.)
- Cache strategy for chart data computation results
- Loading state while chart data computes

</decisions>

<specifics>
## Specific Ideas

- Kebab menu on chart cards is future-proofed — designed to hold additional chart actions in later phases (edit, duplicate, change metric, etc.)
- Half-height bottom sheet for Add Chart feels lighter and more appropriate than full modal for a simple 3-field form
- Step-by-step exercise selection (sub-view) rather than inline to keep the bottom sheet clean

</specifics>

<deferred>
## Deferred Ideas

- Chart reordering (drag-to-reorder) — future enhancement
- Chart editing (change metric/exercise/axis after creation) — future enhancement via kebab menu
- Full-screen chart view on tap — explicitly not in Phase 6
- Date range filtering on charts — future enhancement
- Chart entry animations — explicitly deferred (render instantly)

</deferred>

---

*Phase: 06-charts*
*Context gathered: 2026-02-15*
