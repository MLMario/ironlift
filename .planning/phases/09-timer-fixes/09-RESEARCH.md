# Phase 9: Timer Fixes - Research

**Researched:** 2026-02-16
**Domain:** React Native timer UI, TextInput inline editing, workout state management
**Confidence:** HIGH

## Summary

This phase modifies the existing `RestTimerBar` component to support three visual states (INACTIVE, EDITING, ACTIVE) and adds session-scoped rest time editing with auto-save on workout finish. The codebase is well-structured for these changes -- the existing `RestTimerBar`, `useRestTimer`, `useWorkoutState`, and `workout.tsx` provide clear modification points.

The core technical challenges are: (1) embedding a `TextInput` inside the progress bar's overlay layer with proper keyboard handling, (2) making the +/-10s buttons work when the timer is idle (currently they only work during active countdown), (3) adding a `pause` capability to the timer for mid-countdown editing, and (4) adding a silent rest-time-save path in the finish flow that is independent from the structural change modal.

**Primary recommendation:** Modify `RestTimerBar` to manage INACTIVE/EDITING/ACTIVE states internally, extract `parseTimeInput`/`formatTime` to a shared utility, add `updateRestSeconds` mutation to `useWorkoutState`, and add rest-time-save logic to `saveWorkoutAndCleanup` that runs silently alongside (but independently from) the structural change confirmation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- RestTimerBar has three visual states: INACTIVE, EDITING, ACTIVE
- INACTIVE: Full progress fill showing exercise's rest time (e.g., "1:30"), time text is tappable to enter edit mode
- EDITING: TextInput replaces the time display area, keyboard auto-focuses, +/-10s buttons remain visible and functional
- ACTIVE: Countdown with shrinking fill, time text is STILL tappable to enter edit mode (overrides original design)
- Tap target for entering edit mode is the time text in the center of the bar only, not the entire bar surface
- Tap outside the TextInput confirms the edit (blur = confirm). No Return/Done key handling
- Input accepts both plain seconds ("90") and MM:SS ("1:30") format
- Pre-fill displays current value in MM:SS format when entering edit mode
- Bounds: 10s minimum, 600s (10 minutes) maximum
- Parseable but out of range -> clamp to bounds
- Unparseable input -> revert to previous value
- +/-10s buttons respect the same 10s-600s bounds (clamp at edges)
- Rest time edits are session-scoped during the workout
- On workout finish: rest time changes auto-save silently to template (no confirmation prompt). Per-exercise -- each exercise's changed rest time saves independently
- On workout discard/cancel: rest time changes are discarded, template unchanged
- Rest time save logic is independent from structural change logic (add/remove exercises/sets). Structural changes still trigger the existing "Update template?" confirmation modal. Both paths can fire on the same finish. They do not interact
- Every exercise card shows its rest timer bar in INACTIVE state from the moment the workout loads (before any set completion)
- Exercises with rest_seconds = 0 show the bar displaying "0:00" -- user can tap to set a time
- +/-10s adjustment buttons are functional immediately from workout start
- Timer counts down on the specific exercise card where the set was completed (current behavior preserved)
- After countdown completes, bar returns to INACTIVE state (full fill, showing rest time, tappable to edit)
- Tapping time text during active countdown: timer pauses -> edit mode opens with auto-focus
- On confirm (tap outside): bar resets to 100% fill and countdown restarts from the new edited value
- +/-10s buttons during edit mode: parse current TextInput value first, if parseable apply +/-10s with bounds checking, update TextInput display. If unparseable, buttons are no-ops
- Implementation note: parse/validate logic should be built first, then reused for button-in-edit-mode behavior

### Claude's Discretion
- TextInput styling within the bar (font size, cursor color, placeholder)
- Keyboard type selection (numeric-pad vs default)
- Animation transitions between INACTIVE/EDITING/ACTIVE states
- How "tap outside" dismissal is implemented (blur handler, overlay, etc.)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

No new libraries needed. This phase uses only existing project dependencies.

### Core (Already Installed)
| Library | Purpose | How Used |
|---------|---------|----------|
| `react-native` (TextInput, Pressable, View) | Inline editing within bar | TextInput replaces Text in EDITING state |
| `react-native` (Keyboard) | Dismiss keyboard on demand | Already used in workout.tsx |
| `react-native` (StyleSheet) | All styling | getStyles(theme) pattern |

### No New Dependencies
This phase requires zero new packages. All functionality is achievable with React Native core components (`TextInput`, `Pressable`, `View`, `Text`, `Keyboard`).

## Architecture Patterns

### Existing Code Structure (Modification Targets)

