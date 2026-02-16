# Phase 8: Chart Fit-to-Width Display - Research

**Researched:** 2026-02-15
**Domain:** react-native-gifted-charts LineChart fit-to-width rendering
**Confidence:** HIGH

## Summary

This phase is a targeted enhancement to the existing chart implementation. The current ChartCard uses a fixed `spacing={40}` between data points with `scrollToEnd` enabled, resulting in horizontally scrollable charts. The goal is to make charts render all data points within the visible card width, dynamically adjusting spacing based on the number of data points.

The react-native-gifted-charts library (v1.4.74, installed) natively supports this via the `adjustToWidth` prop combined with `parentWidth` and `disableScroll`. The library's core (`gifted-charts-core`) auto-computes spacing as `(parentWidth - yAxisLabelWidth - initialSpacing) / max(data.length - 1, 1)` when `adjustToWidth` is true and no explicit `spacing` prop is provided. This is the correct approach -- no manual spacing calculation needed.

The main challenge is measuring the container width at runtime (to pass as `parentWidth`) and handling edge cases: charts with very few points (2-3) should not spread too far apart, and charts with many points (50+) should still look readable with appropriate label thinning.

**Primary recommendation:** Use the library's built-in `adjustToWidth={true}` with `parentWidth` measured via `onLayout`, remove fixed `spacing={40}` and `scrollToEnd`, add `disableScroll={true}`, and thin x-axis labels for dense charts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-gifted-charts | 1.4.74 | Chart rendering | Already installed and used; has built-in `adjustToWidth` support |
| gifted-charts-core | (peer dep) | Chart logic/computation | Bundled with gifted-charts; contains the spacing auto-calculation logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native (Dimensions) | built-in | Screen width measurement | Fallback/initial parentWidth before onLayout fires |
| react-native (onLayout) | built-in | Container width measurement | Primary method to get actual chart container width |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `adjustToWidth` prop | Manual spacing calculation | Manual calc duplicates library logic; `adjustToWidth` is cleaner and maintained by the library |
| `onLayout` for width | `Dimensions.get('window')` with padding math | Dimensions is less accurate; doesn't account for dynamic layouts or device rotation |
| `useWindowDimensions` hook | `Dimensions.get('window')` | Hook is reactive but this app is portrait-only, so either works |

## Architecture Patterns

### Change Scope
This is a **modification to ChartCard.tsx only** (plus possibly a minor addition to useChartData.ts for label thinning). No new files, no new hooks, no service changes.

```
src/
  components/
    ChartCard.tsx     # PRIMARY: add adjustToWidth, parentWidth, remove spacing/scrollToEnd
  hooks/
    useChartData.ts   # MINOR: optional label thinning logic for dense charts
```

### Pattern 1: Container Width Measurement via onLayout
**What:** Use React Native's `onLayout` callback on the chart container `View` to measure its rendered width, then pass that to the `LineChart` as `parentWidth`.
**When to use:** Always -- this is the standard RN pattern for measuring container dimensions.
**Example:**
```typescript
// Source: React Native docs + gifted-charts-core source analysis
import { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';

function ChartCard({ chart, onDelete }: ChartCardProps) {
  const [chartWidth, setChartWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setChartWidth(width);
  };

  return (
    <View style={styles.card}>
      {/* header */}
      <View style={styles.chartContainer} onLayout={handleLayout}>
        {chartWidth > 0 && (
          <LineChart
            data={data}
            adjustToWidth
            parentWidth={chartWidth}
            disableScroll
            // DO NOT pass spacing -- let adjustToWidth calculate it
            initialSpacing={20}
            // endSpacing defaults to 0 when adjustToWidth is true
            // ... other existing props
          />
        )}
      </View>
    </View>
  );
}
```

### Pattern 2: Conditional Label Thinning for Dense Charts
**What:** When many data points exist, x-axis labels overlap. Thin labels by setting `label: ''` on data items that should not display a label.
**When to use:** When the computed spacing is small enough that labels would overlap (roughly < 30px spacing).
**Example:**
```typescript
// Show every Nth label based on data density
function thinLabels(items: ChartLineDataItem[], chartWidth: number): ChartLineDataItem[] {
  const availableWidth = chartWidth - 20; // minus initialSpacing
  const spacingPerPoint = availableWidth / Math.max(items.length - 1, 1);

  // Approximate label width for "M/D" format is ~25-30px at fontSize 10
  const labelWidth = 30;
  const showEveryN = Math.max(1, Math.ceil(labelWidth / spacingPerPoint));

  if (showEveryN <= 1) return items; // all labels fit

  return items.map((item, index) => ({
    ...item,
    label: index % showEveryN === 0 ? item.label : '',
  }));
}
```

