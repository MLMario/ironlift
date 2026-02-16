---
status: diagnosed
trigger: "Rest timer bar appears empty/invisible when a workout starts"
created: 2026-02-16T00:00:00Z
updated: 2026-02-16T00:00:00Z
---

## Current Focus

hypothesis: INACTIVE fill color (textMuted #71717a) makes text (also textMuted #71717a) invisible against the fill, making bar appear "empty"
test: Visual inspection of color values in code
expecting: Same hex color for fill and text = invisible text
next_action: Return diagnosis

## Symptoms

expected: All exercise cards show their rest timer bars immediately with the exercise's configured rest time (e.g., "1:30") in the INACTIVE state
actual: Rest timer bar appears empty/invisible when workout starts
errors: None (visual bug only)
reproduction: Start any workout from a template
started: After Phase 9 timer fixes (09-02 overhauled RestTimerBar with three states)

## Eliminated

- hypothesis: rest_seconds is 0 or undefined on initial render causing zero-width fill
  evidence: useWorkoutState initializes rest_seconds with `te.default_rest_seconds || 90` (always positive). getTimerProps returns restSeconds correctly. percentage is hardcoded to 100 for inactive mode.
  timestamp: 2026-02-16

- hypothesis: Race condition where exercises array is empty when cards render
  evidence: workout.tsx gates rendering behind isInitializing spinner. Even though useWorkoutState useEffect has a one-frame delay, the exercises will always have valid rest_seconds when they appear.
  timestamp: 2026-02-16

- hypothesis: Bar fill width is 0 in INACTIVE state
  evidence: percentage is `100` when effectiveMode is not 'active' (line 69-71 of RestTimerBar). Width is `100%`.
  timestamp: 2026-02-16

## Evidence

- timestamp: 2026-02-16
  checked: RestTimerBar INACTIVE fill color
  found: fillColor = theme.colors.textMuted = '#71717a' (line 74-75)
  implication: Fill bar is medium gray, visible against track (#2a2a2a)

- timestamp: 2026-02-16
  checked: RestTimerBar INACTIVE time text color
  found: styles.timeText.color = theme.colors.textMuted = '#71717a' (line 265)
  implication: Text is SAME color as fill background, making text completely invisible

- timestamp: 2026-02-16
  checked: ACTIVE state time text color
  found: styles.timeTextActive overrides to theme.colors.textPrimary = '#ffffff' (line 268)
  implication: Active text is white, visible against accent fill. Inactive text has no such override.

- timestamp: 2026-02-16
  checked: Tests 3-7 passing
  found: Tests involve tapping (enters EDITING mode with textPrimary input) and active countdown (uses timeTextActive override)
  implication: The text is visible in EDITING and ACTIVE modes but NOT in INACTIVE mode, consistent with the color collision

## Resolution

root_cause: In RestTimerBar INACTIVE state, the time text color (textMuted #71717a) is identical to the fill bar color (textMuted #71717a), making the time text completely invisible against the fill. The bar renders with 100% fill but the overlaid time text blends into the fill perfectly. Users see a solid gray bar with no readable content and describe it as "empty/invisible."

fix: N/A (research only)
verification: N/A (research only)
files_changed: []