```
src/
  components/
    RestTimerBar.tsx        # PRIMARY: Add INACTIVE/EDITING/ACTIVE states + TextInput
    WorkoutExerciseCard.tsx  # Wire new props (onRestTimeChange, onTimerPause)
    RestTimerInline.tsx      # SOURCE: Extract parseTimeInput/formatTime to shared util
  hooks/
    useRestTimer.ts          # Add pause() method, fix idle adjust
    useWorkoutState.ts       # Add updateRestSeconds mutation
  lib/
    timeUtils.ts             # NEW: Shared parse/format/clamp utilities
app/
  workout.tsx                # Wire rest time changes, add silent save on finish
```

### Pattern 1: Three-State Bar Component
**What:** RestTimerBar manages INACTIVE/EDITING/ACTIVE states internally with a local `mode` state variable. The parent provides the timer data and callbacks; the bar manages its own editing state.
**When to use:** This keeps the editing concern inside the bar component rather than lifting it to WorkoutExerciseCard.

```typescript
type BarMode = 'inactive' | 'editing' | 'active';

// The bar determines its mode:
// - 'active' when isActive prop is true AND mode !== 'editing'
// - 'editing' when user tapped the time text (local state)
// - 'inactive' otherwise
```

### Pattern 2: Shared Time Parse/Format Utilities
**What:** Extract `parseTimeInput` and `formatTime` from `RestTimerInline.tsx` into `src/lib/timeUtils.ts`. Add `clampSeconds(seconds, min, max)` for bounds enforcement.
**Why:** Both `RestTimerInline` (template editor) and `RestTimerBar` (workout) need identical parse/format logic. The CONTEXT.md decision explicitly says to reuse this.

```typescript
// src/lib/timeUtils.ts
export function formatTime(seconds: number): string { ... }
export function parseTimeInput(input: string): number | null { ... }
export function clampSeconds(seconds: number, min: number, max: number): number { ... }

// Note: parseTimeInput should return null for unparseable input
// (different from RestTimerInline's version which returns 0)
// This allows the caller to distinguish "parsed to 0" vs "unparseable"
```

### Pattern 3: Session-Scoped Rest Time with Dirty Tracking
**What:** `useWorkoutState` gets a new `updateRestSeconds(exerciseIndex, seconds)` mutation and a `getRestTimeChanges()` function that compares current rest_seconds against original template snapshot.
**Why:** On finish, the system needs to know which exercises had their rest time changed to save only those changes silently.

### Pattern 4: Independent Save Paths on Finish
**What:** The finish flow has TWO independent save operations:
1. **Structural changes** (existing): triggers "Update template?" confirmation modal
2. **Rest time changes** (new): runs silently, no confirmation, uses `updateTemplateExercise` per exercise

Both can fire on the same finish. They do not interact or block each other.

```typescript
// In saveWorkoutAndCleanup:
// 1. Save rest time changes silently (always, no prompt)
await saveRestTimeChanges(); // best-effort, no throw

// 2. Save structural changes (existing flow, with modal)
if (shouldUpdateTemplate) { ... } // existing code
```

### Pattern 5: Pause-Edit-Restart Timer Flow
**What:** `useRestTimer` needs a `pause()` method that stops the interval and remembers remaining time, then a modified `start()` that can accept a new duration for restart.
**When to use:** When user taps time text during active countdown.

```typescript
// Current flow: active -> edit mode tapped -> pause timer
// On blur/confirm: restart timer from new value (or old if unparseable)
// Key: the bar resets to 100% fill and countdown restarts from the NEW value
```

### Anti-Patterns to Avoid
- **Lifting editing state to workout.tsx:** The editing concern belongs inside RestTimerBar. Don't add editing state to the parent.
- **Modifying useRestTimer.adjust for idle state:** The `adjust` function is for mid-countdown adjustment. Idle +/-10s should update `rest_seconds` in workout state directly, not touch the timer.
- **Using the full updateTemplate for rest time saves:** Use `updateTemplateExercise` (per-exercise update) instead. It's lighter and already exists in the service.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time parsing (MM:SS and plain seconds) | New parser in RestTimerBar | Extract existing `parseTimeInput` from RestTimerInline | Proven logic, identical requirements |
| Time formatting (seconds to M:SS) | New formatter | Extract existing `formatTime` from RestTimerInline | Same format needed in both places |
| Per-exercise template update | New Supabase query | Existing `templates.updateTemplateExercise()` | Already handles default_rest_seconds updates |
| Keyboard dismissal on tap-outside | Complex overlay/gesture system | TextInput's native `onBlur` event | `keyboardShouldPersistTaps="handled"` in parent ScrollView already enables this pattern |