### Pattern 3: Minimum Spacing Guard for Few Data Points
**What:** With only 2-3 data points and adjustToWidth, the chart would spread points across the full width, which may look odd (huge gaps). A `maxSpacing` guard ensures points don't spread too far.
**When to use:** Charts with very few data points (2-5).
**Example:**
```typescript
// If adjustToWidth would produce spacing > 80px, cap it manually
// (or just let it be -- spreading 2-3 points across the width
// may actually look fine since it shows the trend clearly)
const MAX_SPACING = 80;
const autoSpacing = (chartWidth - 20) / Math.max(data.length - 1, 1);
const useManualSpacing = autoSpacing > MAX_SPACING;

<LineChart
  adjustToWidth={!useManualSpacing}
  parentWidth={chartWidth}
  spacing={useManualSpacing ? MAX_SPACING : undefined}
  disableScroll
  // ...
/>
```

### Anti-Patterns to Avoid
- **Passing both `spacing` and `adjustToWidth`:** If you pass an explicit `spacing` prop, it overrides the auto-calculation entirely. The `adjustToWidth` formula only runs when `spacing` is NOT provided.
- **Using `scrollToEnd` with `disableScroll`:** Contradictory -- `scrollToEnd` is meaningless when scrolling is disabled and the chart fits the container.
- **Calculating spacing manually and passing it:** Duplicates the library's internal logic. Use `adjustToWidth` instead.
- **Not guarding render until width is measured:** Rendering LineChart with `parentWidth={0}` will produce division by zero in the spacing calculation (`spacing = (0 - 10 - 20) / N`), yielding negative spacing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auto-fit spacing calculation | Manual `(width - padding) / (points - 1)` | `adjustToWidth={true}` prop | Library already does this; handles edge cases, yAxisLabelWidth offsets, endSpacing defaults |
| Scroll disabling | Removing ScrollView wrapper | `disableScroll={true}` prop | Library manages its own ScrollView internally |
| Width measurement | Manual screen width calculation | `onLayout` callback on container View | Accounts for actual rendered width including padding, margins, safe areas |

**Key insight:** The library's `adjustToWidth` prop does exactly what this phase needs. The only custom logic required is (a) measuring container width and (b) thinning x-axis labels for dense charts.

## Common Pitfalls

### Pitfall 1: Spacing Prop Override
**What goes wrong:** Passing `spacing={40}` alongside `adjustToWidth={true}` -- the explicit `spacing` takes priority and the chart still scrolls.
**Why it happens:** The gifted-charts-core source: `spacing = props.spacing ?? (adjustToWidth ? autoCalc : default)`. Explicit spacing wins.
**How to avoid:** Remove the `spacing={40}` prop entirely when using `adjustToWidth`.
**Warning signs:** Chart still scrolls despite `adjustToWidth={true}`.

### Pitfall 2: Missing parentWidth Before Layout
**What goes wrong:** Rendering LineChart before `onLayout` fires, passing `parentWidth={0}`. The spacing formula produces `(0 - 10 - 20) / N = negative` values.
**Why it happens:** `onLayout` fires asynchronously after initial render.
**How to avoid:** Guard with `{chartWidth > 0 && <LineChart ... />}`. The loading/placeholder state already shown while data loads also covers this timing.
**Warning signs:** Chart renders with zero or negative width, visual glitches.

### Pitfall 3: X-Axis Label Overlap on Dense Charts
**What goes wrong:** With 52+ data points fit into ~350px, spacing is ~6-7px. X-axis labels ("1/15", "Session 42") are ~25-30px wide and overlap badly.
**Why it happens:** The library does not auto-thin labels; it renders every label at the assigned position.
**How to avoid:** Thin labels in the data by setting `label: ''` for non-displayed points. Show every Nth label based on available spacing.
**Warning signs:** Unreadable x-axis with overlapping text.

