# Phase 6: Charts - Research

**Researched:** 2026-02-15
**Domain:** Chart rendering, data visualization, CRUD service porting, dashboard UI extension
**Confidence:** HIGH

## Summary

Phase 6 adds per-exercise progress charts to the dashboard. The core work divides into four areas: (1) porting the chart CRUD service from the web app, (2) building the chart rendering component using `react-native-gifted-charts`, (3) creating the Add Chart bottom sheet flow, and (4) extending the dashboard to include a charts section below templates.

The charting library (`react-native-gifted-charts`) provides a declarative `<LineChart>` component that maps closely to the Chart.js configuration already in the web app. Key props -- `areaChart`, `curved`, `pointerConfig`, horizontal scrolling, and gradient fill -- cover all the requirements. The library needs `expo-linear-gradient` and `react-native-svg` (already installed) as peer dependencies. Neither `react-native-gifted-charts` nor `expo-linear-gradient` are currently installed; both need to be added.

The `getExerciseMetrics()` function already exists in the iOS logging service (ported from web) and returns `{ labels: string[], values: number[] }` -- exactly the format needed for chart data. The `getExercisesWithLoggedData()` function also already exists in the exercises service. The chart CRUD service (`getUserCharts`, `createChart`, `deleteChart`, `reorderCharts`) needs to be ported from web -- a straightforward copy-and-adapt following the same pattern used for exercises and templates services.

