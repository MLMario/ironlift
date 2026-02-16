---
status: diagnosed
phase: 06-charts
source: [06-UAT.md (round 1 retests), 06-05-SUMMARY.md]
started: 2026-02-15T22:00:00Z
updated: 2026-02-15T22:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. KebabMenu Delete Button Flash on Dismiss
expected: When opening the kebab menu on a chart card and then pressing outside to dismiss, the menu should close cleanly without the delete button flashing at the top of the dashboard.
result: issue
reported: "Delete button appearing on top of dashboard has been partially resolved, when pressing the kebab, the delete appears on the right position, but when pressing outside the kebab menu to go back to the dashboard the delete button partially flashes on the top of the dashboard"
severity: minor

### 2. Chart Tooltip Text Wrapping
expected: Pressing a data point on a chart shows a tooltip with readable text in a single line (e.g., "225 lbs" or "12 sets"), not with letters stacked vertically.
result: issue
reported: "The point text is still not working, letters are wrapped one on top of another"
severity: major

### 3. Add Chart Sheet CTA Visibility
expected: The Add Chart bottom sheet shows the full "Add Chart" and "Cancel" buttons fully visible and tappable at the bottom of the sheet.
result: issue
reported: "The Add Chart and Cancel button are still only half visible in the add chart modal"
severity: major

## Summary

total: 3
passed: 0
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "KebabMenu dismisses cleanly without delete button flashing at dashboard top"
  status: failed
  reason: "User reported: Delete button partially flashes on top of dashboard when pressing outside kebab menu to dismiss"
  severity: minor
  test: 1
  root_cause: "handleClose() sets triggerPos=null simultaneously with menuVisible=false. During the Modal fade-out animation (~300ms), the dropdown position falls back to hardcoded top:80 because triggerPos is null, causing a visible jump/flash."
  artifacts:
    - path: "src/components/KebabMenu.tsx"
      issue: "handleClose sets triggerPos=null before fade-out animation completes, position falls to fallback"
  missing:
    - "Remove setTriggerPos(null) from handleClose — position is inert when modal hidden and re-measured on next open"
  debug_session: ".planning/debug/kebab-menu-dismiss-flash.md"

- truth: "Chart tooltip displays value text readable in a single line"
  status: failed
  reason: "User reported: Letters are wrapped one on top of another in tooltip text"
  severity: major
  test: 2
  root_cause: "react-native-gifted-charts wraps pointerLabelComponent in a View with width: pointerLabelWidth (default 20px from gifted-charts-core constants). ChartCard.tsx never sets pointerLabelWidth in pointerConfig, so tooltip container is only 20px wide, forcing character-level text wrapping."
  artifacts:
    - path: "src/components/ChartCard.tsx"
      issue: "pointerConfig missing pointerLabelWidth, defaults to 20px from library"
    - path: "node_modules/gifted-charts-core/dist/utils/constants.js"
      issue: "Default pointerLabelWidth: 20 (line 271)"
  missing:
    - "Add pointerLabelWidth: 120 (or appropriate value) to pointerConfig in ChartCard.tsx"
    - "Consider autoAdjustPointerLabelPosition: true to prevent edge clipping"
  debug_session: ".planning/debug/chart-tooltip-text-width-round2.md"

- truth: "Add Chart sheet shows CTA buttons fully visible and tappable"
  status: failed
  reason: "User reported: Add Chart and Cancel buttons are still only half visible"
  severity: major
  test: 3
  root_cause: "SHEET_HEIGHT at 50% of window (~426pt) minus padding (~82pt) leaves ~344pt interior. Form content requires ~436pt (title + exercise selector + 2 radio groups + buttons + gaps), overflowing by ~92pt. The round 1 safe area fix actually reduced available space further. Buttons at bottom are clipped."
  artifacts:
    - path: "src/components/AddChartSheet.tsx"
      issue: "SHEET_HEIGHT=50% too small for form content, formContainer has no scroll, buttons overflow"
  missing:
    - "Increase SHEET_HEIGHT to ~65% or wrap form fields in ScrollView with pinned button row"
  debug_session: ".planning/debug/add-chart-sheet-cta-cutoff-round2.md"
