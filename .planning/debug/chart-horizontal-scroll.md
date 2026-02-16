---
status: diagnosed
trigger: "Investigate why charts with many data points are not horizontally scrollable."
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:12:00Z
---

## Current Focus

hypothesis: Charts are compressed because LineChart width is constrained to parent container width without enabling scroll properties
test: Read ChartCard.tsx to examine LineChart props and container styling
expecting: Will find either missing scrollToEnd/scrollable props or missing width/spacing configuration
next_action: Read ChartCard.tsx and useChartData.ts to examine chart configuration

## Symptoms

expected: Charts with many data points should be horizontally scrollable, allowing user to scroll left to see more data points in a long sequence
actual: All data points are compressed into the visible width - no horizontal scrolling available
errors: None reported
reproduction: View a chart with many data points on dashboard
started: Unknown - existing issue

## Eliminated

## Evidence

- timestamp: 2026-02-15T00:05:00Z
  checked: ChartCard.tsx LineChart props
  found: scrollToEnd={true}, nestedScrollEnabled={true}, spacing={40}, initialSpacing={20}, endSpacing={20} are set. No width prop specified.
  implication: Chart has scroll-related props enabled but may need explicit width calculation to make content wider than container

- timestamp: 2026-02-15T00:06:00Z
  checked: useChartData.ts data fetching
  found: Fetches limit=52 for session mode, limit=365 for date mode. No width or spacing calculations in data transformation.
  implication: Data can have 52-365 points, but hook doesn't compute chart width based on data length

- timestamp: 2026-02-15T00:10:00Z
  checked: react-native-gifted-charts documentation and GitHub issues
  found: "If you are using the pointerConfig prop, the scroll will be disabled automatically because it's difficult to achieve both scrolling line and scrolling pointer simultaneously. If you want to retain the scroll behaviour even after passing the pointerConfig prop, then set the property activatePointersOnLongPress to true inside the pointerConfig object."
  implication: ChartCard.tsx has pointerConfig with activatePointersOnLongPress=false (line 120), which is disabling chart horizontal scroll

- timestamp: 2026-02-15T00:11:00Z
  checked: ChartCard.tsx line 120
  found: activatePointersOnLongPress: false
  implication: This is the exact cause - scroll is disabled when pointerConfig is present and activatePointersOnLongPress is false

## Resolution

root_cause: Chart horizontal scrolling is disabled because ChartCard.tsx uses pointerConfig with activatePointersOnLongPress set to false. According to react-native-gifted-charts documentation, when pointerConfig is present without activatePointersOnLongPress=true, scroll is automatically disabled to avoid conflicts between scrolling and pointer interactions.
fix: Change activatePointersOnLongPress from false to true in ChartCard.tsx line 120. This will enable horizontal scroll by default and activate the pointer tooltip only on long press, allowing both scroll and pointer functionality to coexist.
verification: After fix, test a chart with many data points (e.g., 52 session points or 365 daily points). User should be able to horizontally scroll left/right to see all data points. Long pressing should activate the pointer tooltip, and releasing should allow scrolling again.
files_changed: [src/components/ChartCard.tsx]
