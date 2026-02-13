---
status: complete
phase: 04-templates-and-dashboard
source: 04-05-SUMMARY.md, 04-06-SUMMARY.md
started: 2026-02-13T23:00:00Z
updated: 2026-02-13T23:15:00Z
---

## Current Test

[testing complete — all gaps resolved]

## Tests

### 1. Split-Color Brand Logo
expected: Dashboard header shows "Iron" in white and "Lift" in blue (accent color). The two words appear side by side on the same line.
result: pass

### 2. Decimal Weight Input
expected: In the template editor, tapping a weight field opens a numeric keyboard that includes a decimal point key. You can type a value like "72.5" and it displays correctly (rounded to 1 decimal place).
result: pass (fixed inline — 894e287)

### 3. Rest Timer (No Progress Bar)
expected: In the template editor, each exercise's rest timer section shows only: a -10s button, a time input field, and a +10s button. There is NO horizontal progress/fill bar.
result: pass

### 4. Dashboard Refresh After Save
expected: Create a new template in the editor modal and save it. When the modal closes, the new template card appears on the dashboard immediately without needing to restart or re-navigate.
result: pass

### 5. My Templates Section Header
expected: The dashboard shows a "My Templates" heading above the template list. The heading is large text on the left side of the screen.
result: pass

### 6. +Create Button in Header
expected: Next to the "My Templates" heading (on the right), there is a blue "+Create" button. Tapping it opens the template editor modal. There is NO dashed-border "+" card in the grid.
result: pass

### 7. Single-Column Layout
expected: Template cards stack vertically in a single column, taking the full width of the screen (with padding). There is NO 2-column grid.
result: pass

### 8. Start Button Padding
expected: The "Start" button at the bottom of each template card has visible margin/padding within the card. It does NOT touch the left and right edges of the card.
result: pass

### 9. Regression: Swipe-to-Reveal Actions
expected: Swiping a template card to the left still reveals Edit and Delete action buttons.
result: pass

### 10. Regression: Edit Template
expected: Tapping Edit from swipe actions opens the template editor with existing data loaded (name, exercises, sets, rest times all populated).
result: pass

### 11. Weight Save Persistence (post-fix)
expected: Edit a template, change a weight value, save. Re-open the template and the weight change is persisted.
result: pass (fixed inline — fa9df80)

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Weight input allows decimal values up to 1 decimal point (e.g., 72.5)"
  status: resolved
  reason: "User reported: doesnt pass, field doesn allow for .5 decimal"
  severity: major
  test: 2
  root_cause: "Controlled input loop destroys trailing decimal. parseFloat('72.') returns 72, so formatWeight(72) renders '72'."
  fix: "Added local editingWeight text buffer state, parse only on blur (894e287)"
  debug_session: ".planning/debug/weight-decimal-input.md"

- truth: "Editing weight values in template editor and saving persists the weight changes"
  status: resolved
  reason: "User reported: saving template updates sets/reps/exercises/timer but does NOT save weight changes"
  severity: major
  test: post-fix
  root_cause: "handleWeightChange only updated local buffer without calling onWeightChange. keyboardShouldPersistTaps='handled' skipped blur, so parent state stayed stale."
  fix: "Propagate onWeightChange on every keystroke in addition to local buffer (fa9df80)"
  debug_session: ".planning/debug/weight-not-saved.md"
