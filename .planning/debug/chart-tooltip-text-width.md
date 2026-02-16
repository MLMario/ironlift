---
status: diagnosed
trigger: "Investigate why chart tooltip text wraps in a very tiny width, making each letter appear stacked on top of each other."
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:00:00Z
---

## Current Focus

hypothesis: Tooltip container View has no width constraint, allowing text to wrap at minimum possible width
test: examining tooltip styles in ChartCard.tsx
expecting: missing minWidth or flexShrink:0 on tooltip View
next_action: analyze tooltip component implementation

## Symptoms

expected: Tooltip shows value + unit (e.g. "150 lbs") on single line when tapping chart data point
actual: Tooltip text wraps at extremely narrow width, stacking each character vertically
errors: none
reproduction: Tap any data point on a chart in the Charts tab
started: reported by user

## Eliminated

## Evidence

- timestamp: 2026-02-15T00:00:00Z
  checked: ChartCard.tsx lines 124-135 (pointerLabelComponent)
  found: pointerLabelComponent returns View with styles.tooltip wrapping Text with styles.tooltipText
  implication: custom tooltip component is being used

- timestamp: 2026-02-15T00:00:00Z
  checked: ChartCard.tsx lines 208-218 (tooltip styles)
  found: |
    tooltip: {
      backgroundColor: "rgba(0,0,0,0.8)",
      borderRadius: theme.radii.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    }
  implication: tooltip View has no width constraints (no width, minWidth, maxWidth, or flexShrink)

- timestamp: 2026-02-15T00:00:00Z
  checked: ChartCard.tsx lines 214-218 (tooltipText styles)
  found: |
    tooltipText: {
      color: "#ffffff",
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
    }
  implication: Text has no width constraints or flexWrap:nowrap specified

## Resolution

root_cause: |
  The tooltip View container (lines 208-213 in ChartCard.tsx) lacks width constraint properties.

  React Native's flexbox allows the View to shrink to minimum possible width when the parent
  (react-native-gifted-charts' pointer component) positions it absolutely or constrains it.

  Without explicit width/minWidth/flexShrink:0, the View collapses to the narrowest possible
  width, forcing the Text component to wrap at character boundaries.

  Current tooltip style (lines 208-213):
  ```
  tooltip: {
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: theme.radii.sm,        // 4px
    paddingHorizontal: theme.spacing.sm, // 8px
    paddingVertical: theme.spacing.xs,   // 4px
  }
  ```

  Missing: flexShrink or minWidth

fix: |
  Add `flexShrink: 0` to the tooltip style object to prevent the container from collapsing.

  Updated tooltip style (lines 208-213):
  ```
  tooltip: {
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    flexShrink: 0,  // ← ADD THIS LINE
  }
  ```

  Alternative/additional fix if flexShrink alone doesn't work:
  Add `alignSelf: 'flex-start'` to prevent stretching and wrapping.

verification:

files_changed:
  - src/components/ChartCard.tsx (line 208-213, tooltip style object)
