---
status: diagnosed
phase: 06-charts
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md]
started: 2026-02-15T19:00:00Z
updated: 2026-02-15T19:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Charts Section on Dashboard
expected: Dashboard shows a "Progress Charts" section header below the templates section. If you have no charts yet, an empty state message should appear.
result: pass

### 2. Open Add Chart Sheet
expected: Tapping the "+ Add Chart" button in the charts section header opens a half-height bottom sheet sliding up from the bottom with a semi-transparent overlay behind it.
result: issue
reported: "the half height bottom sheet opens up but it hides the CTA button at the end, they are only half visible"
severity: major

### 3. Chart Creation - Metric and Axis Radio Buttons
expected: The Add Chart sheet shows radio buttons for metric type (Total Sets / Max Volume) and x-axis mode (By Date / By Session). Tapping a radio button selects it with a filled circle indicator.
result: pass

### 4. Chart Creation - Exercise Selection
expected: Tapping "Select Exercise" navigates to an exercise list within the sheet, grouped by category headers. Only exercises with logged workout data appear. Tapping an exercise selects it and returns to the form.
result: pass

### 5. Create a Chart
expected: After selecting an exercise, metric, and axis mode, tapping "Add Chart" creates the chart. The sheet closes and the new chart appears in the charts section on the dashboard.
result: pass

### 6. Chart Renders as Line Chart
expected: The created chart card displays the exercise name and metric type as a title, with a line chart below showing data points connected by a smooth curved line with a gradient fill underneath.
result: pass

### 7. Chart Tooltip on Data Point
expected: Pressing/tapping on a data point in the chart shows a tooltip with the value (e.g., "225 lbs" for max volume or "12 sets" for total sets).
result: issue
reported: "it opens the tooltip but the text wraps around a very tiny width, making each letter appear on top of each other"
severity: major

### 8. Delete a Chart
expected: Tapping the three-dot (kebab) menu icon on a chart card shows a "Delete" option. Tapping Delete shows a confirmation dialog. Confirming removes the chart from the dashboard.
result: issue
reported: "it opens the menu, but at the top of the dashboard, NOT next to the three dot menu icon. tapping delete shows the confirmation icon and deletion works"
severity: cosmetic

### 9. Dashboard Continuous Scroll
expected: The dashboard scrolls smoothly as a single continuous page through both the templates section and charts section below it, with no gesture conflicts or scroll interruptions.
result: pass

### 10. Chart Data Refreshes After Workout
expected: After finishing a workout, returning to the dashboard should show updated chart data reflecting the new workout without needing to restart the app.
result: issue
reported: "When finishing a workout the chart doesn't update automatically, I have to open and close the app or refresh Expo Go for it to work"
severity: major

### 11. Exercise Picker First Touch in Add Chart Sheet
expected: In the Add Chart exercise picker, the first tap or drag on the exercise list should work immediately (selecting an exercise or scrolling the list).
result: issue
reported: "When going into the exercise picker and the list of exercises grouped by category, the first drag doesn't work, only the second tap or drag allows for selecting or moving the list"
severity: major

### 12. Chart Horizontal Scroll for Many Data Points
expected: Charts with many data points should be horizontally scrollable, allowing the user to scroll left to see older data points in a long sequence.
result: issue
reported: "Charts are supposed to be scrollable meaning I can scroll left to see more data points for a long sequence"
severity: major

## Summary

total: 12
passed: 6
issues: 6
pending: 0
skipped: 0

## Gaps

- truth: "Add Chart bottom sheet shows full content including CTA button at the bottom"
  status: failed
  reason: "User reported: the half height bottom sheet opens up but it hides the CTA button at the end, they are only half visible"
  severity: major
  test: 2
  root_cause: "AddChartSheet lacks SafeAreaView wrapper. Sheet uses fixed 50% height without accounting for device safe area insets. buttonRow with marginTop:auto pushes to absolute bottom, clipped by home indicator zone on iPhone X+."
  artifacts:
    - path: "src/components/AddChartSheet.tsx"
      issue: "No SafeAreaView wrapper, SHEET_HEIGHT ignores safe area insets, buttonRow clipped by home indicator"
  missing:
    - "Add SafeAreaView wrapper around sheet content (matching ExercisePickerModal pattern)"
    - "Or add paddingBottom using useSafeAreaInsets to account for bottom inset"
  debug_session: ".planning/debug/add-chart-sheet-cta-cutoff.md"