## Common Pitfalls

### Pitfall 1: +/-10s Buttons Don't Work When Timer Is Idle
**What goes wrong:** Currently, `handleAdjustTimer` in `workout.tsx` calls `adjustTimer(delta)` which calls `useRestTimer.adjust()`. But `adjust()` checks `timerParamsRef.current` and returns early if null (timer idle). So the buttons are completely non-functional before a set is completed.
**Why it happens:** The original design assumed buttons only exist during countdown.
**How to avoid:** When timer is idle, +/-10s should update `exercise.rest_seconds` in `useWorkoutState` directly (via new `updateRestSeconds` mutation). When timer is active, it should continue to call `adjustTimer` AND also update `rest_seconds` in workout state so the new value persists for future sets.

### Pitfall 2: RestTimerBar Is Inside Collapsed Card
**What goes wrong:** In `WorkoutExerciseCard.tsx`, the `RestTimerBar` is rendered inside `{isExpanded && (...)}`. If the card is collapsed, the bar is not visible. The requirement says "Every exercise card shows its rest timer bar in INACTIVE state from the moment the workout loads."
**Why it happens:** Default `isExpanded` state is `false` (line 90). The bar is only rendered when expanded.
**How to avoid:** Either: (a) change default `isExpanded` to `true`, OR (b) move RestTimerBar outside the `{isExpanded && (...)}` block so it's always visible. Option (a) matches the existing decision from [05-04]: "All exercise cards default to expanded (user controls collapse, matching web)." The current code has `useState(false)` which contradicts this decision -- likely a bug. Fix to `useState(true)`.

### Pitfall 3: TextInput Focus Steals Scroll Position
**What goes wrong:** When a TextInput auto-focuses and the keyboard appears, the ScrollView may jump to an unexpected position, especially for exercises near the bottom.
**Why it happens:** `KeyboardAvoidingView` with `behavior="padding"` adjusts the layout, and the ScrollView tries to keep the focused input visible.
**How to avoid:** This is actually desired behavior. The `keyboardShouldPersistTaps="handled"` on the ScrollView already ensures proper interaction. No special handling needed, but test with exercises at different scroll positions.

### Pitfall 4: Blur Event Fires Before +/-10s Button Press Registers
**What goes wrong:** If user is in EDITING mode and taps a +/-10s button, the TextInput's `onBlur` fires FIRST (confirming the edit and exiting edit mode), and the button press may not register because the view re-renders.
**Why it happens:** React Native event ordering -- blur fires before the press event on the adjacent button.
**How to avoid:** Use `keyboardShouldPersistTaps="handled"` on any parent ScrollView (already present), and ensure the +/-10s buttons use `onPressIn` or similar. Alternatively, add a small delay before transitioning from EDITING to INACTIVE mode on blur, allowing the button press to register first. The CONTEXT.md decision says buttons should parse the current TextInput value during edit mode, which means they should work WITHOUT exiting edit mode. This means: buttons should NOT trigger blur. The TextInput should only blur when user taps OUTSIDE the entire bar area (not on the buttons). **Solution:** Use `onBlur` for the TextInput, but the +/-10s buttons should call `event.preventDefault()` to prevent stealing focus, or better yet, the buttons should read from the TextInput's current value via a ref and update it without causing blur.

### Pitfall 5: Rest Time Save Conflicts with Structural Template Update
**What goes wrong:** If both rest time changes AND structural changes exist, and the user chooses "Yes, Update" on the structural change modal, the `updateTemplate()` call replaces ALL template exercises with current workout data. This already includes `rest_seconds` in the exercise data. If the silent rest-time save runs first and then the structural update runs, the structural update will include the new rest times anyway.
**Why it happens:** `updateTemplate` does a delete-all-then-reinsert of template exercises, which already uses `ex.rest_seconds` as `default_rest_seconds`.
**How to avoid:** Only run the per-exercise rest-time save when there are NO structural changes, or when the user declines the structural update ("No, Keep Original"). If the user accepts the structural update, the rest times are already included in the structural save payload. Check `hasTemplateChanges()` and the user's structural update decision to determine whether a separate rest-time save is needed.

### Pitfall 6: parseTimeInput Returns 0 for Empty/Invalid Input
**What goes wrong:** The existing `parseTimeInput` in `RestTimerInline` returns `0` for empty strings. But the CONTEXT.md decision says: "Unparseable input -> revert to previous value." If the user clears the TextInput and blurs, the timer would be set to 0 seconds.
**Why it happens:** `parseTimeInput` was designed for the template editor where 0 is a valid rest time.
**How to avoid:** The extracted `parseTimeInput` should be enhanced to return `null` for unparseable input (not 0), distinguishing "parsed as zero" from "couldn't parse." The caller can then decide: null = revert, number = clamp to bounds. For the specific case of empty string, that's arguably unparseable (revert). For "0" typed explicitly, that would parse to 0 which is below the 10s minimum, so it would clamp to 10s.

