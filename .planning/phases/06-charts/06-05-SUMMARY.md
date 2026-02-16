---
phase: "06"
plan: "05"
subsystem: "charts"
tags: ["charts", "bugfix", "uat", "safe-area", "tooltip", "kebab-menu", "scroll", "data-refresh"]
dependency-graph:
  requires: ["06-01", "06-02", "06-03", "06-04"]
  provides: ["All 6 UAT gaps closed for charts phase"]
  affects: ["07-settings"]
tech-stack:
  added: []
  patterns:
    - "View.measure() for dynamic dropdown positioning"
    - "onStartShouldSetResponder for touch propagation control"
    - "useSafeAreaInsets for bottom sheet safe area padding"
    - "Object reference dependency in useEffect for data refresh"
key-files:
  created: []
  modified:
    - "src/hooks/useChartData.ts"
    - "src/components/ChartCard.tsx"
    - "src/components/AddChartSheet.tsx"
    - "src/components/KebabMenu.tsx"
decisions:
  - id: "06-05-01"
    decision: "useChartData dependency changed from [chart.id] to [chart] to detect new object references from refreshCharts()"
  - id: "06-05-02"
    decision: "activatePointersOnLongPress: true enables scroll by default, tooltip on long press"
  - id: "06-05-03"
    decision: "Inner Pressable replaced with View + onStartShouldSetResponder to stop touch swallowing"
  - id: "06-05-04"
    decision: "KebabMenu uses View.measure() with collapsable={false} for reliable screen coordinate measurement"
metrics:
  duration: "~2 min"
  completed: "2026-02-15"
---

# Phase 06 Plan 05: UAT Gap Closure Summary

**One-liner:** Fix all 6 UAT gaps -- CTA cutoff, tooltip wrapping, kebab positioning, chart refresh, first-touch, and horizontal scroll.

## What Was Done

### Task 1: Chart data refresh, tooltip width, and horizontal scroll
Fixed three issues in `useChartData.ts` and `ChartCard.tsx`:

1. **Chart data refresh (Gap 4):** Changed useEffect dependency from `[chart.id]` to `[chart]`. When dashboard regains focus after workout, `refreshCharts()` returns new object references. Since `chart.id` is the same string, the old dependency never re-fired. The whole `chart` object triggers re-fetch on new references.

2. **Tooltip text wrapping (Gap 2):** Added `flexShrink: 0` to tooltip style. Without it, the tooltip View container collapsed to minimum width when positioned by gifted-charts' pointer component, wrapping text at character boundaries.

3. **Horizontal scroll disabled (Gap 6):** Changed `activatePointersOnLongPress` from `false` to `true` and removed `persistPointer: true`. With `pointerConfig` present, scroll is disabled unless `activatePointersOnLongPress` is `true`. Now scroll works by default, tooltip activates on long press.

### Task 2: AddChartSheet CTA cutoff and first-touch
Fixed two issues in `AddChartSheet.tsx`:

1. **CTA button cutoff (Gap 1):** Added `useSafeAreaInsets` from `react-native-safe-area-context` and applied dynamic `paddingBottom: theme.spacing.lg + insets.bottom` to the sheet container. The fixed 50% height did not account for the home indicator on iPhone X+.

2. **First touch swallowed (Gap 5):** Replaced inner `<Pressable onPress={() => {}}>` with `<View onStartShouldSetResponder={() => true}>`. The Pressable created a touch responder hierarchy issue where the first touch after step transition was consumed by the parent re-establishing responder ownership. The View with `onStartShouldSetResponder` claims touch ownership without consuming events.

### Task 3: KebabMenu dropdown positioning
Fixed positioning in `KebabMenu.tsx`:

**Kebab menu at wrong position (Gap 3):** Added `useRef<View>` on the trigger wrapper with `collapsable={false}`, and `View.measure()` in `handleOpenMenu` to capture the button's absolute screen coordinates before opening the modal. The dropdown `top` is now `triggerPos.y + triggerPos.height` instead of hardcoded `80`. Position resets on close to avoid stale values.

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Chart data refresh, tooltip, scroll | `e31b113` | useChartData.ts, ChartCard.tsx |
| 2 | AddChartSheet CTA and first-touch | `3b8b3cb` | AddChartSheet.tsx |
| 3 | KebabMenu dropdown positioning | `ce68113` | KebabMenu.tsx |

## Decisions Made

1. **[06-05-01]** useChartData dependency `[chart]` instead of `[chart.id]` -- detects new object references from refreshCharts() without requiring explicit refetch mechanism
2. **[06-05-02]** `activatePointersOnLongPress: true` -- enables default horizontal scroll, tooltip on long press (better UX for scrollable charts)
3. **[06-05-03]** View + `onStartShouldSetResponder` replaces inner Pressable -- standard RN pattern for "stop propagation without intercepting"
4. **[06-05-04]** `View.measure()` with `collapsable={false}` -- reliable screen coordinate measurement for dropdown positioning at any scroll offset

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with zero errors
- All 6 UAT gaps addressed with targeted fixes
- No new dependencies added (useSafeAreaInsets is from existing react-native-safe-area-context)

## UAT Gaps Closed

| Gap | Issue | Fix | File |
|-----|-------|-----|------|
| 1 | CTA button cut off by safe area | useSafeAreaInsets bottom padding | AddChartSheet.tsx |
| 2 | Tooltip text wraps to multiple lines | flexShrink: 0 on tooltip style | ChartCard.tsx |
| 3 | Kebab dropdown at wrong position | View.measure() dynamic positioning | KebabMenu.tsx |
| 4 | Chart data not refreshing after workout | [chart] dependency instead of [chart.id] | useChartData.ts |
| 5 | First touch swallowed in exercise picker | View + onStartShouldSetResponder | AddChartSheet.tsx |
| 6 | Charts not horizontally scrollable | activatePointersOnLongPress: true | ChartCard.tsx |

## Next Phase Readiness

Phase 06 Charts is now fully passing all UAT criteria. No blockers for Phase 07 Settings.

## Self-Check: PASSED
