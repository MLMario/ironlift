# Phase 06 Plan 06: Gap Closure Round 2 Summary

**One-liner:** Fixed kebab menu dismiss flash, chart tooltip text wrapping, and Add Chart CTA cutoff with properly diagnosed root causes from round 2 debug sessions.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Fix KebabMenu dismiss flash and chart tooltip width | 5f6fc45 | KebabMenu.tsx, ChartCard.tsx |
| 2 | Fix AddChartSheet CTA cutoff with scrollable form | 7cda0ea | AddChartSheet.tsx |

## What Was Done

### Task 1: KebabMenu dismiss flash and chart tooltip width

**KebabMenu dismiss flash (Gap 1):**
- Root cause: `handleClose()` called `setTriggerPos(null)` simultaneously with `setMenuVisible(false)`. React batched both updates, causing the dropdown to jump to `top: 80` (fallback) during the Modal's 300ms fade-out animation.
- Fix: Removed `setTriggerPos(null)` from `handleClose`. The position is inert when Modal is hidden and gets freshly measured on next open.

**Chart tooltip text wrapping (Gap 2):**
- Root cause: The 06-05 fix added `flexShrink: 0` to the inner tooltip View, but the constraint comes from the parent View created by react-native-gifted-charts with `width: pointerLabelWidth` (default 20px). Inner flexShrink cannot override explicit parent width.
- Fix: Added `pointerLabelWidth: 120` and `autoAdjustPointerLabelPosition: true` to the pointerConfig object, overriding the library's 20px default.

### Task 2: AddChartSheet CTA cutoff with scrollable form

- Root cause: Sheet's fixed 50% height provides ~344pt interior space, but form content totals ~436pt. Button row overflows and gets clipped.
- Fix: Wrapped form fields in ScrollView with `flex: 1`, pinned button row outside ScrollView as direct child of formContainer. Moved `gap` from formContainer to ScrollView's contentContainerStyle, replaced `marginTop: 'auto'` with `paddingTop` on buttonRow.

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| pointerLabelWidth: 120 (not larger) | Sufficient for "225 lbs" and "12 sets" without excessive whitespace |
| Keep flexShrink: 0 on tooltip style | Harmless now that parent width is correct; removing would be unnecessary churn |
| ScrollView wraps form fields only | Button row pinned outside for guaranteed visibility regardless of content height |

## Verification

- `npx tsc --noEmit` passes with zero errors
- KebabMenu.tsx: handleClose only calls setMenuVisible(false)
- ChartCard.tsx: pointerConfig has pointerLabelWidth: 120 and autoAdjustPointerLabelPosition: true
- AddChartSheet.tsx: form fields in ScrollView, button row pinned outside ScrollView

## Metrics

- **Duration:** ~80 seconds
- **Tasks:** 2/2 completed
- **Files modified:** 3
- **Completed:** 2026-02-16

## Self-Check: PASSED