## Code Examples

### Example 1: RestTimerBar State Management (INACTIVE/EDITING/ACTIVE)
```typescript
// Source: Derived from existing RestTimerBar + RestTimerInline patterns

interface RestTimerBarProps {
  remainingSeconds: number;
  totalSeconds: number;
  isActive: boolean;
  restSeconds: number;           // NEW: exercise's configured rest time
  onAdjust: (delta: number) => void;
  onRestTimeChange: (seconds: number) => void;  // NEW: update rest_seconds
  onTimerPause: () => void;      // NEW: pause active timer for editing
  onTimerRestart: (seconds: number) => void;  // NEW: restart timer from new value
}

export function RestTimerBar({ ... }: RestTimerBarProps) {
  const [mode, setMode] = useState<'inactive' | 'editing'>('inactive');
  const [editText, setEditText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Determine effective display mode
  const effectiveMode = mode === 'editing' ? 'editing' :
                        isActive ? 'active' : 'inactive';

  const handleTimeTextPress = () => {
    if (isActive) {
      onTimerPause(); // Pause countdown
    }
    setEditText(formatTime(restSeconds));
    setMode('editing');
    // Auto-focus handled by autoFocus prop or ref.focus()
  };

  const handleBlur = () => {
    const parsed = parseTimeInput(editText);
    if (parsed !== null) {
      const clamped = clampSeconds(parsed, 10, 600);
      onRestTimeChange(clamped);
      if (isActive) {
        onTimerRestart(clamped); // Restart countdown from new value
      }
    }
    // If null (unparseable), don't change anything -- revert
    setMode('inactive');
  };

  // +/-10s button handler during editing
  const handleAdjustInEditMode = (delta: number) => {
    const current = parseTimeInput(editText);
    if (current === null) return; // no-op for unparseable
    const newVal = clampSeconds(current + delta, 10, 600);
    setEditText(formatTime(newVal));
  };

  // +/-10s button handler during inactive/active
  const handleAdjustNormal = (delta: number) => {
    if (isActive) {
      onAdjust(delta); // Existing timer adjust
    }
    const newVal = clampSeconds(restSeconds + delta, 10, 600);
    onRestTimeChange(newVal);
  };
}
```

### Example 2: TextInput Inside Progress Bar Overlay
```typescript
// Source: Adapted from existing RestTimerBar timeOverlay pattern

// In the render, the timeOverlay area conditionally shows Text or TextInput:
<View style={styles.timeOverlay}>
  {effectiveMode === 'editing' ? (
    <TextInput
      ref={inputRef}
      style={styles.editInput}
      value={editText}
      onChangeText={setEditText}
      onBlur={handleBlur}
      autoFocus
      keyboardType="numbers-and-punctuation"
      selectTextOnFocus
      textAlign="center"
      cursorColor={theme.colors.accent}
    />
  ) : (
    <Pressable onPress={handleTimeTextPress} hitSlop={8}>
      <Text style={[styles.timeText, isActive && styles.timeTextActive]}>
        {displayTime}
      </Text>
    </Pressable>
  )}
</View>
```

### Example 3: updateRestSeconds Mutation in useWorkoutState
```typescript
// Source: Pattern from existing updateSetWeight/updateSetReps

const updateRestSeconds = useCallback(
  (exerciseIndex: number, seconds: number): void => {
    setActiveWorkout((prev) => {
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIndex] };
      exercise.rest_seconds = seconds;
      exercises[exerciseIndex] = exercise;
      return { ...prev, exercises };
    });
  },
  []
);
```

### Example 4: Silent Rest Time Save on Finish
```typescript
// Source: Pattern from existing saveWorkoutAndCleanup + updateTemplateExercise

async function saveRestTimeChanges(
  activeWorkout: ActiveWorkout,
  originalSnapshot: TemplateSnapshot | null,
  templateId: string
): Promise<void> {
  if (!originalSnapshot || !templateId) return;

  // Compare each exercise's rest_seconds against original template
  // Note: originalSnapshot does NOT track rest_seconds currently
  // Need to extend snapshot or use a separate tracking mechanism
  for (const exercise of activeWorkout.exercises) {
    // Find original exercise to compare
    const original = originalSnapshot.exercises.find(
      e => e.exercise_id === exercise.exercise_id
    );
    // If exercise was added during workout, skip (no original rest time to compare)
    if (!original) continue;
    // TODO: Need original rest_seconds in snapshot for comparison
    // Save via existing service:
    try {
      await templatesService.updateTemplateExercise(
        templateId,
        exercise.exercise_id,
        { default_rest_seconds: exercise.rest_seconds }
      );
    } catch {
      // Best-effort, skip on failure
    }
  }
}
```

