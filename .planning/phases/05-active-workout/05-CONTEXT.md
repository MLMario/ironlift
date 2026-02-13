# Phase 5: Active Workout - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Core workout loop: start a workout from a template, log sets with weight/reps, use a rest timer with local notifications, finish and save to database. Includes fully offline support (cached templates, write queue for saves) and crash recovery (resume in-progress workout after app kill). This is the product's centerpiece.

Excludes: workout history browsing (Phase 7), charts/analytics (Phase 6), settings (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Workout Screen Presentation
- Stack push from dashboard (slides from right), swipe-back gesture **disabled** during active workout
- iOS navigation bar style header: Cancel as back button (left), template name as title (center), Finish as right button
- Exercises displayed as vertical scrolling list below header, "Add Exercise" button at bottom

### Exercise Card Layout
- **Collapsible accordion cards** (same as web) — tap header to expand/collapse
- Each collapsed header shows: **progress ring** (circular SVG, completed/total sets) + exercise name + chevron
- Expanded card shows: set table, rest timer bar, "Add Set" button, "Remove Exercise" button
- No auto-expand/auto-collapse behavior — user controls which cards are open

### Set Row Layout
- **4-column grid** matching web: set number badge, weight input, reps input, done checkbox
- Match web layout proportions — Claude ensures 44px minimum tap targets per iOS convention
- Column headers visible (# / lbs / Reps / checkmark)
- Done state: 60% opacity, green set number badge (same as web)
- New set defaults: copy weight/reps from last set in exercise (same as web)

### Swipe-to-Delete
- **Sets only** — swipe left to reveal delete button (rebuilt with `react-native-gesture-handler`)
- Exercises use "Remove Exercise" button in card footer (not swipeable)
- One row revealed at a time — opening another row closes the previous
- Rubberband resistance and snap threshold mechanics (same feel as web)

### Rest Timer
- **Inline horizontal bar** per exercise (same as web): [-10s] progress bar [MM:SS] [+10s]
- Timer triggers when checking a set as done (unchecked -> checked)
- Uses exercise's `rest_seconds` value
- **Single timer** — starting a new timer replaces the previous one
- +/-10s adjustment buttons (same as web)
- **No auto-scroll** when timer starts — user already knows timer fires on set completion
- **No floating indicator** — timer only visible inside its exercise card (inline only)

### Rest Timer Feedback
- **Foreground completion:** haptic feedback (medium impact) + short alert sound
- **Background completion:** local notification via `expo-notifications` (scheduled at timer start, cancelled if invalidated)
- Cancellation: any action that invalidates the rest timer (early end, skip, finish workout, new timer) cancels the scheduled notification

### Finish Flow
- Tap Finish -> validate at least 1 exercise exists
- **Modal 1:** "Finish Workout? Save this workout and end your session?" (Confirm / Cancel)
- Template change detection: structural only (exercise count, set count changes — not weight/reps)
- **Modal 2 (conditional):** "Update Template?" with "Yes, Update" / "No, Keep Original" — only shown when structural changes detected. Cannot be dismissed by tapping overlay.
- After save: **navigate straight to dashboard** (no summary screen)

### Cancel Flow
- Tap Cancel -> confirmation modal: "Cancel Workout? All progress will be lost."
- If confirmed: stop timer, clear AsyncStorage backup, navigate to dashboard
- **Discard all** — no "save as incomplete" option (same as web)

### Offline Support
- Workout starts from cached templates (already in AsyncStorage from Phase 4)
- Completed workout saved to AsyncStorage write queue with idempotency key
- Write queue syncs to Supabase when connectivity returns
- **Silent save** — no visible indicator for offline/pending sync status
- Template editing during workout is local state only — sync handled by template update prompt on finish

### Crash Recovery
- Workout state auto-saved to AsyncStorage keyed by `activeWorkout_{userId}`
- **Save trigger: on complete set action only** (checkbox toggled done) — not on every weight/reps keystroke
- Also saves on: exercise add/remove, set add/remove
- On app launch with saved workout: **modal overlay on dashboard** asking to resume
- Resume modal shows: **template name + time since start** (e.g., "Chest Day -- started 45 min ago")
- Two actions: Resume (navigates to workout screen with restored state) / Discard (removes saved data immediately, **no confirmation**)

### Adding/Removing Mid-Workout
- "Add Exercise" button at bottom of exercise list opens ExercisePickerModal (Phase 3 component)
- New exercise added with 3 default sets (matching web behavior)
- "Add Set" button per exercise appends a set with last set's values
- "Remove Exercise" button in card footer with confirmation
- Exercise order preserved as added

### Logging Service
- Port `logging.ts` from web — swap Supabase client import, add write queue integration
- 3-table schema: `workout_logs` -> `workout_log_exercises` -> `workout_log_sets`
- Rollback entire workout if any exercise insert fails
- Add idempotency key to workout log for offline write queue deduplication

### Claude's Discretion
- Exact progress ring SVG dimensions and styling for mobile
- Rest timer bar height and visual proportions
- Haptic feedback pattern (which `expo-haptics` impact style)
- Alert sound choice for timer completion
- AsyncStorage key naming for write queue entries
- Write queue sync retry strategy and backoff
- Exact confirmation modal styling (adapting web ConfirmationModal to iOS)
- Whether to add exercise-level reordering mid-workout (web doesn't have it)

</decisions>

<specifics>
## Specific Ideas

- Web app is the canonical visual reference — match its exercise card layout, set row grid, rest timer bar, and confirmation modals as closely as native platform allows
- iOS nav bar header instead of web's custom header bar — Cancel (back button), template name (title), Finish (right button)
- Progress ring on collapsed exercise cards is important — gives at-a-glance workout progress
- Timer should feel responsive in the gym — haptic + sound on completion ensures user notices even when phone is on a bench
- Crash recovery saves only on meaningful actions (set completion, structural changes) — not on every keystroke — to avoid excessive AsyncStorage writes

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 05-active-workout*
*Context gathered: 2026-02-13*
