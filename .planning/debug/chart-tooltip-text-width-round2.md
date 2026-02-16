---
status: diagnosed
trigger: "Chart tooltip text still wrapping letters vertically after 06-05 fix attempt"
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:00:00Z
---

## Current Focus

hypothesis: The library's wrapper View imposes width:20 on the tooltip, overriding any inner styles
test: Read react-native-gifted-charts source to find parent container constraints
expecting: A fixed-width parent container that constrains the tooltip
next_action: diagnosis complete

## Symptoms

expected: Tooltip shows value + unit (e.g. "225 lbs") on a single horizontal line when long-pressing a chart data point
actual: Tooltip text wraps at extremely narrow width, stacking each character vertically
errors: none
reproduction: Long-press any data point on a chart in the Charts tab
started: persists after 06-05 fix attempt that added flexShrink:0

## Eliminated

- hypothesis: "Inner tooltip View lacks flexShrink:0, causing it to collapse"
  evidence: |
    flexShrink:0 was added in the 06-05 fix (ChartCard.tsx line 209). Bug persists.
    The actual constraint comes from the PARENT View created by the library, not the inner View.
    flexShrink:0 on a child cannot override an explicit width on its parent.
  timestamp: 2026-02-15T00:00:00Z

## Evidence

- timestamp: 2026-02-15T00:00:00Z
  checked: ChartCard.tsx lines 114-131 (pointerConfig)
  found: |
    pointerConfig sets: pointerColor, radius:3, activatePointersOnLongPress:true,
    showPointerStrip:true, pointerStripColor, and pointerLabelComponent.
    It does NOT set pointerLabelWidth, pointerLabelHeight, shiftPointerLabelX,
    shiftPointerLabelY, or autoAdjustPointerLabelPosition.
  implication: All pointer label sizing/positioning uses library defaults

- timestamp: 2026-02-15T00:00:00Z
  checked: ChartCard.tsx lines 204-210 (tooltip style)
  found: |
    tooltip: {
      backgroundColor: "rgba(0,0,0,0.8)",
      borderRadius: theme.radii.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      flexShrink: 0,   // <-- added in 06-05 fix
    }
  implication: The 06-05 fix (flexShrink:0) is present but ineffective

- timestamp: 2026-02-15T00:00:00Z
  checked: gifted-charts-core/dist/utils/constants.js line 271
  found: "pointerLabelWidth: 20" -- the default pointerLabelWidth is 20 pixels
  implication: Without explicit override, tooltip parent container is 20px wide

- timestamp: 2026-02-15T00:00:00Z
  checked: react-native-gifted-charts/dist/Components/common/StripAndLabel.js lines 49-58
  found: |
    The library wraps pointerLabelComponent output in a View with these styles:
    {
      position: 'absolute',
      left: left + pointerX,
      top: top,
      marginTop: ...,
      width: pointerLabelWidth,   // <-- explicit width constraint = 20px
    }
  implication: |
    This is the ROOT CAUSE. The library's wrapper View has width:20 (the default).
    This 20px-wide absolutely-positioned View is the PARENT of our tooltip View.
    No matter what styles we set on the inner tooltip View (flexShrink, minWidth, etc.),
    the parent's explicit width:20 constrains the layout. The Text inside wraps at
    character boundaries because it only has 20px of horizontal space (minus padding).

- timestamp: 2026-02-15T00:00:00Z
  checked: gifted-charts-core/dist/LineChart/index.js line 1130
  found: |
    var pointerLabelWidth = pointerConfig?.pointerLabelWidth ?? defaultPointerConfig.pointerLabelWidth;
  implication: pointerLabelWidth can be overridden via pointerConfig.pointerLabelWidth

- timestamp: 2026-02-15T00:00:00Z
  checked: gifted-charts-core/dist/components/common/StripAndLabel.js (getTopAndLeftForStripAndLabel)
  found: |
    With autoAdjustPointerLabelPosition:false (default), the top position calculation uses:
      top = (-pointerYLocal + 8) - pointerLabelWidth/2 + shiftPointerLabelY
    So pointerLabelWidth also affects vertical positioning of the tooltip.
  implication: Changing pointerLabelWidth will also shift the tooltip vertically; may need to compensate with shiftPointerLabelY

- timestamp: 2026-02-15T00:00:00Z
  checked: Searched entire src/ directory for "pointerLabelWidth"
  found: Zero occurrences -- never set anywhere in app code
  implication: Confirms the library default of 20 is being used

## Resolution

root_cause: |
  The react-native-gifted-charts library wraps the pointerLabelComponent output in an
  absolutely-positioned View with an explicit `width` property set to `pointerLabelWidth`.

  The default value of `pointerLabelWidth` is 20 pixels (defined in
  gifted-charts-core/dist/utils/constants.js line 271).

  This means the tooltip's PARENT container is only 20 pixels wide. The inner tooltip View
  (with flexShrink:0, padding, etc.) cannot exceed its parent's width. The Text component
  is forced to wrap at character boundaries because it only has ~20px of horizontal space.

  The previous fix (adding flexShrink:0 to the inner tooltip style) was correct in spirit
  but targeted the wrong layer. The constraint comes from the library's wrapper View, not
  from the inner tooltip View itself.

  Relevant source locations:
  - Default: gifted-charts-core/dist/utils/constants.js:271 -> pointerLabelWidth: 20
  - Resolution: gifted-charts-core/dist/LineChart/index.js:1130 -> reads pointerConfig.pointerLabelWidth
  - Wrapper: react-native-gifted-charts/dist/Components/common/StripAndLabel.js:57 -> width: pointerLabelWidth

fix: |
  Add `pointerLabelWidth` to the pointerConfig in ChartCard.tsx to override the 20px default.
  A value of approximately 120 should accommodate values like "225 lbs" or "12 sets" comfortably.

  Also consider setting `autoAdjustPointerLabelPosition: true` so the library automatically
  repositions the tooltip when it's near the edges of the chart, preventing it from being
  clipped off-screen.

  Since changing pointerLabelWidth also affects the vertical positioning calculation
  (top = (-pointerYLocal + 8) - pointerLabelWidth/2 + shiftPointerLabelY), you may need
  to add `shiftPointerLabelY` to adjust the vertical offset after changing the width.

  The flexShrink:0 on the inner tooltip style can be kept (harmless) or removed (unnecessary
  once the parent width is correct).

  Example fix in ChartCard.tsx pointerConfig (lines 114-132):
  ```
  pointerConfig={{
    pointerColor: "#4f9eff",
    radius: 3,
    activatePointersOnLongPress: true,
    showPointerStrip: true,
    pointerStripColor: theme.colors.border,
    pointerLabelWidth: 120,                    // <-- ADD: override 20px default
    autoAdjustPointerLabelPosition: true,      // <-- ADD: prevent edge clipping
    pointerLabelComponent: (items) => { ... },
  }}
  ```

verification:
files_changed: []