**Primary recommendation:** Install `react-native-gifted-charts` and `expo-linear-gradient`, port the chart CRUD service, build a reusable `ChartCard` component wrapping `<LineChart>`, create the Add Chart bottom sheet, and extend the dashboard `index.tsx` to render charts below templates in a single `ScrollView`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Chart card title: "Exercise Name -- Metric Type" (e.g., "Bench Press -- Max Volume")
- Three-dot kebab menu on card header for action menu (Delete only, future-proofed)
- Delete triggers confirmation modal before removal
- Tapping chart card does nothing (display-only)
- Add Chart flow: half-height bottom sheet, step-by-step exercise selection via sub-view
- Exercise list: simple scrollable list grouped by category, only exercises with logged data
- Empty exercise data state: "No exercise data yet" with Cancel only
- Metric type: radio buttons for Total Sets / Max Volume
- X-axis mode: radio buttons for By Date / By Session
- Submit button: "Add Chart"
- Line chart with smooth curves, accent blue line (#4f9eff), gradient fill below
- No entry animation -- renders instantly
- X-axis labels only, no Y-axis value ticks
- Tap data points for tooltip with exact value
- Horizontal scrolling for large datasets (~10-15 visible points)
- Data limits: 52 max session mode, 365 max date mode
- Chart library: react-native-gifted-charts with expo-linear-gradient
- Charts section below templates on dashboard, always visible
- Section header: "Progress Charts" + "Add Chart" button
- Empty state: "No charts configured yet. Add a chart to track your progress on an exercise."
- Continuous scroll (templates + charts in one scrollable page)
- Hard limit of 25 charts
- Chart data computed client-side from cached workout history, no separate cache
- Includes unsynced workouts in computation
- Port getUserCharts, createChart, deleteChart as-is from web
- Port reorderCharts function but no UI for reordering
- Discard renderChart/destroyChart (Chart.js-specific)
- Add getExercisesWithLoggedData() -- already exists in exercises service

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

### Deferred Ideas (OUT OF SCOPE)
- Chart reordering (drag-to-reorder) -- future enhancement
- Chart editing (change metric/exercise/axis after creation) -- future enhancement via kebab menu
- Full-screen chart view on tap -- explicitly not in Phase 6
- Date range filtering on charts -- future enhancement
- Chart entry animations -- explicitly deferred (render instantly)
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-gifted-charts` | latest (1.4.x+) | Line chart rendering with gradient, scrolling, tooltips | Approved in constitution, Expo Go compatible, declarative API |
| `expo-linear-gradient` | SDK 54 compatible | Gradient fills for area charts | Approved in constitution, required by gifted-charts for gradient |
| `react-native-svg` | 15.12.1 (installed) | SVG rendering dependency for charts | Already installed, peer dependency of gifted-charts |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-reanimated` | ~4.1.1 | Animation primitives | Already installed, used by gifted-charts internally |
| `react-native-gesture-handler` | ~2.28.0 | Gesture support | Already installed, chart scrolling |
| `@react-native-async-storage/async-storage` | 2.2.0 | Cache for chart configs | Already installed, cache layer |

### Not Needed
| Instead of | Could Use | Why Not Needed |
|------------|-----------|----------------|
| `@gorhom/bottom-sheet` | Hand-rolled Animated.View | The Add Chart sheet is a simple half-height form -- hand-rolling with RN Modal or Animated.View is simpler than adding a dependency with known SDK 54 edge cases. Reserve @gorhom for Phase 7 settings where it is already committed. |
| Chart data cache | Separate AsyncStorage key | Constitution says "no separate chart data cache" -- compute from cached workout history every time |

**Installation:**
```bash
npx expo install react-native-gifted-charts expo-linear-gradient
```

## Architecture Patterns

### Recommended Project Structure (New Files)
```
src/
  services/
    charts.ts              # Chart CRUD (port from web: getUserCharts, createChart, deleteChart, reorderCharts, display helpers)
  hooks/
    useCharts.ts           # Cache-first loading of user chart configs (same pattern as useTemplates)
    useChartData.ts        # Compute chart data from cached workout history per chart config
  components/
    ChartCard.tsx           # Single chart card: title, kebab menu, LineChart rendering
    ChartSection.tsx        # Charts section: header + "Add Chart" button + chart list + empty state
    AddChartSheet.tsx       # Half-height bottom sheet for creating charts (exercise selection, metric, axis)
    KebabMenu.tsx           # Reusable three-dot menu with dropdown (custom, not @gorhom)
```

### Pattern 1: Chart CRUD Service (Copy-and-Adapt from Web)
**What:** Port `getUserCharts`, `createChart`, `deleteChart`, `reorderCharts` from web app's `charts.ts`. Discard `renderChart`/`destroyChart` (Chart.js-specific). Keep `getMetricDisplayName`/`getModeDisplayName` helpers.
**When to use:** All chart data operations.
**Example:**
```typescript
// Source: web app charts.ts, adapted for iOS
import { supabase } from '@/lib/supabase';
import type { ServiceResult, ServiceError, UserChartData, CreateChartInput } from '@/types/services';

async function getUserCharts(): Promise<ServiceResult<UserChartData[]>> {
  // Same Supabase query as web -- select from user_charts with exercises join
  // Only change: import path for supabase client
}

async function createChart(chartData: CreateChartInput): Promise<ServiceResult<UserChartData>> {
  // Same logic: get user, find max order, insert with nextOrder
}

async function deleteChart(id: string): Promise<ServiceError> {
  // Same logic: delete from user_charts by id
}

async function reorderCharts(chartIds: string[]): Promise<ServiceError> {
  // Same logic: Promise.all updates for order field
  // No UI for this in Phase 6, but function is ready
}

export const charts = {
  getUserCharts,
  createChart,
  deleteChart,
  reorderCharts,
  getMetricDisplayName,
  getModeDisplayName,
};
```

### Pattern 2: Chart Data Computation (Reuse Existing getExerciseMetrics)
**What:** The `logging.getExerciseMetrics()` function already exists in `src/services/logging.ts` and returns `{ labels: string[], values: number[] }`. This is the exact format needed for `react-native-gifted-charts` data items.
**When to use:** Computing chart data for rendering.
**Example:**
```typescript
// In useChartData hook or ChartCard component:
import { logging } from '@/services/logging';

const { data: chartData } = await logging.getExerciseMetrics(
  chart.exercise_id,
  {
    metric: chart.metric_type,           // 'total_sets' | 'max_volume_set'
    mode: chart.x_axis_mode,             // 'date' | 'session'
    limit: chart.x_axis_mode === 'session' ? 52 : 365,
  }
);

// Transform to gifted-charts lineDataItem format:
const data = chartData.values.map((value, index) => ({
  value,
  label: chartData.labels[index],
}));
```

### Pattern 3: LineChart Configuration (Mapping Chart.js to Gifted Charts)
**What:** Translate the web app's Chart.js config to `react-native-gifted-charts` `<LineChart>` props.
**When to use:** ChartCard component rendering.
**Example:**
```typescript
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient, Stop } from 'expo-linear-gradient';

// Chart.js: tension: 0.4          -> curved + curvature: 0.4
// Chart.js: fill: true            -> areaChart: true
// Chart.js: borderColor: '#4f9eff' -> color: '#4f9eff'
// Chart.js: pointRadius: 4        -> dataPointsRadius: 4
// Chart.js: responsive            -> width from parent layout
// Chart.js: tooltip                -> pointerConfig with pointerLabelComponent

<LineChart
  data={chartLineData}
  areaChart
  curved
  curvature={0.4}
  color="#4f9eff"
  startFillColor="rgba(79, 158, 255, 0.3)"
  endFillColor="rgba(79, 158, 255, 0.01)"
  startOpacity={0.3}
  endOpacity={0.01}
  dataPointsColor="#4f9eff"
  dataPointsRadius={4}
  height={180}
  spacing={40}
  initialSpacing={20}
  endSpacing={20}
  hideYAxisText
  xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
  xAxisColor={theme.colors.border}
  yAxisColor="transparent"
  hideRules
  isAnimated={false}
  pointerConfig={{
    pointerColor: '#4f9eff',
    radius: 6,
    pointerLabelComponent: (items) => (
      <View style={tooltipStyle}>
        <Text>{formatTooltip(items[0].value, metricType)}</Text>
      </View>
    ),
    activatePointersOnLongPress: false,
    persistPointer: true,
    showPointerStrip: true,
    pointerStripColor: theme.colors.border,
  }}
  scrollToEnd
  nestedScrollEnabled
/>
```

### Pattern 4: Dashboard Conversion from FlatList to ScrollView
**What:** The dashboard currently uses `TemplateGrid` with a `FlatList`. Adding charts below templates requires converting to a `ScrollView` containing both sections, since nesting FlatLists vertically is problematic in React Native.
**When to use:** Dashboard `index.tsx` modification.
**Approach:**
```typescript
// Option A: Convert dashboard to ScrollView with both sections
<ScrollView>
  <TemplateSection templates={templates} ... />
  <ChartSection charts={charts} ... />
</ScrollView>

// Option B: Single FlatList with section data using mixed item types
// More complex but better performance for large lists

// Recommendation: Option A (ScrollView) because:
// - Template count is small (typically < 10)
// - Chart count is capped at 25
// - Total items never exceed ~35, well within ScrollView performance
// - Simpler code than mixed-type FlatList
```

### Pattern 5: Add Chart Bottom Sheet (Hand-Rolled Modal)
**What:** Half-height bottom sheet for the Add Chart flow. Use RN Modal with slide animation and a fixed-height content area rather than @gorhom/bottom-sheet.
**When to use:** When user taps "Add Chart".
**Rationale:** The Add Chart form is simple (3 fields), doesn't need snap points or gesture dismissal. A styled RN Modal with `animationType="slide"` and `presentationStyle="overFullScreen"` achieves the visual effect with zero dependencies. @gorhom/bottom-sheet has known SDK 54 edge cases (issues #2528, #2507) and is reserved for Phase 7 settings menu where it's already committed.
**Example:**
```typescript
<Modal
  visible={visible}
  transparent
  animationType="slide"
  onRequestClose={onClose}
>
  <Pressable style={styles.overlay} onPress={onClose}>
    <Pressable style={styles.sheet} onPress={() => {}}>
      {/* Half-height content */}
      {/* Exercise selector, metric radio, axis radio, Add Chart button */}
    </Pressable>
  </Pressable>
</Modal>
```

### Pattern 6: Kebab Menu (Custom Dropdown)
**What:** Three-dot horizontal menu that opens a small dropdown with "Delete" option.
**When to use:** Chart card header action menu.
**Recommendation:** Hand-rolled dropdown using RN Modal with transparent background. Position the dropdown near the kebab button using `onLayout` measurement. This matches the existing dropdown pattern used in ExercisePickerModal's category selector.
**Example:**
```typescript
// Simple approach: Modal with absolute positioning
<Pressable onPress={() => setMenuVisible(true)} hitSlop={8}>
  <Ionicons name="ellipsis-horizontal" size={20} />
</Pressable>

<Modal visible={menuVisible} transparent animationType="fade">
  <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
    <View style={[styles.dropdown, { top: menuY, right: menuX }]}>
      <Pressable onPress={handleDelete}>
        <Text>Delete</Text>
      </Pressable>
    </View>
  </Pressable>
</Modal>
```

### Anti-Patterns to Avoid
- **Nested FlatLists vertically:** Never nest a FlatList inside a ScrollView or another FlatList vertically. Use ScrollView with .map() for the smaller list, or use a single FlatList with section headers.
- **Imperative chart rendering:** Do not port `renderChart`/`destroyChart` from web. Charts are declarative `<LineChart>` components.
- **Separate chart data cache:** Constitution explicitly forbids a separate chart data cache. Compute from cached workout history every render (or memoize in component state).
- **Chart animations:** Explicitly deferred. Set `isAnimated={false}` -- do NOT add `animateOnDataChange` or entry animations.
- **Full-screen chart tap:** Explicitly out of scope. `onPress` on the chart card body should do nothing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line chart rendering | Custom SVG path calculation | `react-native-gifted-charts` `<LineChart>` | Handles curved paths, scrolling, data point detection, tooltips, gradient area fill |
| Gradient area fill | Custom LinearGradient with SVG path clipping | `areaChart` + `startFillColor`/`endFillColor` props | Built into gifted-charts, uses expo-linear-gradient internally |
| Chart tooltip on data point tap | Custom gesture detection + overlay positioning | `pointerConfig` prop with `pointerLabelComponent` | Library handles pointer tracking, strip rendering, label positioning |
| Horizontal scroll for large datasets | Custom ScrollView with chart rerendering | Built-in scroll in LineChart (default behavior with `spacing`) | Library renders full chart in internal ScrollView automatically when data exceeds width |
| Chart data computation | Custom aggregation from raw workout sets | `logging.getExerciseMetrics()` | Already ported from web, returns `{ labels, values }` format ready for chart |
| Exercise filtering for chart creation | Custom query for exercises with workout data | `exercises.getExercisesWithLoggedData()` | Already exists in exercises service with deduplication and category sorting |

**Key insight:** The chart rendering layer is entirely handled by `react-native-gifted-charts`. The only custom code needed is: (1) chart CRUD service, (2) data transformation from `{ labels, values }` to `lineDataItem[]`, (3) UI components for the card wrapper and Add Chart flow.

## Common Pitfalls

### Pitfall 1: Nested Scrolling Conflicts
**What goes wrong:** Charts with horizontal scrolling inside a vertically scrolling dashboard cause gesture conflicts -- the user tries to scroll the chart horizontally but the dashboard scrolls vertically, or vice versa.
**Why it happens:** React Native's gesture system resolves simultaneous scroll gestures unpredictably.
**How to avoid:** Set `nestedScrollEnabled={true}` on the `<LineChart>` component. This tells the chart's internal ScrollView to work within a parent ScrollView. Test thoroughly on device.
**Warning signs:** Chart doesn't scroll horizontally, or dashboard doesn't scroll vertically when finger is on a chart.

### Pitfall 2: Chart Re-renders on Dashboard Scroll
**What goes wrong:** Every chart re-computes data and re-renders when the dashboard scrolls, causing jank.
**Why it happens:** Chart data computation (`getExerciseMetrics`) is async and triggers state updates. If called on every render, it creates a cascade.
**How to avoid:** Compute chart data once on mount/focus and memoize results. Use `useMemo` or `useState` with a dependency on the chart config, not on every render cycle. Consider a `useChartData` hook that caches computed results in component state.
**Warning signs:** Dashboard scrolling is janky, or charts flicker/reload while scrolling.

### Pitfall 3: X-Axis Label Overflow
**What goes wrong:** Date labels (e.g., "2026-01-15") are too wide at 40px spacing, overlapping or getting cut off.
**Why it happens:** Default spacing may not accommodate long label text.
**How to avoid:** Abbreviate date labels (e.g., "1/15" or "Jan 15" instead of "2026-01-15"). For session mode, labels are "1", "2", "3"... which are short. For date mode, format as "M/D" to keep labels compact. Skip every other label if density is still too high using the `hideDataPoints` approach (only show label on every Nth item).
**Warning signs:** Labels overlap visually, or labels are cut off at edges.

### Pitfall 4: Empty Chart State
**What goes wrong:** Chart component renders with empty or single-point data, showing a blank area or a dot with no line.
**Why it happens:** User creates chart for exercise with very little data (0 or 1 data point).
**How to avoid:** Check data length before rendering `<LineChart>`. Show a message like "Not enough data to display chart" for 0-1 data points. Minimum 2 data points for a meaningful line.
**Warning signs:** Blank chart card, single dot with no line, or chart library error with empty data array.

### Pitfall 5: Bottom Sheet Dismissal and Exercise Selection Sub-View
**What goes wrong:** The Add Chart bottom sheet exercise selection sub-view doesn't return properly, or the sheet state becomes inconsistent.
**Why it happens:** Managing a multi-step flow within a modal (step 1: form, step 2: exercise picker, back to step 1) requires careful state management.
**How to avoid:** Use a simple state machine: `step: 'form' | 'selectExercise'`. When in 'selectExercise', render the exercise list. When user picks one, set the selected exercise and switch back to 'form'. Cancel from exercise list returns to 'form' (not closes the sheet).
**Warning signs:** Sheet closes unexpectedly, or selected exercise doesn't appear in the form after returning.

### Pitfall 6: Chart Card Height Inconsistency
**What goes wrong:** Charts with different data densities render at different heights, making the card list look uneven.
**Why it happens:** Chart height defaults to 200 and may vary if not explicitly set.
**How to avoid:** Always set explicit `height` prop on `<LineChart>` (e.g., `180`). The chart card should have a fixed height regardless of data content.
**Warning signs:** Cards are different heights, or chart overflows its card container.

### Pitfall 7: Reanimated Version Compatibility
**What goes wrong:** `@gorhom/bottom-sheet` or `react-native-gifted-charts` crash or don't render with current `react-native-reanimated ~4.1.1`.
**Why it happens:** Known issue: `@gorhom/bottom-sheet` requires reanimated v4.1.4+ for RN 0.81 compatibility (GitHub issue #2507). The `~4.1.1` semver range should resolve to 4.1.4+ but depends on what's published.
**How to avoid:** After installing, verify `react-native-reanimated` resolves to >= 4.1.4 in the lockfile. For Phase 6, we are NOT using `@gorhom/bottom-sheet` (hand-rolling the Add Chart sheet), so this is not a direct risk. But worth noting for Phase 7.
**Warning signs:** Render errors mentioning "ReactComponent" or "level" undefined.

## Code Examples

### Chart Data Transformation
```typescript
// Source: Verified against react-native-gifted-charts lineDataItem type
import type { ChartData } from '@/types/services';
import type { UserChartData } from '@/types/services';

interface LineDataItem {
  value: number;
  label?: string;
  dataPointText?: string;
  dataPointColor?: string;
}

function transformToLineData(chartData: ChartData, xAxisMode: 'date' | 'session'): LineDataItem[] {
  return chartData.values.map((value, index) => ({
    value,
    label: xAxisMode === 'date'
      ? formatDateLabel(chartData.labels[index])  // "2026-01-15" -> "1/15"
      : String(index + 1),                         // "Session 1" -> "1"
  }));
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
```

### Chart Card Component Structure
```typescript
// Source: Derived from existing TemplateCard pattern + gifted-charts API
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme, type Theme } from '@/theme';

interface ChartCardProps {
  chart: UserChartData;
  chartData: LineDataItem[];
  onDelete: (chartId: string) => void;
}

export function ChartCard({ chart, chartData, onDelete }: ChartCardProps) {
  const theme = useTheme();
  const metricLabel = chart.metric_type === 'total_sets' ? 'Total Sets' : 'Max Volume';
  const title = `${chart.exercises.name} \u2014 ${metricLabel}`;

  // Guard: need at least 2 points for a line
  const hasEnoughData = chartData.length >= 2;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <KebabMenu onDelete={() => onDelete(chart.id)} />
      </View>
      {hasEnoughData ? (
        <LineChart
          data={chartData}
          areaChart
          curved
          curvature={0.4}
          color="#4f9eff"
          startFillColor="rgba(79, 158, 255, 0.3)"
          endFillColor="rgba(79, 158, 255, 0.01)"
          startOpacity={0.3}
          endOpacity={0.01}
          height={180}
          spacing={40}
          initialSpacing={20}
          endSpacing={20}
          dataPointsColor="#4f9eff"
          dataPointsRadius={4}
          hideYAxisText
          xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
          xAxisColor={theme.colors.border}
          yAxisColor="transparent"
          hideRules
          isAnimated={false}
          nestedScrollEnabled
          pointerConfig={{
            pointerColor: '#4f9eff',
            radius: 6,
            activatePointersOnLongPress: false,
            showPointerStrip: true,
            pointerStripColor: theme.colors.border,
            pointerLabelComponent: (items) => { /* tooltip */ },
          }}
        />
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>Not enough data to display chart</Text>
        </View>
      )}
    </View>
  );
}
```

### useCharts Hook (Cache-First Pattern)
```typescript
// Source: Same pattern as existing useTemplates hook
import { useState, useEffect, useCallback } from 'react';
import type { UserChartData } from '@/types/services';
import { charts } from '@/services/charts';
import { getCachedCharts, setCachedCharts } from '@/lib/cache';

export function useCharts() {
  const [chartList, setChartList] = useState<UserChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let hasCachedData = false;

    try {
      const cached = await getCachedCharts();
      if (cached) {
        setChartList(cached);
        setIsLoading(false);
        hasCachedData = true;
      }
    } catch { /* silent */ }

    try {
      const { data, error: fetchError } = await charts.getUserCharts();
      if (data) {
        setChartList(data);
        await setCachedCharts(data);
      } else if (fetchError && !hasCachedData) {
        setError('Failed to load charts.');
      }
    } catch {
      if (!hasCachedData) setError('Failed to load charts.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { loadCharts(); }, [loadCharts]);

  return { charts: chartList, isLoading, error, refresh: loadCharts };
}
```

### Radio Button Pattern (Add Chart Form)
```typescript
// Source: Hand-rolled per constitution (no component libraries)
interface RadioOption {
  label: string;
  value: string;
}

function RadioGroup({ options, selected, onSelect }: {
  options: RadioOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
        >
          <View style={{
            width: 20, height: 20, borderRadius: 10,
            borderWidth: 2,
            borderColor: selected === opt.value ? theme.colors.accent : theme.colors.textMuted,
            justifyContent: 'center', alignItems: 'center',
          }}>
            {selected === opt.value && (
              <View style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: theme.colors.accent,
              }} />
            )}
          </View>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.sizes.base }}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```

## State of the Art

| Old Approach (Web) | Current Approach (iOS) | When Changed | Impact |
|---------------------|------------------------|--------------|--------|
| Chart.js imperative rendering (`renderChart`/`destroyChart`) | Declarative `<LineChart>` component | Port to iOS (Phase 6) | No imperative lifecycle management needed; chart re-renders on prop changes |
| Canvas-based gradient fill | SVG-based area fill with `areaChart` prop | Library architecture difference | Same visual result, different underlying technology |
| Chart.js tooltip callbacks | `pointerConfig.pointerLabelComponent` | Library architecture difference | Custom React component instead of callback object |
| `document.getElementById(canvasId)` | Direct JSX `<LineChart data={...}>` | Platform difference | No DOM queries; data passed as props |
| CSS `responsive: true` with canvas resize | Explicit `height` + parent layout width | Platform difference | Must set explicit height; width derives from parent |

**Deprecated/outdated in this port:**
- `renderChart()` / `destroyChart()` functions -- Chart.js-specific, replaced by declarative components
- `getChartModule()` lazy loader -- Chart.js dynamic import, not needed
- `chartModuleCache` -- no lazy loading needed with React components
- Chart.js `register()` calls -- gifted-charts handles its own setup

## Discretion Recommendations

### Kebab Menu: Custom Modal Dropdown
**Recommendation:** Hand-rolled dropdown using RN `Modal` with `transparent` + `fade` animation, positioned near the kebab button. This matches the existing category dropdown pattern in `ExercisePickerModal`. Simpler than an ActionSheet and doesn't require `@expo/action-sheet` (not in approved libraries).

### Bottom Sheet for Add Chart: Hand-Rolled RN Modal
**Recommendation:** Use RN `Modal` with `animationType="slide"` and `transparent={true}` with a Pressable overlay and a bottom-aligned sheet container. The Add Chart form is 3 fields -- it doesn't need snap points, rubber banding, or gesture dismissal that @gorhom/bottom-sheet provides. This avoids the SDK 54 compatibility risk and keeps dependencies minimal.

### Chart Height: 180px
**Recommendation:** 180px chart height within the card. This provides enough vertical space for data variation visibility while keeping the card compact enough to show 2-3 charts on screen without scrolling too far. Combined with card padding and the title header, total card height is approximately 250-260px.

### Tooltip Styling
**Recommendation:** Dark background (`bgElevated`), white text, positioned above the data point. Show the value with unit suffix ("225 lbs" for max_volume_set, "12 sets" for total_sets). Match the existing web tooltip style (`rgba(0, 0, 0, 0.8)` background, `#4f9eff` border).

### Gradient: Vertical Fade from 30% to 1% Opacity
**Recommendation:** `startFillColor="rgba(79, 158, 255, 0.3)"` fading to `endFillColor="rgba(79, 158, 255, 0.01)"`. This matches the web app's `rgba(79, 158, 255, 0.1)` fill effect while giving a more polished gradient look on mobile.

### Grid Lines: Hidden
**Recommendation:** `hideRules={true}` for a clean, minimal look. The x-axis line provides enough visual structure. This matches mobile chart design conventions (less chrome, more data).

### Data Point Markers: 4px Radius, Accent Blue
**Recommendation:** `dataPointsRadius={4}` matching the web app's `pointRadius: 4`. Only show focused/hovered point at 6px radius. Color matches accent blue (#4f9eff).

### X-Axis Label Overflow: Abbreviated Dates, Skip Labels
**Recommendation:** For date mode, format as "M/D" (e.g., "1/15" not "2026-01-15"). For session mode, just use numbers ("1", "2", "3"). If more than 15 data points are visible, consider showing labels on every 2nd or 3rd point by setting `label: ''` on intermediate items.

### Chart Data Caching Strategy: Memoize in Component State
**Recommendation:** Compute chart data via `logging.getExerciseMetrics()` when the chart config loads, store in React state, and only recompute when the dashboard regains focus (via `useFocusEffect`). No AsyncStorage caching of computed chart data -- the constitution forbids it. The computation is fast (in-memory array operations on cached workout history).

### Loading State: Skeleton Placeholder
**Recommendation:** Show a card-shaped placeholder with the title visible and a dim placeholder area where the chart will render. Avoid a spinner per card -- it would be visually noisy with multiple charts. Instead, render the card frame immediately and populate the chart data asynchronously.

## Open Questions

1. **react-native-gifted-charts version pinning**
   - What we know: The library is actively maintained and Expo Go compatible. Latest stable appears to be 1.4.x.
   - What's unclear: Exact version that works best with Expo SDK 54 / RN 0.81 / Reanimated 4.1.x.
   - Recommendation: Use `npx expo install` which handles version compatibility, then verify on device immediately.

2. **ScrollView vs FlatList for dashboard**
   - What we know: Current dashboard uses `FlatList` for templates. Charts need to appear below.
   - What's unclear: Whether converting to `ScrollView` causes any performance regression with the template swipeable cards.
   - Recommendation: Convert to `ScrollView` since total item count is bounded (< 35 items). Test swipe gestures on templates still work correctly.

3. **Offline chart creation behavior**
   - What we know: Constitution says "chart CRUD requires connectivity" and "charts computed from cached history work offline".
   - What's unclear: What happens if user tries to create a chart while offline? Should the "Add Chart" button be disabled, or show an error after submit?
   - Recommendation: Allow the form to open but show an error on submit if offline. The chart CRUD goes to Supabase and will fail naturally -- catch the error and show "Internet connection required to create charts."

## Sources

### Primary (HIGH confidence)
- Web app `charts.ts` service: `C:\Users\MarioPC\Apps\exercise_tracker_app\packages\shared\src\services\charts.ts` -- exact CRUD logic to port
- Web app `logging.ts` service: `C:\Users\MarioPC\Apps\exercise_tracker_app\packages\shared\src\services\logging.ts` -- getExerciseMetrics logic (already ported)
- iOS `src/services/logging.ts` -- getExerciseMetrics already ported and working
- iOS `src/services/exercises.ts` -- getExercisesWithLoggedData already implemented
- iOS `src/types/services.ts` -- UserChartData, CreateChartInput, ChartData, ChartsService types already defined
- SQL schema `sql/current_schema.sql` -- user_charts table definition with constraints
- `react-native-gifted-charts` LineChart props documentation: [GitHub LineChartProps.md](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/blob/master/docs/LineChart/LineChartProps.md)

### Secondary (MEDIUM confidence)
- `@gorhom/bottom-sheet` SDK 54 fix: [Issue #2507](https://github.com/gorhom/react-native-bottom-sheet/issues/2507) -- resolved with reanimated v4.1.4+
- `react-native-gifted-charts` npm page: [npm](https://www.npmjs.com/package/react-native-gifted-charts) -- version info, peer deps
- `react-native-gifted-charts` GitHub: [GitHub](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) -- installation instructions, Expo compatibility confirmed

### Tertiary (LOW confidence)
- Exact gifted-charts version number for SDK 54 -- needs verification via `npx expo install`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- approved in constitution, Expo Go compatible, peer deps already installed
- Architecture: HIGH -- follows exact same patterns as existing services/hooks/components, web app code is reference
- Chart library API: HIGH -- verified from official docs, all required features (area chart, curved, pointerConfig, scrolling) confirmed
- Pitfalls: MEDIUM -- based on React Native charting experience and library documentation, some need device testing
- Discretion recommendations: MEDIUM -- based on analysis of existing patterns and library capabilities, final validation on device

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days -- stable domain, library is mature)