### Pitfall 4: Data Points Clipping at Edges
**What goes wrong:** The last data point circle gets clipped at the right edge of the chart.
**Why it happens:** Fixed in v1.4.13 -- the library adds `dataPointsRadius` to the width calculation. Current version (1.4.74) includes this fix.
**How to avoid:** Already resolved in the installed version. No action needed.
**Warning signs:** Half-circle visible at right edge.

### Pitfall 5: yAxisLabelWidth Ghost Space
**What goes wrong:** Even with `hideYAxisText`, the library reserves 10px for the y-axis label area, eating into available chart space.
**Why it happens:** `yAxisEmptyLabelWidth` defaults to 10 in `AxesAndRulesDefaults`.
**How to avoid:** Set `yAxisLabelWidth={0}` to reclaim that 10px when `hideYAxisText` is true.
**Warning signs:** Slight left offset/gap in the chart area.

### Pitfall 6: endSpacing Not Zeroed
**What goes wrong:** `endSpacing` defaults to 20 normally, but to 0 when `adjustToWidth` is true. If you explicitly pass `endSpacing={20}` (carried over from old props), the chart won't use the full width.
**Why it happens:** Explicit prop overrides the adjustToWidth default.
**How to avoid:** Remove explicit `endSpacing` prop or set it to 0 when using `adjustToWidth`.
**Warning signs:** Wasted whitespace on the right side of the chart.

### Pitfall 7: Pointer Tooltip Position on Dense Charts
**What goes wrong:** The `pointerLabelWidth: 80` tooltip may extend beyond chart bounds when tapping points near the edges.
**Why it happens:** `autoAdjustPointerLabelPosition` should handle this, but may not account for very dense charts.
**How to avoid:** Keep `autoAdjustPointerLabelPosition: true` (already set). Test edge-point tooltips manually.
**Warning signs:** Tooltip text cut off at left/right edges.

## Code Examples

### Full ChartCard LineChart Props Migration
```typescript
// Source: gifted-charts-core source analysis (v1.4.74)

// BEFORE (scrolling chart, fixed spacing):
<LineChart
  data={data}
  spacing={40}           // REMOVE
  initialSpacing={20}
  endSpacing={20}        // REMOVE (auto 0 with adjustToWidth)
  scrollToEnd            // REMOVE
  // ... other props
/>

// AFTER (fit-to-width):
<LineChart
  data={thinnedData}     // data with thinned labels
  adjustToWidth          // auto-compute spacing to fit container
  parentWidth={chartWidth} // measured via onLayout
  disableScroll          // no horizontal scroll needed
  initialSpacing={10}    // reduced from 20; less wasted edge space
  yAxisLabelWidth={0}    // reclaim 10px hidden axis area
  // ... other props unchanged (height, colors, pointerConfig, etc.)
/>
```

### Container Width Measurement
```typescript
// Source: React Native onLayout API
const [chartWidth, setChartWidth] = useState(0);

const handleChartLayout = useCallback((event: LayoutChangeEvent) => {
  const { width } = event.nativeEvent.layout;
  if (width !== chartWidth) {
    setChartWidth(width);
  }
}, [chartWidth]);

// In render:
<View style={styles.chartContainer} onLayout={handleChartLayout}>
  {chartWidth > 0 && data.length >= 2 && (
    <LineChart
      parentWidth={chartWidth}
      adjustToWidth
      disableScroll
      // ...
    />
  )}
</View>
```