### Example 5: useRestTimer Pause/Restart
```typescript
// Source: Extends existing useRestTimer hook

const pause = useCallback(async (): Promise<number> => {
  // Returns remaining seconds when paused
  const params = timerParamsRef.current;
  if (!params) return 0;

  const elapsed = Math.floor((Date.now() - params.startedAt) / 1000);
  const remaining = Math.max(0, params.duration - elapsed);

  clearTimer();
  await cancelNotification();
  // Don't reset state to idle -- caller manages the transition
  return remaining;
}, [clearTimer, cancelNotification]);
```

## State of the Art

| Old Approach (Current Code) | New Approach (This Phase) | Impact |
|---|---|---|
| RestTimerBar: display-only, no editing | RestTimerBar: three-state with inline TextInput | Core change |
| +/-10s only works during active countdown | +/-10s works in all states (idle, active, editing) | UX fix |
| Timer bar hidden until card expanded | Timer bar always visible (fix isExpanded default) | Visibility |
| No pause capability in useRestTimer | Pause + restart for mid-edit flow | New capability |
| Rest time changes lost on finish | Rest time changes auto-saved per-exercise on finish | Persistence |
| parseTimeInput local to RestTimerInline | Shared utility in src/lib/timeUtils.ts | Code reuse |

## Open Questions

1. **Original rest_seconds not tracked in TemplateSnapshot**
   - What we know: `TemplateSnapshot` currently only tracks `exercise_id` and `sets` (set_number, weight, reps). It does NOT track `rest_seconds`.
   - What's unclear: To detect rest time changes on finish, we need to know the original rest time per exercise. Options: (a) extend `TemplateSnapshot` to include `rest_seconds`, (b) create a separate `originalRestTimes` map alongside the snapshot, or (c) always save all rest times on finish regardless of whether they changed.
   - Recommendation: Option (a) is cleanest -- add `rest_seconds: number` to the snapshot's exercise objects. This is backward-compatible with existing backups (restored backups without `rest_seconds` would just not save rest times, which is acceptable).

2. **isExpanded default value contradiction**
   - What we know: Decision [05-04] says "All exercise cards default to expanded." But `WorkoutExerciseCard.tsx` line 90 has `useState(false)`.
   - What's unclear: Whether this is an intentional deviation or a bug.
   - Recommendation: Change to `useState(true)` as part of this phase since the RestTimerBar needs to be visible from workout start. This aligns with the original decision.

3. **Blur vs Button Press Race Condition**
   - What we know: When TextInput is focused and user taps a +/-10s button, the blur event fires before the press. With `keyboardShouldPersistTaps="handled"`, the press should still register after blur.
   - What's unclear: Whether the re-render from mode change (editing -> inactive) will unmount the buttons before press registers.
   - Recommendation: Test on device. If race condition occurs, use a ref-based approach where buttons read the current input value without causing a mode transition, or add a small `requestAnimationFrame` delay before transitioning out of editing mode on blur.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/components/RestTimerBar.tsx`, `src/components/RestTimerInline.tsx`, `src/hooks/useRestTimer.ts`, `src/hooks/useWorkoutState.ts`, `app/workout.tsx`, `src/services/templates.ts`, `src/types/services.ts`, `src/hooks/useWorkoutBackup.ts`, `src/components/WorkoutExerciseCard.tsx`, `src/theme/tokens.ts`
- [React Native TextInput docs](https://reactnative.dev/docs/textinput) -- onBlur, autoFocus, keyboardType, selectTextOnFocus
- [Expo keyboard handling guide](https://docs.expo.dev/guides/keyboard-handling/) -- KeyboardAvoidingView patterns

### Secondary (MEDIUM confidence)
- Web search on TextInput blur behavior with keyboardShouldPersistTaps -- confirms blur fires before adjacent button press in standard case

### Tertiary (LOW confidence)
- Blur-vs-press race condition behavior: needs on-device testing to confirm

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all React Native core
- Architecture: HIGH -- clear modification points in existing codebase, established patterns
- Pitfalls: HIGH -- identified from direct code analysis of current behavior gaps
- Blur/press race condition: MEDIUM -- well-known RN behavior but needs device testing

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable domain, no moving targets)
