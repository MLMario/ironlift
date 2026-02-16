---
status: diagnosed
trigger: "Investigate this UI bug in the IronLift workout app: When completing (checking done on) a set during a workout session, the delete trash icon becomes slightly visible in the background. It should remain completely hidden."
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:07:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Done state styling changes opacity/background that reveals underlying delete layer
test: reading WorkoutSetRow.tsx to understand swipe-to-delete implementation and done state styling
expecting: find opacity, z-index, or background color issue in done state
next_action: read WorkoutSetRow.tsx and WorkoutExerciseCard.tsx

## Symptoms

expected: When marking a set as "done" (checking the checkbox), the trash icon/delete area should remain completely hidden (only visible on swipe-left)
actual: When checking done on a set, the trash icon becomes slightly visible in the background without swiping
errors: None reported (visual UI bug)
reproduction: During workout session, check the done checkbox on a set row - trash icon becomes slightly visible
started: Unknown - newly reported issue

## Eliminated

## Evidence

- timestamp: 2026-02-13T00:05:00Z
  checked: WorkoutSetRow.tsx lines 183-266 (render structure)
  found: swipeContainer has overflow:hidden (line 278), deleteButtonBehind positioned absolute at right (lines 280-289), rowOuter animated with translateX and isDone opacity
  implication: The issue is in how the layers are structured and styled

- timestamp: 2026-02-13T00:06:00Z
  checked: WorkoutSetRow.tsx lines 299-304 (rowOuter and rowDone styles)
  found: rowOuter has backgroundColor: theme.colors.bgSurface, rowDone has opacity: 0.6
  implication: When isDone is true, the ENTIRE rowOuter (animated view containing the row content) becomes 60% opaque, making it semi-transparent and revealing the red delete button behind it

- timestamp: 2026-02-13T00:07:00Z
  checked: Layer structure in render (lines 184-266)
  found: Structure is: swipeContainer (overflow:hidden) -> deleteButtonBehind (absolute, behind) -> Animated.View rowOuter (with translateX) -> row content
  implication: The opacity:0.6 on rowOuter makes the entire foreground layer semi-transparent, allowing the red deleteButtonBehind layer to show through even when translateX is 0

## Resolution

root_cause: rowDone style applies opacity:0.6 to the entire Animated.View rowOuter, making it semi-transparent and revealing the red deleteButtonBehind layer underneath even when not swiped
fix: Move opacity from rowOuter to the row content only, or add a solid background color to rowOuter that prevents see-through
verification: Check a set as done - trash icon should remain completely hidden
files_changed: [src/components/WorkoutSetRow.tsx]