- truth: "Chart tooltip displays value text readable in a single line"
  status: failed
  reason: "User reported: it opens the tooltip but the text wraps around a very tiny width, making each letter appear on top of each other"
  severity: major
  test: 7
  root_cause: "Tooltip View container in ChartCard.tsx (lines 208-213) lacks flexShrink:0 or minWidth. Parent gifted-charts pointer component constrains it, causing View to collapse to minimum width and Text to wrap at character boundaries."
  artifacts:
    - path: "src/components/ChartCard.tsx"
      issue: "tooltip style missing flexShrink:0, no width constraint on tooltip View"
  missing:
    - "Add flexShrink: 0 to tooltip style to prevent container collapse"
  debug_session: ".planning/debug/chart-tooltip-text-width.md"

- truth: "Kebab menu dropdown appears next to the three-dot icon on the chart card"
  status: failed
  reason: "User reported: it opens the menu, but at the top of the dashboard, NOT next to the three dot menu icon. tapping delete shows the confirmation icon and deletion works"
  severity: cosmetic
  test: 8
  root_cause: "KebabMenu uses hardcoded position: absolute, top: 80 in dropdownAnchor style (line 94-99). Modal renders full-screen, dropdown always appears at y=80 regardless of trigger button's actual screen position."
  artifacts:
    - path: "src/components/KebabMenu.tsx"
      issue: "dropdownAnchor has hardcoded top:80 instead of measuring trigger button position"
  missing:
    - "Use View.measure() on trigger ref to capture absolute screen coordinates on press"
    - "Position dropdown relative to measured trigger position instead of hardcoded top:80"
  debug_session: ".planning/debug/kebab-menu-positioning.md"

- truth: "Chart data refreshes automatically after finishing a workout"
  status: failed
  reason: "User reported: When finishing a workout the chart doesn't update automatically, I have to open and close the app or refresh Expo Go for it to work"
  severity: major
  test: 10
  root_cause: "useChartData hook (useChartData.ts line 97) depends only on [chart.id]. When dashboard regains focus after workout, refreshCharts() fetches new chart config objects but chart.id hasn't changed, so useEffect doesn't re-fire and old data persists."
  artifacts:
    - path: "src/hooks/useChartData.ts"
      issue: "useEffect dependency [chart.id] doesn't trigger refetch when underlying workout data changes"
  missing:
    - "Change useEffect dependency from [chart.id] to [chart] so new object references from refreshCharts() trigger data refetch"
  debug_session: ".planning/debug/chart-no-refresh-after-workout.md"

- truth: "Exercise picker list responds to first touch/drag immediately"
  status: failed
  reason: "User reported: When going into the exercise picker and the list of exercises grouped by category, the first drag doesn't work, only the second tap or drag allows for selecting or moving the list"
  severity: major
  test: 11
  root_cause: "Nested Pressable pattern in AddChartSheet.tsx line 270. Sheet Pressable has onPress={() => {}} to prevent overlay dismissal. When step changes to selectExercise, RN touch responder system must re-establish hierarchy for new content — first touch is consumed by parent Pressable establishing responder ownership."
  artifacts:
    - path: "src/components/AddChartSheet.tsx"
      issue: "Sheet Pressable with onPress={() => {}} consumes first touch after step content change"
  missing:
    - "Replace sheet Pressable with View (or use onStartShouldSetResponder returning false) to avoid touch interception"
  debug_session: ".planning/debug/exercise-picker-first-touch.md"

- truth: "Charts with many data points are horizontally scrollable"
  status: failed
  reason: "User reported: Charts are supposed to be scrollable meaning I can scroll left to see more data points for a long sequence"
  severity: major
  test: 12
  root_cause: "pointerConfig in ChartCard.tsx has activatePointersOnLongPress: false (line 120). react-native-gifted-charts automatically disables scroll when pointerConfig is present unless activatePointersOnLongPress is true."
  artifacts:
    - path: "src/components/ChartCard.tsx"
      issue: "activatePointersOnLongPress: false disables horizontal scroll when pointerConfig is active"
  missing:
    - "Change activatePointersOnLongPress from false to true so scroll works by default and tooltip activates on long press"
  debug_session: ".planning/debug/chart-horizontal-scroll.md"
