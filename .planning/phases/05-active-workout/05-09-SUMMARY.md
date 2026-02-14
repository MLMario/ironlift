---
phase: 05
plan: 09
subsystem: active-workout-ui
tags: [rest-timer, cosmetic-fix, gap-closure]

dependency_graph:
  requires: [05-03, 05-08]
  provides: [visible-inactive-timer-bar, proportional-bar-track]
  affects: []

tech_stack:
  added: []
  patterns: []

file_tracking:
  key_files:
    created: []
    modified:
      - src/components/RestTimerBar.tsx

decisions:
  - id: "05-09-01"
    description: "textMuted (#71717a) for inactive fill provides clear contrast against border (#2a2a2a) track"
  - id: "05-09-02"
    description: "28px bar track height fills barContainer, proportional to 44px buttons"
  - id: "05-09-03"
    description: "sm (14px) time text readable inside 28px bar (was xs/12px inside 8px bar)"

metrics:
  duration: "<1 min"
  completed: "2026-02-14"
---

# Phase 5 Plan 9: Rest Timer Bar Cosmetic Fixes Summary

**One-liner:** Fixed invisible inactive fill (bgElevated to textMuted) and thin bar track (8px to 28px) in RestTimerBar.

## What Was Done

Fixed three cosmetic issues in RestTimerBar.tsx identified during UAT round 3:

1. **Invisible inactive fill color** -- Changed from `theme.colors.bgElevated` (#27272a) to `theme.colors.textMuted` (#71717a). The previous color was nearly identical to the track background `border` (#2a2a2a), making the bar appear empty when inactive. The new color provides clear visual contrast while reading as subdued/inactive compared to the bright blue accent used during active countdown.

2. **Thin bar track** -- Changed from 8px to 28px height. The barContainer was already 28px, so the track now fills it completely. This makes the bar visually proportional to the 44px min-height +/-10s buttons flanking it.

3. **Small time text** -- Changed from `xs` (12px) to `sm` (14px). With the thicker bar, the time text overlay is now proportionally sized and more readable.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix inactive fill color and increase bar track height | ab747a9 | src/components/RestTimerBar.tsx |

## Verification Results

- `npx tsc --noEmit` passes with no errors
- Inactive fill color is `theme.colors.textMuted` (#71717a)
- barTrack height is 28 (was 8)
- timeText fontSize is `theme.typography.sizes.sm` (was xs)
- Active fill color remains `theme.colors.accent` (unchanged)
- barFill height remains `100%` (automatically fills new 28px track)

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 05-09-01 | textMuted for inactive fill | #71717a provides clear contrast against #2a2a2a border track, reads as subdued vs active blue |
| 05-09-02 | 28px bar track height | Fills existing 28px barContainer, proportional to 44px buttons |
| 05-09-03 | sm (14px) time text | Readable and proportional inside the thicker 28px bar |

## Next Phase Readiness

No blockers. This was the final gap closure plan for Phase 5. All UAT round 3 cosmetic issues are resolved.

## Self-Check: PASSED
