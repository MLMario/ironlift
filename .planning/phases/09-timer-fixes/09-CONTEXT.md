# Phase 9: Timer Fixes - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Rest timer is visible and editable from the moment a workout starts. Users can see the current rest time, adjust it via +/-10s buttons, and tap the time display to edit directly via text input. All exercises show their rest timer bar immediately on workout load.

</domain>

<decisions>
## Implementation Decisions

### Dual-Mode Bar Design
- RestTimerBar has three visual states: INACTIVE, EDITING, ACTIVE
- INACTIVE: Full progress fill showing exercise's rest time (e.g., "1:30"), time text is tappable to enter edit mode
- EDITING: TextInput replaces the time display area, keyboard auto-focuses, +/-10s buttons remain visible and functional
- ACTIVE: Countdown with shrinking fill, time text is STILL tappable to enter edit mode (overrides original design)
- Tap target for entering edit mode is the time text in the center of the bar only, not the entire bar surface

### Edit Confirmation & Validation
- Tap outside the TextInput confirms the edit (blur = confirm). No Return/Done key handling
- Input accepts both plain seconds ("90") and MM:SS ("1:30") format
- Pre-fill displays current value in MM:SS format when entering edit mode
- Bounds: 10s minimum, 600s (10 minutes) maximum
- Parseable but out of range → clamp to bounds
- Unparseable input → revert to previous value
- +/-10s buttons respect the same 10s–600s bounds (clamp at edges)

### Time Change Persistence
- Rest time edits are session-scoped during the workout
- On workout **finish**: rest time changes auto-save silently to template (no confirmation prompt). Per-exercise — each exercise's changed rest time saves independently
- On workout **discard/cancel**: rest time changes are discarded, template unchanged
- Rest time save logic is **independent** from structural change logic (add/remove exercises/sets). Structural changes still trigger the existing "Update template?" confirmation modal. Both paths can fire on the same finish. They do not interact

### Timer Initial State
- Every exercise card shows its rest timer bar in INACTIVE state from the moment the workout loads (before any set completion)
- Exercises with rest_seconds = 0 show the bar displaying "0:00" — user can tap to set a time
- +/-10s adjustment buttons are functional immediately from workout start
- Timer counts down on the specific exercise card where the set was completed (current behavior preserved)
- After countdown completes, bar returns to INACTIVE state (full fill, showing rest time, tappable to edit)

### Edit-Mode Transitions
- Tapping time text during active countdown: timer pauses → edit mode opens with auto-focus
- On confirm (tap outside): bar resets to 100% fill and countdown restarts from the new edited value
- +/-10s buttons during edit mode: parse current TextInput value first, if parseable apply +/-10s with bounds checking, update TextInput display. If unparseable, buttons are no-ops
- Implementation note: parse/validate logic should be built first, then reused for button-in-edit-mode behavior

### Claude's Discretion
- TextInput styling within the bar (font size, cursor color, placeholder)
- Keyboard type selection (numeric-pad vs default)
- Animation transitions between INACTIVE/EDITING/ACTIVE states
- How "tap outside" dismissal is implemented (blur handler, overlay, etc.)

</decisions>

<specifics>
## Specific Ideas

- Design follows the Dual-Mode Bar pattern: progress bar and editable input share the same bar space, toggling between modes
- The existing `parseTimeInput` utility (accepts "90" or "1:30") from the template editor's RestTimerInline should be reused
- The existing `RestTimerBar` component is the modification target — not a new component

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-timer-fixes*
*Context gathered: 2026-02-16*