### Label Thinning Logic
```typescript
// Source: Custom logic based on gifted-charts label rendering behavior

/**
 * Thin x-axis labels to prevent overlap on dense charts.
 * Returns a new array with some labels set to '' so only every Nth label shows.
 *
 * @param items - Original data items with labels
 * @param chartWidth - Measured chart container width in pixels
 * @param initialSpacing - Chart initialSpacing prop value
 * @returns Data items with thinned labels
 */
function thinLabels(
  items: ChartLineDataItem[],
  chartWidth: number,
  initialSpacing: number
): ChartLineDataItem[] {
  if (items.length <= 1) return items;

  const availableWidth = chartWidth - initialSpacing;
  const spacingPerPoint = availableWidth / (items.length - 1);

  // At fontSize 10, a typical "M/D" label is ~25px wide
  // A "Session NN" (now just "NN") label is ~15px wide
  const MIN_LABEL_SPACING = 28;

  if (spacingPerPoint >= MIN_LABEL_SPACING) {
    return items; // All labels fit without overlap
  }

  // Calculate how many labels to skip
  const showEveryN = Math.ceil(MIN_LABEL_SPACING / spacingPerPoint);

  return items.map((item, index) => ({
    ...item,
    label: index % showEveryN === 0 || index === items.length - 1
      ? item.label
      : '',
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed `spacing` + scroll | `adjustToWidth` + `parentWidth` | Available since gifted-charts v1.3.1+ | Charts fit container, no scroll needed |
| Manual width calc | Library auto-computes from `parentWidth` | In gifted-charts-core | No need to duplicate internal formula |
| `endSpacing: 20` default | `endSpacing: 0` auto-default with adjustToWidth | v1.3.1 | No whitespace on right edge |
| Data point clipping at edges | Fixed in library | v1.4.13 | Last data point renders fully |

**Deprecated/outdated:**
- `scrollToEnd`: Not needed when chart fits the container width
- Fixed `spacing` prop: Replaced by `adjustToWidth` auto-calculation

## Open Questions

1. **Maximum data point density cutoff**
   - What we know: Session mode caps at 52 points, date mode at 365. With 365 points on a ~350px chart, spacing is ~1px -- the line becomes a dense blur with invisible individual points.
   - What's unclear: Should we cap the visible data points (e.g., show only last 52 in date mode too) or let the library render all 365 as a continuous line?
   - Recommendation: For date mode with many points (>100), consider reducing `dataPointsRadius` to 2 or even hiding data points entirely (`hideDataPoints`). Keep the line visible. The trend is what matters at that density. Alternatively, keep the 365 limit but accept that very dense charts will look like continuous lines (which is actually how stock charts work).

2. **Few-points spacing cap**
   - What we know: 2 data points on a 350px chart means 1 point at each edge (~330px gap). This looks fine for a trend line but very spread out.
   - What's unclear: Whether users will find this visually acceptable or want points more centered.
   - Recommendation: Let `adjustToWidth` handle it naturally. 2-point charts showing full-width trend lines are standard in data visualization. No cap needed unless UAT feedback says otherwise.

3. **Pointer tooltip behavior change**
   - What we know: Current charts use `activatePointersOnLongPress: false` (pointer activates on tap). With `disableScroll`, scroll conflict is gone, so this should work better than before.
   - What's unclear: Whether tooltip positioning with `autoAdjustPointerLabelPosition` handles all edge cases at various data densities.
   - Recommendation: Keep current pointer config. Test manually on device with 2, 10, 30, 52 data point scenarios.

## Sources

### Primary (HIGH confidence)
- gifted-charts-core source code (dist/LineChart/index.js, lines 197-207) -- Verified `adjustToWidth` spacing formula directly in installed package
- gifted-charts-core type definitions (dist/LineChart/types.d.ts) -- Confirmed `adjustToWidth`, `parentWidth`, `disableScroll` prop types
- react-native-gifted-charts v1.4.74 source (dist/LineChart/index.js) -- Confirmed props passthrough to useLineChart
- [LineChart Props Documentation](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/blob/master/docs/LineChart/LineChartProps.md) -- Official prop reference

### Secondary (MEDIUM confidence)
- [Issue #276: adjustToWidth whitespace fix](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/276) -- endSpacing auto-zero confirmed in v1.3.1
- [Issue #623: Data point clipping fix](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/623) -- Fixed in v1.4.13 (current version 1.4.74 includes this)
- [Issue #734: yAxis label width](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/734) -- Known issue with width calculation including y-axis label space

### Tertiary (LOW confidence)
- WebSearch results for tooltip + adjustToWidth interaction -- No specific bugs reported, but limited real-world examples found

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified directly in installed package source code
- Architecture: HIGH - Pattern is straightforward; props exist and work as documented
- Pitfalls: HIGH - Identified through source code analysis, not just documentation
- Label thinning: MEDIUM - Custom logic, not library-provided; needs manual testing

**Research date:** 2026-02-15
**Valid until:** 2026-04-15 (stable library, unlikely to change significantly)
